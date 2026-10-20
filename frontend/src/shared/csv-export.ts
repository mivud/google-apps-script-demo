export type CsvValue = string | number | null

export interface CsvColumn<T> {
  header: string
  // Columns without exportValue (e.g. action columns) are not exported.
  exportValue?: (row: T) => CsvValue
}

const BOM = '﻿'
const LINE_BREAK = '\r\n'
// Spreadsheets run cells starting with these characters as formulas.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeCell(value: CsvValue): string {
  let text = value === null ? '' : String(value)
  // Numbers such as -5 are safe; only text is neutralized.
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function toLine(cells: CsvValue[]): string {
  return cells.map(escapeCell).join(',')
}

export function toCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const exported = columns.filter((column) => column.exportValue)
  const header = toLine(exported.map((column) => column.header))
  const lines = rows.map((row) => toLine(exported.map((column) => column.exportValue!(row))))
  return BOM + [header, ...lines].join(LINE_BREAK) + LINE_BREAK
}

export function csvFileName(baseName: string, now: Date = new Date()): string {
  const safeBase = baseName.replace(/[^\w.-]+/g, '-')
  return `${safeBase}-${now.toISOString().slice(0, 10)}.csv`
}

export function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
