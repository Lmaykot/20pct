import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Section, StatusChip } from '../../design-system/components'
import { HonorariosDialog } from '../HonorariosDialog/HonorariosDialog'
import { usePrivacy } from '../../contexts/PrivacyContext'
import { api } from '../../api/client'
import { TIPO_LABELS, TIPO_ORDER, type Relatorio, type RelatorioHonorario } from '../../types'
import { dataLonga, formatarBRL, parseValor } from '../../utils/valores'
import styles from './ContratoDetalhe.module.css'

/* Cada faixa de honorário carrega uma nota que explica quando ela
   incide — é o texto de apoio que o design põe ao lado do título. */
const NOTAS: Record<string, string> = {
  inicial: 'devidos na contratação',
  condicionado: 'disparados por evento processual',
  intermediario: 'devidos no curso do processo',
  exito: 'sobre o proveito econômico',
  mensais: 'cobrança recorrente',
  hora: 'apontamentos por hora trabalhada',
}

function parcelamentoLabel(h: RelatorioHonorario): string {
  if (h.total_parcelas === 0) return 'Não definido'
  if (h.total_parcelas === 1) return 'À vista'
  return `${h.parcelas_pagas}/${h.total_parcelas} pagas`
}

function statusDoHonorario(h: RelatorioHonorario): string {
  if (h.total_parcelas === 0) return 'Não disparado'
  if (h.parcelas_pagas === 0) return 'Pendente'
  if (h.parcelas_pagas === h.total_parcelas) return 'Quitado'
  return 'Em aberto'
}

export function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mask } = usePrivacy()
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)

  const carregar = useCallback(() => {
    if (!id) return
    setLoading(true)
    api.get<Relatorio>(`/relatorio/${id}`)
      .then(setRelatorio)
      .catch(() => setRelatorio(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <div className={styles.placeholder}>Carregando contrato…</div>
  if (!relatorio) {
    return (
      <div className={styles.placeholder}>
        Contrato não encontrado. <Link to="/contratos">Voltar para a lista</Link>
      </div>
    )
  }

  const { contrato, honorarios } = relatorio

  const contratado = honorarios.reduce((soma, h) => soma + parseValor(h.valor), 0)
  const recebido = honorarios.reduce((soma, h) => soma + h.parcelas
    .filter(p => p.data_pagamento)
    .reduce((s, p) => s + parseValor(p.valor), 0), 0)
  const aberto = contratado - recebido

  const grupos = TIPO_ORDER
    .map(tipo => ({ tipo, itens: honorarios.filter(h => h.tipo === tipo) }))
    .filter(g => g.itens.length > 0)

  return (
    <div className={styles.page}>
      <div className={styles.topo}>
        <div>
          <Link to="/contratos" className={styles.voltar}>← Contratos</Link>
          <div className={styles.tituloLinha}>
            <h2 className={styles.cliente}>{contrato.cliente_nome}</h2>
            <StatusChip status={contrato.status} />
          </div>
          <div className={styles.meta}>
            {contrato.ctt_n} · {contrato.tipo || '—'} · assinado em{' '}
            {dataLonga(contrato.data_assinatura)}
          </div>
        </div>

        <div className={styles.totais}>
          <div>
            <div className={styles.totalLabel}>Contratado</div>
            <div className={styles.totalValor}>{mask(formatarBRL(contratado))}</div>
          </div>
          <div className={styles.divisor} />
          <div>
            <div className={styles.totalLabel}>Recebido</div>
            <div className={`${styles.totalValor} ${styles.verde}`}>
              {mask(formatarBRL(recebido))}
            </div>
          </div>
          <div className={styles.divisor} />
          <div>
            <div className={styles.totalLabel}>Em aberto</div>
            <div className={`${styles.totalValor} ${styles.ambar}`}>
              {mask(formatarBRL(aberto))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.acoes}>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/contratos/${id}/editar`)}>
          Editar contrato
        </Button>
        {contrato.arquivo_path && (
          <a
            className={styles.pdfLink}
            href={`/api/contratos/${contrato.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Baixar PDF do contrato
          </a>
        )}
        {contrato.descricao && (
          <span className={styles.descricao}>{contrato.descricao}</span>
        )}
      </div>

      {grupos.length === 0 ? (
        <Section title="Honorários" note="nenhuma hipótese cadastrada"
          action={<Button size="sm" variant="secondary" tone="accent"
            onClick={() => setDialogAberto(true)}>Adicionar hipótese</Button>}>
          <div className={styles.vazio}>
            Este contrato ainda não tem honorários. Cadastre as hipóteses de incidência
            para que as parcelas possam ser programadas.
          </div>
        </Section>
      ) : grupos.map(grupo => (
        <Section
          key={grupo.tipo}
          flush
          title={TIPO_LABELS[grupo.tipo]}
          note={NOTAS[grupo.tipo]}
          action={
            <Button size="sm" variant="secondary" tone="accent"
              onClick={() => setDialogAberto(true)}>
              Adicionar hipótese
            </Button>
          }
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Hipótese</th>
                  <th>Base de cálculo</th>
                  <th className={styles.right}>Valor</th>
                  <th>Parcelamento</th>
                  <th>Quitação</th>
                </tr>
              </thead>
              <tbody>
                {grupo.itens.map(h => (
                  <tr key={h.id}>
                    <td className={styles.hipotese}>{h.hipotese || '—'}</td>
                    {/* Base de cálculo não existe no modelo de dados. */}
                    <td className={styles.muted}>—</td>
                    <td className={`${styles.mono} ${styles.right}`}>
                      {mask(formatarBRL(parseValor(h.valor)))}
                    </td>
                    <td className={styles.parcelamento}>{parcelamentoLabel(h)}</td>
                    <td>
                      <div className={styles.quitacao}>
                        <StatusChip status={statusDoHonorario(h)} />
                        <Link to={`/pagamentos?h=${h.id}`} className={styles.gerir}>Gerir</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}

      <HonorariosDialog
        open={dialogAberto}
        contratoId={contrato.id}
        onClose={() => { setDialogAberto(false); carregar() }}
      />
    </div>
  )
}
