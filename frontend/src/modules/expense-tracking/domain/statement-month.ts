import { ValidationError } from '../../../shared/errors'

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_YEAR = 2000
const MAX_YEAR = 2100

export function isStatementMonth(value: string): boolean {
  const match = MONTH_PATTERN.exec(value)
  return !!match && Number(match[1]) >= MIN_YEAR && Number(match[1]) <= MAX_YEAR
}

export function validateStatementMonth(value: string): string {
  if (!isStatementMonth(value)) throw new ValidationError('Invalid statement month', 'statement_month_invalid')
  return value
}

// Rejects impossible dates such as 2026-02-31 that a plain pattern would accept.
export function validateSpentOn(value: string): string {
  const match = DATE_PATTERN.exec(value)
  if (!match) throw new ValidationError('Invalid date', 'expense_date_invalid')
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!real || year < MIN_YEAR || year > MAX_YEAR) throw new ValidationError('Invalid date', 'expense_date_invalid')
  return value
}

export function monthOfDate(date: string): string {
  return date.slice(0, 7)
}

export function currentStatementMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS_PER_YEAR = 12
const MONTH_DIGITS = 2

// Pure month arithmetic: December + 1 wraps to January of the next year, January - 1 to December of the previous year.
export function shiftStatementMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = year * MONTHS_PER_YEAR + (monthNumber - 1) + delta
  const shiftedYear = Math.floor(monthIndex / MONTHS_PER_YEAR)
  const shiftedMonth = (monthIndex % MONTHS_PER_YEAR) + 1
  return `${shiftedYear}-${String(shiftedMonth).padStart(MONTH_DIGITS, '0')}`
}

const DAY_START = 8
const DAY_END = 10
const LAST_DAY_OF_PREVIOUS_MONTH = 0
const NEXT_MONTH = 1

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, LAST_DAY_OF_PREVIOUS_MONTH)).getUTCDate()
}

// Mirrors the server: spending up to the closing day (capped to the month length) belongs to the same
// month, later spending to the next one. No closing day means the calendar month.
export function resolveStatementMonth(spentOn: string, closingDay: number | null): string {
  const month = monthOfDate(spentOn)
  if (closingDay === null) return month
  const { year, month: monthNumber } = splitStatementMonth(month)
  const limit = Math.min(closingDay, daysInMonth(year, monthNumber))
  return Number(spentOn.slice(DAY_START, DAY_END)) <= limit ? month : shiftStatementMonth(month, NEXT_MONTH)
}

export function splitStatementMonth(month: string): { year: number; month: number } {
  const [year, monthNumber] = month.split('-').map(Number)
  return { year, month: monthNumber }
}
