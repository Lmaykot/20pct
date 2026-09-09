import { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

interface SectionHeaderProps {
  text: string
  note?: ReactNode
  action?: ReactNode
}

/* Cabeçalho solto, fora de cartão — usado quando a seção não tem
   moldura própria (grupos de exportação, blocos de formulário). */
export function SectionHeader({ text, note, action }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 className={styles.text}>{text}</h2>
      {note && <span className={styles.note}>{note}</span>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
