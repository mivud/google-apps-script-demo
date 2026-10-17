import { ValidationError } from '../../../shared/errors'

// Whole VND only; the cap keeps sums far below Number.MAX_SAFE_INTEGER.
export const MAX_AMOUNT = 1_000_000_000_000

export function validateAmount(amount: number): number {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    throw new ValidationError('Invalid amount', 'expense_amount_invalid')
  }
  return amount
}

// Manual expenses need an amount; the form passes NaN for an empty field.
export function validateRequiredAmount(amount: number): number {
  if (Number.isNaN(amount)) throw new ValidationError('Amount is required', 'expense_amount_required')
  return validateAmount(amount)
}
