import type { Audit } from '../../../shared/audit'
import { ValidationError } from '../../../shared/errors'
import { validateAmount } from './amount'
import { validateDescription, validatePaymentMethodId } from './expense-description'

export interface FixedExpenseTemplate extends Audit {
  id: string
  description: string
  // null means the amount changes every month and is entered on each generated expense.
  amount: number | null
  // null means the payment method differs each month and is chosen on each generated expense.
  paymentMethodId: string | null
  active: boolean
  // How many months the template runs; the server owns monthsAdded and counts up to it.
  // null means no end: the template recurs every month.
  totalMonths: number | null
  monthsAdded: number
  // Day of the month (1..31) the payment is due; null means no fixed day (the 1st is used).
  paymentDay: number | null
}

export interface FixedExpenseTemplateInput {
  description: string
  amount: number | null
  paymentMethodId: string | null
  active: boolean
  totalMonths: number | null
  paymentDay: number | null
}

export type FixedExpenseTemplatePatch = Partial<FixedExpenseTemplateInput>

export function isTemplateCompleted(template: Pick<FixedExpenseTemplate, 'totalMonths' | 'monthsAdded'>): boolean {
  return template.totalMonths !== null && template.monthsAdded >= template.totalMonths
}

export function validateTotalMonths(totalMonths: number | null): number | null {
  if (totalMonths === null) return null
  if (!Number.isInteger(totalMonths) || totalMonths < 1) {
    throw new ValidationError('Invalid total months', 'total_months_invalid')
  }
  return totalMonths
}

export function validatePaymentDay(paymentDay: number | null): number | null {
  if (paymentDay === null) return null
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    throw new ValidationError('Invalid payment day', 'payment_day_invalid')
  }
  return paymentDay
}

// A template cannot be shortened below the months it already produced.
export function assertTotalMonthsCoverAdded(totalMonths: number | null, monthsAdded: number): void {
  if (totalMonths !== null && totalMonths < monthsAdded) throw new ValidationError('Total months below added', 'total_months_below_added')
}

export function validateTemplatePatch(patch: FixedExpenseTemplatePatch): FixedExpenseTemplatePatch {
  const checked: FixedExpenseTemplatePatch = {}
  if (patch.description !== undefined) checked.description = validateDescription(patch.description)
  if (patch.amount !== undefined) checked.amount = patch.amount === null ? null : validateAmount(patch.amount)
  if (patch.paymentMethodId !== undefined) checked.paymentMethodId = patch.paymentMethodId === null ? null : validatePaymentMethodId(patch.paymentMethodId)
  if (patch.active !== undefined) checked.active = patch.active
  if (patch.totalMonths !== undefined) checked.totalMonths = validateTotalMonths(patch.totalMonths)
  if (patch.paymentDay !== undefined) checked.paymentDay = validatePaymentDay(patch.paymentDay)
  return checked
}

export function validateTemplateInput(input: FixedExpenseTemplateInput): FixedExpenseTemplateInput {
  return validateTemplatePatch(input) as FixedExpenseTemplateInput
}
