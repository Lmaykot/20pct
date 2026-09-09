from pydantic import BaseModel


# -- Clientes --

class ClienteCreate(BaseModel):
    nome: str
    cpf_cnpj: str = ''
    telefone: str = ''
    email: str = ''
    cep: str = ''
    logradouro: str = ''
    numero: str = ''
    complemento: str = ''
    bairro: str = ''
    cidade: str = ''
    estado: str = ''
    nome_representante: str = ''
    observacoes: str = ''


class ClienteResponse(ClienteCreate):
    id: int
    created_at: str | None = None


# -- Contratos --

class ContratoCreate(BaseModel):
    cliente_id: int
    ctt_n: str
    descricao: str = ''
    tipo: str = ''
    advogado: str = ''
    observacoes: str = ''
    data_assinatura: str = ''
    status: str = 'Ativo'
    arquivo_path: str = ''


class ContratoUpdate(BaseModel):
    ctt_n: str = ''
    descricao: str = ''
    tipo: str = ''
    advogado: str = ''
    observacoes: str = ''
    data_assinatura: str = ''
    status: str = 'Ativo'
    arquivo_path: str = ''


class ContratoResponse(ContratoCreate):
    id: int
    cliente_nome: str = ''
    created_at: str | None = None


# -- Contrato Clientes --

class ContratoClientesPayload(BaseModel):
    cliente_ids: list[int]


# -- Contrato Advogados --

class ContratoAdvogadosPayload(BaseModel):
    nomes: list[str]


# -- Honorarios --

class HonorarioRow(BaseModel):
    id: int | None = None
    tipo: str
    hipotese: str = ''
    valor: str = ''
    ordem: int = 0


class HonorariosPayload(BaseModel):
    honorarios: list[HonorarioRow]


class HonorarioResponse(HonorarioRow):
    id: int
    contrato_id: int


class HonorarioSearchResult(BaseModel):
    honorario_id: int
    tipo: str
    hipotese: str
    valor: str
    contrato_id: int
    ctt_n: str
    cliente_nome: str


# -- Parcelas --

class ParcelaRow(BaseModel):
    num: int
    valor: str = ''
    vencimento: str = ''
    nota_fiscal: str = ''
    data_pagamento: str = ''


class ParcelasPayload(BaseModel):
    parcelas: list[ParcelaRow]


class ParcelaResponse(BaseModel):
    id: int
    honorario_id: int
    num_parcela: int
    valor: str
    vencimento: str
    nota_fiscal: str
    data_pagamento: str


# -- Relatorio --

class RelatorioHonorario(BaseModel):
    id: int
    tipo: str
    hipotese: str
    valor: str
    ordem: int
    parcelas: list[ParcelaResponse]
    total_parcelas: int
    parcelas_pagas: int
    status_quitacao: str


class RelatorioResponse(BaseModel):
    contrato: ContratoResponse
    honorarios: list[RelatorioHonorario]
    clientes_extras: list[ClienteResponse]


# -- Inadimplentes --

class InadimplenteRow(BaseModel):
    parcela_id: int
    vencimento: str
    valor: str
    nota_fiscal: str
    honorario_id: int
    tipo: str
    hipotese: str
    contrato_id: int
    ctt_n: str
    cliente_id: int
    cliente_nome: str


# -- Usuarios --

class UsuarioCreate(BaseModel):
    nome: str
    email: str = ''
    perfil: str = 'Paralegal'
    escopo: str = ''
    status: str = 'Ativo'


class UsuarioResponse(UsuarioCreate):
    id: int
    ultimo_acesso: str = ''
    created_at: str | None = None


class PerfilInfo(BaseModel):
    nome: str
    descricao: str


# -- Painel --

class PainelKpi(BaseModel):
    label: str
    valor: str
    hint: str


class PainelParcela(BaseModel):
    honorario_id: int
    parcela_id: int
    vencimento: str
    vencimento_iso: str
    contrato_id: int
    ctt_n: str
    cliente_nome: str
    hipotese: str
    tipo: str
    parcela: str
    valor: str
    dias_atraso: int
    situacao: str


class PainelPendencia(BaseModel):
    titulo: str
    detalhe: str
    tom: str


class PainelContagens(BaseModel):
    contratos: int
    contratos_ativos: int
    clientes: int
    parcelas_abertas: int
    inadimplentes: int


class PainelResponse(BaseModel):
    kpis: list[PainelKpi]
    agenda: list[PainelParcela]
    pendencias: list[PainelPendencia]
    contagens: PainelContagens
    competencia: str


class ContratoResumo(BaseModel):
    id: int
    ctt_n: str
    cliente_nome: str
    tipo: str
    advogado: str
    status: str
    total_honorarios: str
    recebido: str
    pct_recebido: float


class AgingFaixa(BaseModel):
    faixa: str
    valor: str
    qtd: str
    cor: str


class InadimplenteAgrupado(BaseModel):
    cliente_id: int
    cliente_nome: str
    contrato_id: int
    ctt_n: str
    valor: str
    dias: str
    parcelas: int


class InadimplenciaResponse(BaseModel):
    aging: list[AgingFaixa]
    linhas: list[InadimplenteAgrupado]


class PagamentosResponse(BaseModel):
    kpis: list[PainelKpi]
    parcelas: list[PainelParcela]


class PosicaoCliente(BaseModel):
    contratos_ativos: int
    contratos_total: int
    contratado: str
    recebido: str
    aberto: str
    atrasos: str
