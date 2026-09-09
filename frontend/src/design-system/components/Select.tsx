import { SelectHTMLAttributes } from 'react'
import styles from './Select.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  wrapperClassName?: string
}

export function Select({ label, options, wrapperClassName = '', className = '', ...props }: SelectProps) {
  return (
    <label className={`${styles.wrapper} ${wrapperClassName}`}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.field}>
        <select className={`${styles.select} ${className}`} {...props}>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true" />
      </span>
    </label>
  )
}
