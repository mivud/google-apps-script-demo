import { rowToAudit, type AuditRow } from '../../../../shared/audit'
import { NetworkError } from '../../../../shared/errors'
import type { Expense, ExpensePatch } from '../../domain/expense'
import type { GenerateFixedResult } from '../../application/expense-repository'
import { isStatementMonth } from '../../domain/statement-month'

// Wire/table shape (snake_case), identical in Sheets payloads and Postgres columns.
export interface ExpenseRow extends AuditRow {
  id: string
  description: string
  amount: number | string | null
  payment_method_id: string | null
  spent_on: string
  statement_month: string
  is_fixed: boolean
  template_id: string | null
  paid_at?: string | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Sheets may hand numbers back as strings; anything else is malformed data.
export function toNonNegativeInteger(value: unknown): number {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 0) throw new NetworkError()
  return number
}

// Empty cells and null mean "not set".
export function toNullableInteger(value: unknown): number | null {
  return value === null || value === undefined || value === '' ? null : toNonNegativeInteger(value)
}

// Rejects malformed backend data instead of letting `undefined` leak into the UI.
export function rowToExpense(row: ExpenseRow): Expense {
  const valid = row && typeof row.id === 'string' && typeof row.description === 'string'
  if (!valid || !DATE_PATTERN.test(row.spent_on) || !isStatementMonth(row.statement_month)) throw new NetworkError()
  return {
    id: row.id,
    description: row.description,
    amount: toNullableInteger(row.amount) || null,
    paymentMethodId: row.payment_method_id || null,
    spentOn: row.spent_on,
    statementMonth: row.statement_month,
    isFixed: row.is_fixed === true,
    templateId: row.template_id ? row.template_id : null,
    paidAt: row.paid_at ? row.paid_at : null,
    ...rowToAudit(row),
  }
}

export function rowsToExpenses(data: { items?: unknown } | null | undefined): Expense[] {
  if (!data || !Array.isArray(data.items)) throw new NetworkError()
  return (data.items as ExpenseRow[]).map(rowToExpense)
}

// Only the fields present in the patch are sent, so an update never overwrites with defaults.
export function expensePatchToRow(patch: ExpensePatch): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.description !== undefined) row.description = patch.description
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.paymentMethodId !== undefined) row.payment_method_id = patch.paymentMethodId
  if (patch.spentOn !== undefined) row.spent_on = patch.spentOn
  if (patch.statementMonth !== undefined) row.statement_month = patch.statementMonth
  return row
}

export function toGenerateFixedResult(data: { items?: unknown; skipped?: unknown } | null | undefined): GenerateFixedResult {
  if (!data) throw new NetworkError()
  const created = Array.isArray(data.items) ? (data.items as ExpenseRow[]).map(rowToExpense) : []
  return { created, skipped: data.skipped === undefined ? 0 : toNonNegativeInteger(data.skipped) }
}
