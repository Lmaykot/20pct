/** Mapa de navegação do design: três grupos na sidebar, cada item com
 *  o contador que aparece à direita e o par título/subtítulo do header. */

export type ContadorKey =
  | 'contratos_ativos' | 'clientes' | 'parcelas_abertas' | 'inadimplentes' | null

export interface NavItem {
  to: string
  label: string
  contador: ContadorKey
}

export interface NavGrupo {
  titulo: string
  itens: NavItem[]
}

export const NAV_GRUPOS: NavGrupo[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/painel', label: 'Painel', contador: null },
      { to: '/contratos', label: 'Contratos', contador: 'contratos_ativos' },
      { to: '/clientes', label: 'Clientes', contador: 'clientes' },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      { to: '/pagamentos', label: 'Pagamentos', contador: 'parcelas_abertas' },
      { to: '/inadimplentes', label: 'Inadimplentes', contador: 'inadimplentes' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { to: '/configuracoes', label: 'Configurações', contador: null },
    ],
  },
]

/** Título e subtítulo do header por rota. O subtítulo pode ser
 *  substituído em tempo de execução por quem tiver o dado melhor
 *  (a ficha do contrato mostra o CTT-N, por exemplo). */
export const TITULOS: Record<string, [string, string]> = {
  '/painel': ['Painel', ''],
  '/contratos': ['Contratos', ''],
  '/clientes': ['Clientes', 'Cadastro e posição'],
  '/pagamentos': ['Pagamentos', 'Agenda e baixas'],
  '/inadimplentes': ['Inadimplência', ''],
  '/configuracoes': ['Configurações', 'Exportação, usuários e permissões'],
}

export function tituloParaRota(pathname: string): [string, string] {
  if (pathname.startsWith('/contratos/novo')) return ['Novo contrato', 'Cadastro']
  if (/^\/contratos\/\d+\/editar/.test(pathname)) return ['Editar contrato', '']
  if (/^\/contratos\/\d+/.test(pathname)) return ['Contrato', '']
  const exata = TITULOS[pathname]
  if (exata) return exata
  const prefixo = Object.keys(TITULOS).find(k => pathname.startsWith(k))
  return prefixo ? TITULOS[prefixo] : ['20%', '']
}
