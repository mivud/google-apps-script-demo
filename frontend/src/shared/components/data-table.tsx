import type { ReactNode } from 'react'

export interface DataColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  // The main cell of the row: shown without a label in the stacked mobile card.
  primary?: boolean
}

interface DataTableProps<T> {
  caption: string
  columns: DataColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  refreshing?: boolean
}

// A real table from 768px up; below that CSS stacks each row into a card using data-label,
// so the page never scrolls horizontally.
export function DataTable<T>({ caption, columns, rows, getRowKey, refreshing = false }: DataTableProps<T>) {
  return (
    <table className={refreshing ? 'data-table surface is-refreshing' : 'data-table surface'}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} data-label={column.primary ? undefined : column.header} className={column.primary ? 'data-table-primary' : undefined}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
