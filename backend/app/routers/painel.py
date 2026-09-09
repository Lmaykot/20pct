"""Agregados de leitura para o painel, a lista de contratos e a inadimplência.

Nada aqui é persistido: tudo é derivado de contratos, honorários e
parcelas na hora da consulta.
"""

from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends

from app.database import Database
from app.dependencies import get_db
from app.models import (
    AgingFaixa, ContratoResumo, InadimplenciaResponse, InadimplenteAgrupado,
    PagamentosResponse, PainelContagens, PainelKpi, PainelParcela, PainelPendencia,
    PainelResponse, PosicaoCliente,
)
from app.valores import dias_de_atraso, formatar_brl, parse_data, parse_valor

router = APIRouter(prefix="/api/painel", tags=["painel"])

MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
         'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

TIPO_CURTO = {
    'inicial': 'Iniciais',
    'condicionado': 'Condicionados',
    'intermediario': 'Intermediários',
    'exito': 'Êxito',
    'mensais': 'Mensais',
    'hora': 'Hora trabalhada',
}

# Faixas de aging do design, com a cor de cada filete.
FAIXAS = [
    ('1 a 15 dias', 1, 15, '#a98b58'),
    ('16 a 30 dias', 16, 30, '#b07a52'),
    ('31 a 60 dias', 31, 60, '#a1604c'),
    ('Acima de 60 dias', 61, 10 ** 6, 'var(--red)'),
]


def _pago(row) -> bool:
    return bool((row['data_pagamento'] or '').strip())


def _br(d) -> str:
    return d.strftime('%d/%m') if d else '—'


def _plural(n: int, singular: str, plural: str) -> str:
    return f'{n} {singular if n == 1 else plural}'


@router.get("", response_model=PainelResponse)
def get_painel(db: Database = Depends(get_db)):
    hoje = date.today()
    limite30 = hoje + timedelta(days=30)
    parcelas = db.get_parcelas_detalhadas()
    honorarios = db.get_honorarios_detalhados()

    abertas, pagas_no_mes, atrasadas, proximas = [], [], [], []
    for p in parcelas:
        venc = parse_data(p['vencimento'])
        if _pago(p):
            quitacao = parse_data(p['data_pagamento'])
            if quitacao and quitacao.year == hoje.year and quitacao.month == hoje.month:
                pagas_no_mes.append(p)
            continue
        abertas.append(p)
        if venc and venc < hoje:
            atrasadas.append(p)
        elif venc and venc <= limite30:
            proximas.append(p)

    # --- KPIs ---
    total_30 = sum(parse_valor(p['valor']) for p in proximas)
    contratos_30 = len({p['contrato_id'] for p in proximas})
    total_mes = sum(parse_valor(p['valor']) for p in pagas_no_mes)
    total_atraso = sum(parse_valor(p['valor']) for p in atrasadas)
    clientes_atraso = len({p['cliente_id'] for p in atrasadas})
    maior_atraso = max((dias_de_atraso(p['vencimento'], hoje) for p in atrasadas), default=0)

    exito = [h for h in honorarios
             if h['tipo'] == 'exito' and h['contrato_status'] != 'Encerrado']
    total_exito = sum(parse_valor(h['valor']) for h in exito)

    kpis = [
        PainelKpi(
            label='A receber · 30 dias',
            valor=formatar_brl(total_30),
            hint=f'{_plural(len(proximas), "parcela", "parcelas")} em '
                 f'{_plural(contratos_30, "contrato", "contratos")}',
        ),
        PainelKpi(
            label=f'Recebido em {MESES[hoje.month - 1]}',
            valor=formatar_brl(total_mes),
            hint=_plural(len(pagas_no_mes), 'baixa registrada', 'baixas registradas'),
        ),
        PainelKpi(
            label='Em atraso',
            valor=formatar_brl(total_atraso),
            hint=(f'{_plural(clientes_atraso, "cliente", "clientes")} · '
                  f'maior atraso {maior_atraso} dias') if atrasadas else 'Nenhuma parcela vencida',
        ),
        PainelKpi(
            label='Êxito provisionado',
            valor=formatar_brl(total_exito),
            hint=f'{_plural(len(exito), "hipótese aguardando", "hipóteses aguardando")} decisão',
        ),
    ]

    # --- Agenda: os próximos 30 dias; sem nada na janela, o que vier depois ---
    janela = sorted(proximas, key=lambda p: p['vencimento'] or '')
    if not janela:
        janela = sorted(
            [p for p in abertas if (parse_data(p['vencimento']) or hoje) >= hoje],
            key=lambda p: p['vencimento'] or '')
    agenda = [_para_painel_parcela(p, hoje) for p in janela[:5]]

    # --- Exige atenção ---
    pendencias: list[PainelPendencia] = []
    for p in sorted(atrasadas, key=lambda r: dias_de_atraso(r['vencimento'], hoje), reverse=True)[:2]:
        dias = dias_de_atraso(p['vencimento'], hoje)
        pendencias.append(PainelPendencia(
            titulo=f'{p["cliente_nome"]} · parcela {_rotulo_parcela(p)} vencida',
            detalhe=f'{formatar_brl(parse_valor(p["valor"]))} · {dias} dias de atraso · {p["ctt_n"]}',
            tom='red',
        ))

    for p in sorted([p for p in proximas
                     if (parse_data(p['vencimento']) - hoje).days <= 7],
                    key=lambda r: r['vencimento'] or '')[:2]:
        dias = (parse_data(p['vencimento']) - hoje).days
        pendencias.append(PainelPendencia(
            titulo=f'{p["cliente_nome"]} vence em {dias} dias',
            detalhe=f'{p["ctt_n"]} · {p["hipotese"] or TIPO_CURTO.get(p["tipo"], p["tipo"])} · '
                    f'{formatar_brl(parse_valor(p["valor"]))}',
            tom='amb',
        ))

    sem_parcelamento = [h for h in honorarios
                        if h['total_parcelas'] == 0
                        and h['contrato_status'] == 'Ativo'
                        and parse_valor(h['valor']) > 0]
    for h in sem_parcelamento[:2]:
        pendencias.append(PainelPendencia(
            titulo=f'{h["hipotese"] or TIPO_CURTO.get(h["tipo"], h["tipo"])} sem parcelamento',
            detalhe=f'{h["ctt_n"]} · {h["cliente_nome"]} · '
                    f'{formatar_brl(parse_valor(h["valor"]))} ainda não programados',
            tom='acc',
        ))

    status_counts = {r['status']: r['n'] for r in db.count_contratos_por_status()}
    contagens = PainelContagens(
        contratos=sum(status_counts.values()),
        contratos_ativos=status_counts.get('Ativo', 0),
        clientes=db.count_clientes(),
        parcelas_abertas=len(abertas),
        inadimplentes=clientes_atraso,
    )

    return PainelResponse(
        kpis=kpis,
        agenda=agenda,
        pendencias=pendencias[:5],
        contagens=contagens,
        competencia=f'{MESES[hoje.month - 1].capitalize()} de {hoje.year}',
    )


