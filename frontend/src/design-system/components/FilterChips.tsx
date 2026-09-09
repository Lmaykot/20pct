import styles from './FilterChips.module.css'

interface FilterChipsProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function FilterChips({ options, value, onChange }: FilterChipsProps) {
  return (
    <>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`${styles.chip} ${opt === value ? styles.on : ''}`}
        >
          {opt}
        </button>
      ))}
    </>
  )
}
