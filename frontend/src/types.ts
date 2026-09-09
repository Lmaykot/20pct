export interface Cliente {
  id: number
  nome: string
  cpf_cnpj: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  nome_representante: string
  observacoes: string
  created_at?: string
}

export interface Contrato {
  id: number
  cliente_id: number
  ctt_n: string
  descricao: string
  tipo: string
  advogado: string
  observacoes: string
  data_assinatura: string
  status: string
  arquivo_path: string
  cliente_nome: string
  created_at?: string
}

export interface Honorario {
  id: number
  contrato_id: number
  tipo: string
  hipotese: string
  valor: string
  ordem: number
}

export interface HonorarioSearchResult {
  honorario_id: number
  tipo: string
  hipotese: string
  valor: string
  contrato_id: number
  ctt_n: string
  cliente_nome: string
}

export interface Parcela {
  id: number
  honorario_id: number
  num_parcela: number
  valor: string
  vencimento: string
  nota_fiscal: string
  data_pagamento: string
}

export interface RelatorioHonorario extends Honorario {
  parcelas: Parcela[]
  total_parcelas: number
  parcelas_pagas: number
  status_quitacao: string
}

export interface Relatorio {
  contrato: Contrato
  honorarios: RelatorioHonorario[]
  clientes_extras: Cliente[]
}

export type HonorarioTipo = 'inicial' | 'condicionado' | 'intermediario' | 'exito' | 'mensais' | 'hora'

export const TIPO_LABELS: Record<string, string> = {
  inicial: 'Honorários Iniciais',
  condicionado: 'Honorários Condicionados',
  intermediario: 'Honorários Intermediários',
  exito: 'Honorários de Êxito',
  mensais: 'Honorários Mensais',
  hora: 'Honorários por Hora Trabalhada',
}

export const TIPO_ORDER: HonorarioTipo[] = ['inicial', 'condicionado', 'intermediario', 'exito', 'mensais', 'hora']

export const CONTRATO_TIPOS = ['Contencioso', 'Consultoria', 'Licenciamento', 'Misto']
export const CONTRATO_STATUS = ['Ativo', 'Encerrado', 'Quitado']

export interface InadimplenteRow {
  parcela_id: number
  vencimento: string
  valor: string
  nota_fiscal: string
  honorario_id: number
  tipo: string
  hipotese: string
  contrato_id: number
  ctt_n: string
  cliente_id: number
  cliente_nome: string
}

// -- Painel e agregados --

export interface PainelKpi {
  label: string
  valor: string
  hint: string
}

export interface PainelParcela {
  honorario_id: number
  parcela_id: number
  vencimento: string
  vencimento_iso: string
  contrato_id: number
  ctt_n: string
  cliente_nome: string
  hipotese: string
  tipo: string
  parcela: string
  valor: string
  dias_atraso: number
  situacao: string
}

export interface PainelPendencia {
  titulo: string
  detalhe: string
  /** 'red' | 'amb' | 'acc' — define a cor do ponto à esquerda. */
  tom: string
}

export interface PainelContagens {
  contratos: number
  contratos_ativos: number
  clientes: number
  parcelas_abertas: number
  inadimplentes: number
}

export interface Painel {
  kpis: PainelKpi[]
  agenda: PainelParcela[]
  pendencias: PainelPendencia[]
  contagens: PainelContagens
  competencia: string
}

export interface Pagamentos {
  kpis: PainelKpi[]
  parcelas: PainelParcela[]
}

export interface ContratoResumo {
  id: number
  ctt_n: string
  cliente_nome: string
  tipo: string
  advogado: string
  status: string
  total_honorarios: string
  recebido: string
  pct_recebido: number
}

export interface AgingFaixa {
  faixa: string
  valor: string
  qtd: string
  cor: string
}

export interface InadimplenteAgrupado {
  cliente_id: number
  cliente_nome: string
  contrato_id: number
  ctt_n: string
  valor: string
  dias: string
  parcelas: number
}

export interface Inadimplencia {
  aging: AgingFaixa[]
  linhas: InadimplenteAgrupado[]
}

// -- Usuarios --

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: string
  escopo: string
  status: string
  ultimo_acesso: string
  created_at?: string
}

export interface PerfilInfo {
  nome: string
  descricao: string
}

export const USUARIO_PERFIS = ['Sócio', 'Advogado', 'Financeiro', 'Paralegal']
export const USUARIO_STATUS = ['Ativo', 'Convite pendente', 'Inativo']

export interface PosicaoCliente {
  contratos_ativos: number
  contratos_total: number
  contratado: string
  recebido: string
  aberto: string
  atrasos: string
}
