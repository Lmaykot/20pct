import styles from './KpiCard.module.css'

interface KpiCardProps {
  label: string
  value: string
  hint?: string
  /** Filete superior colorido — usado nas faixas de aging. */
  accent?: string
}

export function KpiCard({ label, value, hint, accent }: KpiCardProps) {
  return (
    <div
      className={styles.card}
      style={accent ? { borderTop: `3px solid ${accent}` } : undefined}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
