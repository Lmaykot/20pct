import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KpiCard } from '../../design-system/components'
import { api } from '../../api/client'
import { usePrivacy } from '../../contexts/PrivacyContext'
import type { Inadimplencia } from '../../types'
import styles from './Inadimplentes.module.css'

export function Inadimplentes() {
  const [dados, setDados] = useState<Inadimplencia | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mask } = usePrivacy()

  const busca = (searchParams.get('q') ?? '').trim().toLowerCase()

  useEffect(() => {
    api.get<Inadimplencia>('/painel/inadimplencia')
      .then(d => { setDados(d); setErro(false) })
      .catch(() => setErro(true))
      .finally(() => setLoading(false))
  }, [])

  const linhas = useMemo(() => {
    if (!dados) return []
    if (!busca) return dados.linhas
    return dados.linhas.filter(l =>
      l.cliente_nome.toLowerCase().includes(busca) ||
      l.ctt_n.toLowerCase().includes(busca))
  }, [dados, busca])

  return (
    <>
      <div className={styles.aging}>
        {dados?.aging.map(f => (
          <KpiCard
            key={f.faixa}
            label={f.faixa}
            value={mask(f.valor)}
            hint={f.qtd}
            accent={f.cor}
          />
        ))}
      </div>

      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contrato</th>
                <th className={styles.right}>Em atraso</th>
                <th>Atraso</th>
                <th>Última tratativa</th>
                <th className={styles.right}>Próximo passo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={styles.empty}>Carregando inadimplência…</td></tr>
              ) : erro ? (
                <tr>
                  <td colSpan={6} className={`${styles.empty} ${styles.falha}`}>
                    Não foi possível carregar a inadimplência. Verifique se a API está no ar.
                  </td>
                </tr>
              ) : linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    {busca
                      ? 'Nenhum inadimplente corresponde à busca.'
                      : 'Nenhuma parcela vencida em aberto.'}
                  </td>
                </tr>
              ) : linhas.map(l => (
                <tr key={`${l.contrato_id}-${l.cliente_id}`}>
                  <td className={styles.cliente}>{l.cliente_nome}</td>
                  <td className={styles.contrato}>{l.ctt_n}</td>
                  <td className={`${styles.mono} ${styles.right} ${styles.vermelho}`}>
                    {mask(l.valor)}
                  </td>
                  <td className={styles.atraso}>
                    {l.dias}
                    <span className={styles.parcelas}>
                      {' '}· {l.parcelas === 1 ? '1 parcela' : `${l.parcelas} parcelas`}
                    </span>
                  </td>
                  {/* Histórico de cobrança não existe no modelo de dados. */}
                  <td className={styles.muted}>—</td>
                  <td className={styles.right}>
                    <button
                      type="button"
                      className={styles.acaoLink}
                      onClick={() => navigate(`/contratos/${l.contrato_id}`)}
                    >
                      Abrir contrato
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
