// Thousands mask "#,###" for whole amounts (VND): digits only, comma every 3 digits, never the browser locale.
export const GROUP_SIZE = 3
export const GROUP_SEPARATOR = ','
// 12 digits stay far below Number.MAX_SAFE_INTEGER.
export const MAX_AMOUNT_DIGITS = 12

const NON_DIGITS = /\D/g
const LEADING_ZEROS = /^0+(?=\d)/

export function formatAmountDigits(digits: string): string {
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= GROUP_SIZE) groups.unshift(digits.slice(Math.max(0, end - GROUP_SIZE), end))
  return groups.join(GROUP_SEPARATOR)
}

export function formatAmount(value: number): string {
  return formatAmountDigits(String(Math.trunc(Math.abs(value))))
}

// null when no digits are left; a lone "0" stays 0.
export function parseAmountDigits(text: string): number | null {
  const digits = text.replace(NON_DIGITS, '').replace(LEADING_ZEROS, '').slice(0, MAX_AMOUNT_DIGITS)
  return digits === '' ? null : Number(digits)
}

export interface MaskedInput {
  digits: string
  // Digits left of the caret after cleaning, so the caret can be restored after separators move.
  digitsBeforeCaret: number
}

// Cleans pasted or typed text (spaces, dots, signs, currency text are dropped) and tracks the caret in digits.
export function maskInput(raw: string, caret: number): MaskedInput {
  const before = raw.slice(0, caret).replace(NON_DIGITS, '')
  const all = raw.replace(NON_DIGITS, '')
  const zerosRemoved = all.length - all.replace(LEADING_ZEROS, '').length
  const digits = all.replace(LEADING_ZEROS, '').slice(0, MAX_AMOUNT_DIGITS)
  return { digits, digitsBeforeCaret: Math.min(digits.length, Math.max(0, before.length - zerosRemoved)) }
}

// Caret index in the formatted text that sits right after `digitCount` digits.
export function caretPosition(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (formatted[index] !== GROUP_SEPARATOR) seen += 1
    if (seen === digitCount) return index + 1
  }
  return formatted.length
}
