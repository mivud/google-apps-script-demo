import type { ReactNode } from 'react'

export interface DataColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  // The main cell of the row: shown without a label in the stacked mobile card.
  primary?: boolean
  // 'end' right-aligns header and cells (logical, so it flips in RTL); meant for the actions column.
  align?: 'end'
  // Plain value written to the CSV export; columns without it (e.g. actions) are not exported.
  exportValue?: (row: T) => string | number | null
  // Written to the CSV only; the value is already shown inside another cell on screen.
  exportOnly?: boolean
}

export interface DataTableViewProps<T> {
  caption: string
  columns: DataColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  refreshing?: boolean
}

function alignClass(column: Pick<DataColumn<never>, 'align'>): string | undefined {
  return column.align === 'end' ? 'data-table-end' : undefined
}

function cellClass(column: Pick<DataColumn<never>, 'align' | 'primary'>): string | undefined {
  return [column.primary ? 'data-table-primary' : '', alignClass(column) ?? ''].filter(Boolean).join(' ') || undefined
}

// A real table from 768px up; below that CSS stacks each row into a card using data-label,
// so the page never scrolls horizontally.
export function DataTableView<T>({ caption, columns: allColumns, rows, getRowKey, refreshing = false }: DataTableViewProps<T>) {
  const columns = allColumns.filter((column) => !column.exportOnly)
  return (
    <table className={refreshing ? 'data-table surface is-refreshing' : 'data-table surface'}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={alignClass(column)}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} data-label={column.primary ? undefined : column.header} className={cellClass(column)}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
