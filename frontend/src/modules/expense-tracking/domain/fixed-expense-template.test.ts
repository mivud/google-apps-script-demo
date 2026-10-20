import { describe, expect, it } from 'vitest'
import { assertTotalMonthsCoverAdded, isTemplateCompleted, validateTemplateInput, validatePaymentDay, validateTemplatePatch, validateTotalMonths } from './fixed-expense-template'

const code = (value: string) => expect.objectContaining({ code: value })

describe('fixed expense template', () => {
  it('is completed only when a limit has been reached', () => {
    expect(isTemplateCompleted({ totalMonths: null, monthsAdded: 99 })).toBe(false)
    expect(isTemplateCompleted({ totalMonths: 3, monthsAdded: 2 })).toBe(false)
    expect(isTemplateCompleted({ totalMonths: 3, monthsAdded: 3 })).toBe(true)
  })

  it('validates total months', () => {
    expect(validateTotalMonths(null)).toBeNull()
    expect(validateTotalMonths(12)).toBe(12)
    for (const bad of [0, -1, 1.5]) expect(() => validateTotalMonths(bad)).toThrow(code('total_months_invalid'))
  })

  it('validates the payment day', () => {
    expect(validatePaymentDay(null)).toBeNull()
    expect(validatePaymentDay(1)).toBe(1)
    expect(validatePaymentDay(31)).toBe(31)
    for (const bad of [0, 32, -1, 1.5, Number.NaN]) expect(() => validatePaymentDay(bad)).toThrow(code('payment_day_invalid'))
    expect(() => validateTemplatePatch({ paymentDay: 40 })).toThrow(code('payment_day_invalid'))
  })

  it('refuses to shorten below the months already added', () => {
    expect(() => assertTotalMonthsCoverAdded(2, 3)).toThrow(code('total_months_below_added'))
    expect(() => assertTotalMonthsCoverAdded(3, 3)).not.toThrow()
    expect(() => assertTotalMonthsCoverAdded(null, 3)).not.toThrow()
  })

  it('allows a missing amount and payment method', () => {
    const input = { description: ' Rent ', amount: null, paymentMethodId: null, active: true, totalMonths: null, paymentDay: null }
    expect(validateTemplateInput(input)).toEqual({ ...input, description: 'Rent' })
  })

  it('validates amount and payment method when present', () => {
    expect(() => validateTemplatePatch({ amount: 0 })).toThrow(code('expense_amount_invalid'))
    expect(() => validateTemplatePatch({ paymentMethodId: ' ' })).toThrow(code('expense_payment_method_required'))
    expect(validateTemplatePatch({})).toEqual({})
  })
})
