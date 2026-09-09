import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FilterChips, Progress, StatusChip } from '../../design-system/components'
import { usePrivacy } from '../../contexts/PrivacyContext'
import { api } from '../../api/client'
import { CONTRATO_STATUS, type ContratoResumo } from '../../types'
import styles from './Contratos.module.css'

const FILTROS = ['Todos', ...CONTRATO_STATUS]

export function Contratos() {
  const [contratos, setContratos] = useState<ContratoResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [filtro, setFiltro] = useState('Todos')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mask } = usePrivacy()

  const busca = (searchParams.get('q') ?? '').trim().toLowerCase()

  useEffect(() => {
    api.get<ContratoResumo[]>('/painel/contratos')
      .then(cs => { setContratos(cs); setErro(false) })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

  const visiveis = useMemo(() => contratos.filter(c => {
    if (filtro !== 'Todos' && c.status !== filtro) return false
    if (!busca) return true
    return (
      c.cliente_nome.toLowerCase().includes(busca) ||
      c.ctt_n.toLowerCase().includes(busca) ||
      c.advogado.toLowerCase().includes(busca)
    )
  }), [contratos, filtro, busca])

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <FilterChips options={FILTROS} value={filtro} onChange={setFiltro} />
        <div className={styles.spacer} />
        <span className={styles.total}>
          {visiveis.length === 1 ? '1 contrato' : `${visiveis.length} contratos`}
        </span>
      </div>

      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Cliente</th>
                <th>Área · Tipo</th>
                <th>Responsável</th>
                <th className={styles.right}>Honorários</th>
                <th>Recebido</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.empty}>Carregando contratos…</td></tr>
              ) : erro ? (
                <tr>
                  <td colSpan={7} className={`${styles.empty} ${styles.falha}`}>
                    Não foi possível carregar os contratos. Verifique se a API está no ar.
                  </td>
                </tr>
              ) : visiveis.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {busca || filtro !== 'Todos'
                      ? 'Nenhum contrato corresponde ao filtro.'
                      : 'Nenhum contrato cadastrado ainda.'}
                  </td>
                </tr>
              ) : visiveis.map(c => (
                <tr key={c.id} onClick={() => navigate(`/contratos/${c.id}`)}>
                  <td className={styles.ctt}>{c.ctt_n}</td>
                  <td className={styles.cliente}>{c.cliente_nome}</td>
                  {/* "Área" não existe no modelo — o traço é honesto. */}
                  <td className={styles.muted}>{'—'} · {c.tipo || '—'}</td>
                  <td className={styles.responsavel}>{c.advogado || '—'}</td>
                  <td className={`${styles.mono} ${styles.right}`}>{mask(c.total_honorarios)}</td>
                  <td className={styles.recebido}>
                    <Progress percent={c.pct_recebido} />
                  </td>
                  <td><StatusChip status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
