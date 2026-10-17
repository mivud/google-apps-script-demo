import { ValidationError } from '../../../shared/errors'

export const DESCRIPTION_MAX_LENGTH = 200

// Shared by expenses and fixed expense templates: same wording, same rule.
export function validateDescription(description: string): string {
  const trimmed = description.trim()
  if (trimmed.length === 0 || trimmed.length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError('Invalid description', 'expense_description_invalid')
  }
  return trimmed
}

export function validatePaymentMethodId(id: string): string {
  if (id.trim().length === 0) throw new ValidationError('Payment method is required', 'expense_payment_method_required')
  return id
}
