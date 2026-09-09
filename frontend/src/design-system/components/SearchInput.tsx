import { InputHTMLAttributes } from 'react'
import styles from './SearchInput.module.css'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string
}

export function SearchInput({ wrapperClassName = '', className = '', ...props }: SearchInputProps) {
  return (
    <label className={`${styles.wrapper} ${wrapperClassName}`}>
      <span className={styles.icon} aria-hidden="true" />
      <input
        type="text"
        className={`${styles.input} ${className}`}
        placeholder="Buscar..."
        {...props}
      />
    </label>
  )
}
