import { useState } from 'react'
import { SectionHeader } from '../../design-system/components'
import styles from './Configuracoes.module.css'

interface ItemExport {
  id: string
  nome: string
  ext: string
  desc: string
  meta: string
  endpoint?: string
  arquivo?: (hoje: string) => string
}

interface GrupoExport {
  titulo: string
  nota: string
  itens: ItemExport[]
}

const GRUPOS: GrupoExport[] = [
  {
    titulo: 'Banco de dados',
    nota: 'Cópia integral dos registros do sistema.',
    itens: [
      {
        id: 'db-sqlite',
        nome: 'Banco SQLite',
        ext: '.db',
        desc: 'Banco completo, pronto para backup ou migração.',
        meta: 'Gera com a data de hoje',
        endpoint: '/api/export/db/sqlite',
        arquivo: hoje => `gestao_contratos_${hoje}.db`,
      },
      {
        id: 'db-xlsx',
        nome: 'Planilha Excel',
        ext: '.xlsx',
        desc: 'Contratos, honorários e parcelas em abas separadas.',
        meta: 'Gera com a data de hoje',
        endpoint: '/api/export/db/xlsx',
        arquivo: hoje => `gestao_contratos_${hoje}.xlsx`,
      },
    ],
  },
  {
    titulo: 'Arquivos de contratos',
    nota: 'Documentos anexados a cada contrato.',
    itens: [
      {
        id: 'contratos-zip',
        nome: 'Arquivos ZIP',
        ext: '.zip',
        desc: 'Todos os anexos compactados, organizados por contrato.',
        meta: 'Inclui todos os PDFs anexados',
        endpoint: '/api/export/contratos/zip',
        arquivo: hoje => `contratos_${hoje}.zip`,
      },
    ],
  },
  {
    // Grupo desenhado, sem rota no backend — os cartões aparecem
    // desabilitados em vez de sumirem, para não esconder o que falta.
    titulo: 'Relatórios financeiros',
    nota: 'Recortes prontos para o contador ou para o sócio.',
    itens: [
      {
        id: 'rel-recebimentos',
        nome: 'Recebimentos do período',
        ext: '.csv',
        desc: 'Baixas registradas com contrato, hipótese e data.',
        meta: '—',
      },
      {
        id: 'rel-inadimplencia',
        nome: 'Inadimplência',
        ext: '.pdf',
        desc: 'Posição por cliente com aging e tratativas.',
        meta: '—',
      },
    ],
  },
]

async function baixar(endpoint: string, nomeArquivo: string) {
  const resposta = await fetch(endpoint)
  if (!resposta.ok) throw new Error('Erro ao baixar arquivo')
  const blob = await resposta.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export function Exportacao() {
  const [baixando, setBaixando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const exportar = async (item: ItemExport) => {
    if (!item.endpoint || !item.arquivo) return
    setBaixando(item.id)
    setErro(null)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      await baixar(item.endpoint, item.arquivo(hoje))
    } catch {
      setErro(`Não foi possível gerar "${item.nome}". Verifique se a API está no ar.`)
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className={styles.grupos}>
      {erro && <div className={styles.erro}>{erro}</div>}

      {GRUPOS.map(grupo => (
        <section key={grupo.titulo} className={styles.grupo}>
          <SectionHeader text={grupo.titulo} />
          <p className={styles.grupoNota}>{grupo.nota}</p>

          <div className={styles.cards}>
            {grupo.itens.map(item => {
              const indisponivel = !item.endpoint
              return (
                <div key={item.id} className={styles.exportCard}>
                  <div className={styles.exportTopo}>
                    <span className={styles.exportNome}>{item.nome}</span>
                    <span className={styles.exportExt}>{item.ext}</span>
                  </div>
                  <p className={styles.exportDesc}>{item.desc}</p>
                  <div className={styles.exportRodape}>
                    <span className={styles.exportMeta}>
                      {indisponivel ? 'Ainda não disponível' : item.meta}
                    </span>
                    <button
                      type="button"
                      className={styles.exportBtn}
                      disabled={indisponivel || baixando === item.id}
                      onClick={() => exportar(item)}
                      title={indisponivel
                        ? 'Este recorte ainda não tem rota no backend'
                        : undefined}
                    >
                      {baixando === item.id ? 'Gerando…' : 'Exportar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