@router.get("/parcelas", response_model=PagamentosResponse)
def get_pagamentos(db: Database = Depends(get_db)):
    """Agenda da tela de Pagamentos: tudo em aberto, mais o que foi
    baixado hoje — para a linha não sumir logo após a baixa."""
    hoje = date.today()
    fim_semana = hoje + timedelta(days=7)
    fim_trimestre = hoje + timedelta(days=90)

    todas = db.get_parcelas_detalhadas()
    abertas = [p for p in todas if not _pago(p)]
    baixadas_hoje = [p for p in todas
                     if _pago(p) and parse_data(p['data_pagamento']) == hoje]

    na_semana = [p for p in abertas
                 if (parse_data(p['vencimento']) or fim_trimestre) <= fim_semana
                 and (parse_data(p['vencimento']) or hoje) >= hoje]
    atrasadas = [p for p in abertas
                 if (parse_data(p['vencimento']) or hoje) < hoje]
    no_trimestre = [p for p in abertas
                    if hoje <= (parse_data(p['vencimento']) or fim_trimestre) <= fim_trimestre]

    kpis = [
        PainelKpi(label='Vencendo esta semana',
                  valor=formatar_brl(sum(parse_valor(p['valor']) for p in na_semana)),
                  hint=_plural(len(na_semana), 'parcela', 'parcelas')),
        PainelKpi(label='Em atraso',
                  valor=formatar_brl(sum(parse_valor(p['valor']) for p in atrasadas)),
                  hint=_plural(len(atrasadas), 'parcela', 'parcelas')),
        PainelKpi(label='Programado no trimestre',
                  valor=formatar_brl(sum(parse_valor(p['valor']) for p in no_trimestre)),
                  hint=_plural(len(no_trimestre), 'parcela', 'parcelas')),
    ]

    visiveis = sorted(abertas + baixadas_hoje, key=lambda p: p['vencimento'] or '')
    return PagamentosResponse(
        kpis=kpis,
        parcelas=[_para_painel_parcela(p, hoje) for p in visiveis],
    )


@router.get("/contratos", response_model=list[ContratoResumo])
def get_contratos_resumo(db: Database = Depends(get_db)):
    """Lista de contratos já com honorários somados e o quanto entrou."""
    contratado: dict[int, float] = defaultdict(float)
    for h in db.get_honorarios_detalhados():
        contratado[h['contrato_id']] += parse_valor(h['valor'])

    recebido: dict[int, float] = defaultdict(float)
    for p in db.get_parcelas_detalhadas():
        if _pago(p):
            recebido[p['contrato_id']] += parse_valor(p['valor'])

    resumo = []
    for c in db.search_contratos_by_cliente_nome(''):
        total = contratado.get(c['id'], 0.0)
        pago = recebido.get(c['id'], 0.0)
        pct = min(100.0, round(pago / total * 100, 1)) if total > 0 else 0.0
        resumo.append(ContratoResumo(
            id=c['id'],
            ctt_n=c['ctt_n'],
            cliente_nome=c['cliente_nome'],
            tipo=c['tipo'] or '',
            advogado=c['advogado'] or '',
            status=c['status'] or 'Ativo',
            total_honorarios=formatar_brl(total),
            recebido=formatar_brl(pago),
            pct_recebido=pct,
        ))
    return resumo


