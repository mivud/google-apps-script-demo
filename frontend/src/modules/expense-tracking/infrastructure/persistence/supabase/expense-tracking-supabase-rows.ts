import { rowToAudit, type AuditRow } from '../../../../../shared/audit'
import { NetworkError } from '../../../../../shared/errors'
import type { Expense, ExpensePatch } from '../../../domain/expense'
import type { FixedExpenseTemplate, FixedExpenseTemplatePatch } from '../../../domain/fixed-expense-template'
import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../../../domain/payment-method'

// Table shapes (snake_case), identical to the Postgres columns and the Sheets columns.
export interface PaymentMethodRow extends AuditRow {
  id: string
  name: string
  active: boolean
  statement_closing_day: number | null
  color: string | null
}

export interface FixedExpenseTemplateRow extends AuditRow {
  id: string
  description: string
  amount: number | null
  payment_method_id: string | null
  active: boolean
  total_months: number | null
  months_added: number
}

export interface ExpenseRow extends AuditRow {
  id: string
  description: string
  amount: number | null
  payment_method_id: string | null
  spent_on: string
  statement_month: string
  is_fixed: boolean
  template_id: string | null
}

// Rejects malformed backend data instead of letting `undefined` leak into the UI.
function assertRow(row: { id?: unknown } | null | undefined): void {
  if (!row || typeof row.id !== 'string') throw new NetworkError()
}

export function rowToPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  assertRow(row)
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    statementClosingDay: row.statement_closing_day ?? null,
    color: row.color ?? null,
    ...rowToAudit(row),
  }
}

export function rowToTemplate(row: FixedExpenseTemplateRow): FixedExpenseTemplate {
  assertRow(row)
  return {
    id: row.id,
    description: row.description,
    amount: row.amount === null ? null : Number(row.amount),
    paymentMethodId: row.payment_method_id,
    active: row.active,
    totalMonths: row.total_months ?? null,
    monthsAdded: row.months_added,
    ...rowToAudit(row),
  }
}

export function rowToExpense(row: ExpenseRow): Expense {
  assertRow(row)
  return {
    id: row.id,
    description: row.description,
    amount: row.amount === null ? null : Number(row.amount),
    paymentMethodId: row.payment_method_id,
    spentOn: row.spent_on,
    statementMonth: row.statement_month,
    isFixed: row.is_fixed,
    templateId: row.template_id,
    ...rowToAudit(row),
  }
}

// Writes carry only domain fields; audit columns and months_added are server-owned.
function definedEntries(entries: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined))
}

export function paymentMethodToRow(input: Partial<Omit<PaymentMethodInput, 'id'>>): Record<string, unknown> {
  return definedEntries({
    name: input.name,
    active: input.active,
    statement_closing_day: input.statementClosingDay,
    color: input.color,
  })
}

export function templateToRow(input: FixedExpenseTemplatePatch): Record<string, unknown> {
  return definedEntries({
    description: input.description,
    amount: input.amount,
    payment_method_id: input.paymentMethodId,
    active: input.active,
    total_months: input.totalMonths,
  })
}

export function expenseToRow(input: ExpensePatch): Record<string, unknown> {
  return definedEntries({
    description: input.description,
    amount: input.amount,
    payment_method_id: input.paymentMethodId,
    spent_on: input.spentOn,
    statement_month: input.statementMonth,
  })
}

// The user-entered id is sent on create only; it is immutable afterwards.
export function newPaymentMethodToRow(input: NewPaymentMethod): Record<string, unknown> {
  return { id: input.id, ...paymentMethodToRow(input) }
}
