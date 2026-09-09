import { HTMLAttributes, ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Texto de apoio ao lado do título — "devidos na contratação". */
  note?: ReactNode
  /** Botão ou link alinhado à direita do cabeçalho. */
  action?: ReactNode
  /** Sem padding no corpo: para seções que embrulham uma tabela. */
  flush?: boolean
  children: ReactNode
}

/* O contêiner mais repetido do design: cartão de 1px com um
   cabeçalho separado por fio e o corpo embaixo. */
export function Section({
  title, note, action, flush, className = '', children, ...props
}: SectionProps) {
  const hasHeader = title || note || action
  return (
    <section className={`${styles.section} ${className}`} {...props}>
      {hasHeader && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {note && <span className={styles.note}>{note}</span>}
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  )
}
