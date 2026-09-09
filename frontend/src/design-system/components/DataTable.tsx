import { ReactNode } from 'react'
import styles from './DataTable.module.css'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'right'
  /** Valores, datas e identificadores — mono, como manda o design. */
  mono?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  selectedKey?: string | number | null
  onRowClick?: (row: T) => void
  emptyMessage?: string
  minWidth?: number
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  selectedKey,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  minWidth = 560,
}: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table} style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={col.align === 'right' ? styles.right : ''}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => {
              const key = rowKey(row)
              const classes = [
                selectedKey === key ? styles.selected : '',
                onRowClick ? styles.clickable : '',
              ].filter(Boolean).join(' ')
              return (
                <tr key={key} className={classes} onClick={() => onRowClick?.(row)}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={[
                        col.align === 'right' ? styles.right : '',
                        col.mono ? styles.mono : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
