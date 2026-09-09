import styles from './StatusChip.module.css'

interface StatusChipProps {
  status: string
  className?: string
}

/* O design colore por significado, não por texto literal:
   verde = liquidado, âmbar = aguardando, oxblood = condicionado ao
   acento da marca, vermelho = atraso, neutro = inerte. */
const STATUS_MAP: Record<string, string> = {
  'Ativo': 'ok',
  'Quitado': 'ok',
  'Baixada': 'ok',
  'Pago': 'ok',
  'Em renovação': 'accent',
  'Condicionado': 'accent',
  'Pendente': 'warn',
  'Suspenso': 'warn',
  'Em aberto': 'warn',
  'Convite pendente': 'warn',
  'Em atraso': 'bad',
  'Vencida': 'bad',
  'Encerrado': 'inert',
  'Não disparado': 'inert',
  'Programada': 'inert',
}

export function StatusChip({ status, className = '' }: StatusChipProps) {
  const variant = STATUS_MAP[status] || 'inert'
  return (
    <span className={`${styles.chip} ${styles[variant]} ${className}`}>
      {status}
    </span>
  )
}
