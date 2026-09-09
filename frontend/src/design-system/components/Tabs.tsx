import styles from './Tabs.module.css'

interface TabsProps<T extends string> {
  tabs: { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className={styles.bar} role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          onClick={() => onChange(t.key)}
          className={`${styles.tab} ${t.key === value ? styles.on : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
