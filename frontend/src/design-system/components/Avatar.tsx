import styles from './Avatar.module.css'

interface AvatarProps {
  /** Nome completo; as iniciais saem daqui. */
  name: string
  size?: 'sm' | 'md'
  tone?: 'accent' | 'dark'
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = 'md', tone = 'accent' }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[size]} ${styles[tone]}`} title={name}>
      {initials(name)}
    </span>
  )
}
