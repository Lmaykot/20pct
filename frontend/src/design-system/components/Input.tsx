import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** CNPJ, CEP, datas e valores usam mono — é a regra tipográfica do design. */
  mono?: boolean
  wrapperClassName?: string
}

export function Input({ label, mono, wrapperClassName = '', className = '', ...props }: InputProps) {
  return (
    <label className={`${styles.wrapper} ${wrapperClassName}`}>
      {label && <span className={styles.label}>{label}</span>}
      <input
        className={`${styles.input} ${mono ? styles.mono : ''} ${className}`}
        {...props}
      />
    </label>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  wrapperClassName?: string
}

export function TextArea({ label, wrapperClassName = '', className = '', ...props }: TextAreaProps) {
  return (
    <label className={`${styles.wrapper} ${wrapperClassName}`}>
      {label && <span className={styles.label}>{label}</span>}
      <textarea className={`${styles.input} ${styles.textarea} ${className}`} {...props} />
    </label>
  )
}