@router.get("/cliente/{cliente_id}", response_model=PosicaoCliente)
def get_posicao_cliente(cliente_id: int, db: Database = Depends(get_db)):
    """O quadro lateral da ficha do cliente: quanto foi contratado,
    quanto entrou e o que está vencido."""
    hoje = date.today()

    honorarios = [h for h in db.get_honorarios_detalhados()
                  if h['cliente_id'] == cliente_id]
    parcelas = [p for p in db.get_parcelas_detalhadas()
                if p['cliente_id'] == cliente_id]

    contratado = sum(parse_valor(h['valor']) for h in honorarios)
    recebido = sum(parse_valor(p['valor']) for p in parcelas if _pago(p))
    atrasadas = [p for p in parcelas
                 if not _pago(p) and (parse_data(p['vencimento']) or hoje) < hoje]

    contratos = {h['contrato_id']: h['contrato_status'] for h in honorarios}
    for p in parcelas:
        contratos.setdefault(p['contrato_id'], p['contrato_status'])

    return PosicaoCliente(
        contratos_ativos=sum(1 for s in contratos.values() if s == 'Ativo'),
        contratos_total=len(contratos),
        contratado=formatar_brl(contratado),
        recebido=formatar_brl(recebido),
        aberto=formatar_brl(contratado - recebido),
        atrasos=(formatar_brl(sum(parse_valor(p['valor']) for p in atrasadas))
                 if atrasadas else 'Nenhum'),
    )


@router.get("/inadimplencia", response_model=InadimplenciaResponse)
def get_inadimplencia(db: Database = Depends(get_db)):
    """Aging por faixa e uma linha por contrato em atraso."""
    hoje = date.today()
    atrasadas = [p for p in db.get_parcelas_detalhadas()
                 if not _pago(p)
                 and (parse_data(p['vencimento']) or hoje) < hoje]

    aging = []
    for rotulo, minimo, maximo, cor in FAIXAS:
        na_faixa = [p for p in atrasadas
                    if minimo <= dias_de_atraso(p['vencimento'], hoje) <= maximo]
        clientes = len({p['cliente_id'] for p in na_faixa})
        aging.append(AgingFaixa(
            faixa=rotulo,
            valor=formatar_brl(sum(parse_valor(p['valor']) for p in na_faixa)),
            qtd=_plural(clientes, 'cliente', 'clientes'),
            cor=cor,
        ))

    por_contrato: dict[int, list] = defaultdict(list)
    for p in atrasadas:
        por_contrato[p['contrato_id']].append(p)

    linhas = []
    for parcelas in por_contrato.values():
        pior = max(dias_de_atraso(p['vencimento'], hoje) for p in parcelas)
        primeira = parcelas[0]
        linhas.append(InadimplenteAgrupado(
            cliente_id=primeira['cliente_id'],
            cliente_nome=primeira['cliente_nome'],
            contrato_id=primeira['contrato_id'],
            ctt_n=primeira['ctt_n'],
            valor=formatar_brl(sum(parse_valor(p['valor']) for p in parcelas)),
            dias=f'{pior} dias',
            parcelas=len(parcelas),
        ))
    linhas.sort(key=lambda l: int(l.dias.split()[0]), reverse=True)

    return InadimplenciaResponse(aging=aging, linhas=linhas)


def _rotulo_parcela(p) -> str:
    return str(p['num_parcela']) if p['num_parcela'] else '—'


def _para_painel_parcela(p, hoje: date) -> PainelParcela:
    venc = parse_data(p['vencimento'])
    atraso = dias_de_atraso(p['vencimento'], hoje)
    if _pago(p):
        situacao = 'Baixada'
    elif atraso > 0:
        situacao = 'Em atraso'
    elif venc and (venc - hoje).days <= 10:
        situacao = f'Vence em {(venc - hoje).days} dias'
    else:
        situacao = 'Programada'
    return PainelParcela(
        honorario_id=p['honorario_id'],
        parcela_id=p['parcela_id'],
        vencimento=_br(venc),
        vencimento_iso=p['vencimento'] or '',
        contrato_id=p['contrato_id'],
        ctt_n=p['ctt_n'],
        cliente_nome=p['cliente_nome'],
        hipotese=p['hipotese'] or TIPO_CURTO.get(p['tipo'], p['tipo']),
        tipo=TIPO_CURTO.get(p['tipo'], p['tipo']),
        parcela=_rotulo_parcela(p),
        valor=formatar_brl(parse_valor(p['valor'])),
        dias_atraso=atraso,
        situacao=situacao,
    )
