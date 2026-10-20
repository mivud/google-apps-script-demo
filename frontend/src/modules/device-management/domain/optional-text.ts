import { ValidationError, type ValidationCode } from '../../../shared/errors'

export const NOTE_MAX_LENGTH = 2000
export const VENDOR_MAX_LENGTH = 200

// Empty or whitespace-only text means "not set" in every provider.
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function optionalText(value: string | null | undefined, maxLength: number, code: ValidationCode): string | null {
  const text = blankToNull(value)
  if (text !== null && text.length > maxLength) throw new ValidationError(`Text is longer than ${maxLength} characters`, code)
  return text
}
