import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { usePrivacy } from '../contexts/PrivacyContext'
import { usePainel } from '../contexts/PainelContext'
import { Avatar } from '../design-system/components'
import { api } from '../api/client'
import type { PainelContagens, Usuario } from '../types'
import { NAV_GRUPOS, tituloParaRota } from './navigation'
import styles from './AppShell.module.css'

interface AppShellProps {
  children: ReactNode
}

function contadorDe(contagens: PainelContagens | undefined, chave: string | null) {
  if (!contagens || !chave) return ''
  const n = contagens[chave as keyof PainelContagens]
  return n ? String(n) : ''
}

export function AppShell({ children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme()
  const { hidden, toggleHidden, mask } = usePrivacy()
  const { painel } = usePainel()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [responsavel, setResponsavel] = useState<Usuario | null>(null)

  /* O rodapé da sidebar mostra quem responde pelo escritório: o
     primeiro sócio cadastrado. Sem usuários, some — nada inventado. */
  useEffect(() => {
    api.get<Usuario[]>('/usuarios')
      .then(us => setResponsavel(us.find(u => u.perfil === 'Sócio') ?? us[0] ?? null))
      .catch(() => setResponsavel(null))
  }, [])

  const [titulo, subtituloBase] = tituloParaRota(location.pathname)
  const contagens = painel?.contagens

  /* O subtítulo é o lugar onde o header dá o número que importa
     naquela tela — é assim no design. */
  let subtitulo = subtituloBase
  if (location.pathname === '/painel') {
    subtitulo = painel?.competencia ?? ''
  } else if (location.pathname === '/contratos' && contagens) {
    const encerrados = contagens.contratos - contagens.contratos_ativos
    subtitulo = [
      `${contagens.contratos_ativos} ${contagens.contratos_ativos === 1 ? 'ativo' : 'ativos'}`,
      `${encerrados} ${encerrados === 1 ? 'encerrado' : 'encerrados'}`,
    ].join(' · ')
  } else if (location.pathname === '/inadimplentes' && painel) {
    const emAtraso = painel.kpis.find(k => k.label === 'Em atraso')
    subtitulo = emAtraso ? `${mask(emAtraso.valor)} em atraso` : ''
  }

  const busca = searchParams.get('q') ?? ''
  const setBusca = (valor: string) => {
    const proximo = new URLSearchParams(searchParams)
    if (valor) proximo.set('q', valor)
    else proximo.delete('q')
    setSearchParams(proximo, { replace: true })
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <span className={styles.brandWord}>
              20<span className={styles.brandPercent}>%</span>
            </span>
            <span className={styles.brandDot} />
          </div>
          <div className={styles.brandSub}>Gestão de contratos</div>
        </div>

        <nav className={styles.nav}>
          {NAV_GRUPOS.map(grupo => (
            <div key={grupo.titulo} className={styles.navGroup}>
              <div className={styles.navGroupTitle}>{grupo.titulo}</div>
              {grupo.itens.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navActive : ''}`
                  }
                >
                  <span>{item.label}</span>
                  <span className={styles.navCount}>
                    {contadorDe(contagens, item.contador)}
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {responsavel && (
          <div className={styles.sidebarFooter}>
            <Avatar name={responsavel.nome} tone="dark" />
            <div className={styles.userInfo}>
              <div className={styles.userName}>{responsavel.nome}</div>
              <div className={styles.userRole}>
                {responsavel.perfil}
                {responsavel.escopo ? ` · ${responsavel.escopo}` : ''}
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitles}>
            <h1 className={styles.title}>{titulo}</h1>
            {subtitulo && <span className={styles.subtitle}>{subtitulo}</span>}
          </div>

          <div className={styles.headerActions}>
            <label className={styles.search}>
              <span className={styles.searchIcon} aria-hidden="true" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cliente, contrato ou CNPJ"
                aria-label="Buscar"
              />
            </label>

            <button
              type="button"
              className={styles.headerBtn}
              onClick={toggleTheme}
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            </button>

            <button
              type="button"
              className={styles.headerBtn}
              onClick={toggleHidden}
              title="Esconde todos os valores monetários da tela"
            >
              {hidden ? 'Mostrar valores' : 'Ocultar valores'}
            </button>

            <button
              type="button"
              className={styles.headerPrimary}
              onClick={() => navigate('/contratos/novo')}
            >
              Novo contrato
            </button>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  )
}
