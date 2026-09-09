import styles from './Progress.module.css'

interface ProgressProps {
  /** 0 a 100. */
  percent: number
  showLabel?: boolean
}

export function Progress({ percent, showLabel = true }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className={styles.label}>{pct}%</span>}
    </div>
  )
}
