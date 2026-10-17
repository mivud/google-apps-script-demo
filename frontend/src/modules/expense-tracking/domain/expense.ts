import type { Audit } from '../../../shared/audit'
import { validateAmount, validateRequiredAmount } from './amount'
import { validateDescription, validatePaymentMethodId } from './expense-description'
import { validateSpentOn, validateStatementMonth } from './statement-month'

export interface Expense extends Audit {
  id: string
  description: string
  // null only for expenses generated from a template without a fixed amount (pending).
  amount: number | null
  // null only for expenses generated from a template without a fixed payment method (unassigned).
  paymentMethodId: string | null
  // 'YYYY-MM-DD'
  spentOn: string
  // 'YYYY-MM'; the month of the card statement the expense is billed in.
  statementMonth: string
  isFixed: boolean
  // Set for expenses generated from a fixed template.
  templateId: string | null
}

export interface ExpenseInput {
  description: string
  amount: number
  paymentMethodId: string
  spentOn: string
  // Optional on create: the server derives it from the payment method cycle when missing.
  statementMonth?: string
}

export type ExpensePatch = Partial<ExpenseInput>

export function validateExpensePatch(patch: ExpensePatch): ExpensePatch {
  const checked: ExpensePatch = {}
  if (patch.description !== undefined) checked.description = validateDescription(patch.description)
  if (patch.amount !== undefined) checked.amount = validateAmount(patch.amount)
  if (patch.paymentMethodId !== undefined) checked.paymentMethodId = validatePaymentMethodId(patch.paymentMethodId)
  if (patch.spentOn !== undefined) checked.spentOn = validateSpentOn(patch.spentOn)
  if (patch.statementMonth !== undefined) checked.statementMonth = validateStatementMonth(patch.statementMonth)
  return checked
}

export function validateExpenseInput(input: ExpenseInput): ExpenseInput {
  validateRequiredAmount(input.amount)
  return validateExpensePatch(input) as ExpenseInput
}

const BEFORE = -1
const AFTER = 1
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

function compareText(a: string, b: string): number {
  return a < b ? BEFORE : a > b ? AFTER : 0
}

// Newest first: valid dates compare as text (YYYY-MM-DD sorts chronologically) in reverse; a missing or malformed one sorts after every valid date.
function compareSpentOnNewestFirst(a: string, b: string): number {
  const aValid = DATE_PATTERN.test(a)
  const bValid = DATE_PATTERN.test(b)
  if (aValid !== bValid) return aValid ? BEFORE : AFTER
  return aValid ? compareText(b, a) : 0
}

// Default display order, identical for every provider: fixed first, then newest payment date, then newest creation time, then id.
export function compareExpensesForDisplay(a: Expense, b: Expense): number {
  if (a.isFixed !== b.isFixed) return a.isFixed ? BEFORE : AFTER
  return compareSpentOnNewestFirst(a.spentOn, b.spentOn) || compareText(b.created, a.created) || compareText(a.id, b.id)
}
