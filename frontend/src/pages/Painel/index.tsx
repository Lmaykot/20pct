import { Link } from 'react-router-dom'
import { KpiCard, Section } from '../../design-system/components'
import { usePainel } from '../../contexts/PainelContext'
import { usePrivacy } from '../../contexts/PrivacyContext'
import styles from './Painel.module.css'

const TOM_CORES: Record<string, string> = {
  red: 'var(--red)',
  amb: 'var(--amb)',
  acc: 'var(--acc)',
}

export function Painel() {
  const { painel, loading } = usePainel()
  const { mask } = usePrivacy()

  if (loading && !painel) {
    return <div className={styles.placeholder}>Carregando painel…</div>
  }

  if (!painel) {
    return (
      <div className={styles.placeholder}>
        Não foi possível carregar o painel. Verifique se a API está no ar.
      </div>
    )
  }

  return (
    <>
      <div className={styles.kpis}>
        {painel.kpis.map(k => (
          <KpiCard key={k.label} label={k.label} value={mask(k.valor)} hint={k.hint} />
        ))}
      </div>

      <div className={styles.split}>
        <Section
          flush
          title="Recebimentos dos próximos 30 dias"
          action={<Link to="/pagamentos" className={styles.link}>Ver agenda completa</Link>}
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Cliente</th>
                  <th>Hipótese</th>
                  <th className={styles.right}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {painel.agenda.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      Nenhuma parcela programada para os próximos 30 dias.
                    </td>
                  </tr>
                ) : painel.agenda.map(p => (
                  <tr key={p.parcela_id}>
                    <td className={styles.mono}>{p.vencimento}</td>
                    <td>{p.cliente_nome}</td>
                    <td className={styles.muted}>{p.hipotese}</td>
                    <td className={`${styles.mono} ${styles.right}`}>{mask(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section flush title="Exige atenção">
          <div className={styles.avisos}>
            {painel.pendencias.length === 0 ? (
              <div className={styles.empty}>Nada pendente. Bom sinal.</div>
            ) : painel.pendencias.map((a, i) => (
              <div key={i} className={styles.aviso}>
                <span
                  className={styles.dot}
                  style={{ background: TOM_CORES[a.tom] ?? 'var(--muted)' }}
                />
                <div className={styles.avisoTexto}>
                  <div className={styles.avisoTitulo}>{a.titulo}</div>
                  <div className={styles.avisoDetalhe}>{a.detalhe}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}
