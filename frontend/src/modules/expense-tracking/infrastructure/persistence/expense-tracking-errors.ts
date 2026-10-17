import { NotFoundError, ValidationError, type ValidationCode } from '../../../../shared/errors'
import { toSharedApiError, type ApiFailure } from '../../../../shared/api/apps-script-api'

// Stable codes the backend raises on both providers (Apps Script error.message / Postgres exception message).
const EXPENSE_TRACKING_CODES: readonly ValidationCode[] = [
  'expense_description_invalid',
  'expense_amount_invalid',
  'expense_amount_required',
  'expense_date_invalid',
  'statement_month_invalid',
  'expense_payment_method_required',
  'payment_method_not_found',
  'payment_method_name_invalid',
  'payment_method_name_taken',
  'payment_method_id_invalid',
  'payment_method_id_taken',
  'payment_method_color_invalid',
  'payment_method_closing_day_invalid',
  'payment_method_in_use',
  'total_months_invalid',
  'total_months_below_added',
  'conflict',
]

// Postgres wraps messages, so match a code as a whole word (never inside a longer identifier).
export function findExpenseTrackingCode(message: string): ValidationCode | null {
  const text = message.trim().toLowerCase()
  return EXPENSE_TRACKING_CODES.find((code) => new RegExp(`(?<![a-z0-9_])${code}(?![a-z0-9_])`).test(text)) ?? null
}

export function toExpenseTrackingError(failure: ApiFailure): Error {
  switch (failure.error.code) {
    case 'NOT_FOUND':
      return new NotFoundError()
    case 'VALIDATION':
      return new ValidationError(undefined, findExpenseTrackingCode(failure.error.message) ?? 'unknown')
    default:
      return toSharedApiError(failure)
  }
}
