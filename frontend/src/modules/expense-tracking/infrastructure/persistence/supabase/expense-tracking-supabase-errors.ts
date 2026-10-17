import type { PostgrestError } from '@supabase/supabase-js'
import { toSupabaseIdentityError } from '../../../../../shared/api/identity-errors'
import { ValidationError, type ValidationCode } from '../../../../../shared/errors'

// Stable codes raised by 008_expense_tracking.sql as the exception message.
const EXPENSE_TRACKING_CODES = ['payment_method_in_use', 'payment_method_id_invalid', 'expense_amount_required', 'expense_payment_method_required', 'payment_method_closing_day_invalid', 'payment_method_color_invalid', 'total_months_below_added', 'statement_month_invalid'] as const

const FOREIGN_KEY_VIOLATION = '23503'
const UNIQUE_VIOLATION = '23505'
const STILL_REFERENCED = 'is still referenced'
const PAYMENT_METHOD_PKEY = 'payment_methods_pkey'

// Codes are matched as whole words so a longer identifier never matches by accident.
function findCode(message: string): string | null {
  const text = message.trim().toLowerCase()
  return EXPENSE_TRACKING_CODES.find((code) => new RegExp(`(?<![a-z0-9_])${code}(?![a-z0-9_])`).test(text)) ?? null
}

export function toExpenseTrackingError(error: PostgrestError, duplicateCode: string = 'unknown'): Error {
  const raised = findCode(error.message)
  if (raised) return new ValidationError(undefined, raised as ValidationCode)
  if (error.code === FOREIGN_KEY_VIOLATION) return new ValidationError(undefined, foreignKeyCode(error.message))
  if (error.code === UNIQUE_VIOLATION && error.message.includes(PAYMENT_METHOD_PKEY)) {
    return new ValidationError(undefined, 'payment_method_id_taken' as ValidationCode)
  }
  return toSupabaseIdentityError(error, duplicateCode as ValidationCode)
}

// "still referenced" is a restricted delete; "not present" is an insert/update pointing at a missing payment method.
function foreignKeyCode(message: string): ValidationCode {
  const code = message.includes(STILL_REFERENCED) ? 'payment_method_in_use' : 'payment_method_not_found'
  return code as ValidationCode
}
