import type { Audit } from '../../../shared/audit'
import { ValidationError } from '../../../shared/errors'

export interface PaymentMethod extends Audit {
  id: string
  name: string
  active: boolean
  // Day of month the statement closes (1-31); null means no cycle (calendar month).
  statementClosingDay: number | null
  // #rrggbb in lowercase, or null for none.
  color: string | null
}

export interface PaymentMethodInput {
  name: string
  active: boolean
  statementClosingDay: number | null
  color: string | null
}

// The id is chosen by the user on create and never changes.
export interface NewPaymentMethod extends PaymentMethodInput {
  id: string
}

export const PAYMENT_METHOD_NAME_MAX_LENGTH = 100
const COLOR_PATTERN = /^#[0-9a-f]{6}$/

// Distinct hues; the color only tints badges and dots, so any of them stays readable in light and dark mode.
export const PAYMENT_METHOD_COLOR_PRESETS = [
  // 1. Rainbow colors
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#4b0082', // Indigo
  '#a855f7', // Violet

  // 2. RGB primary colors
  '#ff0000', // Pure Red
  '#00ff00', // Pure Green (RGB)
  '#0000ff', // Pure Blue

  // 3. RGB secondary colors
  '#ffff00', // Pure Yellow
  '#00ffff', // Pure Cyan
  '#ff00ff', // Pure Magenta

  // 4. Intermediate colors
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#6366f1', // Blue-Indigo

  // 5. Extended colors
  '#ec4899', // Pink

  // 6. Neutral colors
  '#000000', // Black
  '#404040', // Dark Gray
  '#6b7280', // Gray
  '#9ca3af', // Light Gray
  '#c0c0c0', // Silver
  '#ffffff', // White

  // 7. Earth tones
  '#8b4513', // Saddle Brown
] as const

export function isPaymentMethodColor(value: string): boolean {
  return COLOR_PATTERN.test(value)
}

export function validateColor(color: string | null): string | null {
  if (color === null || color.trim() === '') return null
  const normalized = color.trim().toLowerCase()
  if (!COLOR_PATTERN.test(normalized)) throw new ValidationError('Invalid color', 'payment_method_color_invalid')
  return normalized
}

export const MIN_CLOSING_DAY = 1
export const MAX_CLOSING_DAY = 31

export function validateClosingDay(day: number | null): number | null {
  if (day === null) return null
  if (!Number.isInteger(day) || day < MIN_CLOSING_DAY || day > MAX_CLOSING_DAY) {
    throw new ValidationError('Invalid closing day', 'payment_method_closing_day_invalid')
  }
  return day
}

// The cycle starts the day after the closing day; day 31 wraps to the 1st.
export function cycleStartDay(closingDay: number): number {
  return closingDay === MAX_CLOSING_DAY ? MIN_CLOSING_DAY : closingDay + 1
}
export const PAYMENT_METHOD_ID_MAX_LENGTH = 40
const PAYMENT_METHOD_ID_PATTERN = /^[a-z0-9_-]+$/

export function validatePaymentMethodId(id: string): string {
  const trimmed = id.trim()
  if (trimmed.length > PAYMENT_METHOD_ID_MAX_LENGTH || !PAYMENT_METHOD_ID_PATTERN.test(trimmed)) {
    throw new ValidationError('Invalid payment method id', 'payment_method_id_invalid')
  }
  return trimmed
}

function validateName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > PAYMENT_METHOD_NAME_MAX_LENGTH) {
    throw new ValidationError('Invalid payment method name', 'payment_method_name_invalid')
  }
  return trimmed
}

export function validateNewPaymentMethod(input: NewPaymentMethod): NewPaymentMethod {
  return { id: validatePaymentMethodId(input.id), name: validateName(input.name), active: input.active, statementClosingDay: validateClosingDay(input.statementClosingDay), color: validateColor(input.color) }
}

export function validatePaymentMethodPatch(patch: Partial<PaymentMethodInput>): Partial<PaymentMethodInput> {
  const checked: Partial<PaymentMethodInput> = {}
  if (patch.name !== undefined) checked.name = validateName(patch.name)
  if (patch.active !== undefined) checked.active = patch.active
  if (patch.statementClosingDay !== undefined) checked.statementClosingDay = validateClosingDay(patch.statementClosingDay)
  if (patch.color !== undefined) checked.color = validateColor(patch.color)
  return checked
}
