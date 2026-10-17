import { describe, expect, it } from 'vitest'
import { PAYMENT_METHOD_COLOR_PRESETS, cycleStartDay, isPaymentMethodColor, validateClosingDay, validateColor, validateNewPaymentMethod, validatePaymentMethodPatch } from './payment-method'
import { validatePaymentMethodId } from './expense-description'

const code = (value: string) => expect.objectContaining({ code: value })

describe('payment method color', () => {
  it('normalizes valid colors and treats blank as none', () => {
    expect(validateColor(' #AABBCC ')).toBe('#aabbcc')
    expect(validateColor(null)).toBeNull()
    expect(validateColor('  ')).toBeNull()
  })

  it('rejects anything but #rrggbb', () => {
    for (const bad of ['red', '#abc', '#gggggg', '#12345678', 'url(x)', 'abcdef']) expect(() => validateColor(bad)).toThrow(code('payment_method_color_invalid'))
  })

  it('only accepts lowercase hex in the persisted-value check', () => {
    expect(isPaymentMethodColor('#aabbcc')).toBe(true)
    expect(isPaymentMethodColor('#AABBCC')).toBe(false)
  })

  it('has unique, valid presets', () => {
    expect(new Set(PAYMENT_METHOD_COLOR_PRESETS).size).toBe(PAYMENT_METHOD_COLOR_PRESETS.length)
    expect(PAYMENT_METHOD_COLOR_PRESETS.every(isPaymentMethodColor)).toBe(true)
  })
})

describe('closing day', () => {
  it('accepts null and 1..31', () => {
    expect(validateClosingDay(null)).toBeNull()
    expect(validateClosingDay(1)).toBe(1)
    expect(validateClosingDay(31)).toBe(31)
    for (const bad of [0, 32, 1.5, Number.NaN]) expect(() => validateClosingDay(bad)).toThrow(code('payment_method_closing_day_invalid'))
  })

  it('starts the cycle the day after, wrapping 31 to 1', () => {
    expect(cycleStartDay(15)).toBe(16)
    expect(cycleStartDay(31)).toBe(1)
  })
})

describe('payment method id and name', () => {
  it('requires a non-blank id for expenses', () => {
    expect(() => validatePaymentMethodId(' ')).toThrow(code('expense_payment_method_required'))
  })

  it('validates a new method as a whole', () => {
    const input = { id: 'visa', name: ' Visa ', active: true, statementClosingDay: 15, color: '#ABCDEF' }
    expect(validateNewPaymentMethod(input)).toEqual({ ...input, name: 'Visa', color: '#abcdef' })
    expect(() => validateNewPaymentMethod({ ...input, name: ' ' })).toThrow(code('payment_method_name_invalid'))
    expect(() => validateNewPaymentMethod({ ...input, name: 'x'.repeat(101) })).toThrow(code('payment_method_name_invalid'))
  })

  it('accepts only lowercase slugs as a new id', () => {
    const input = { id: 'x', name: 'n', active: true, statementClosingDay: null, color: null }
    expect(validateNewPaymentMethod({ ...input, id: ' visa-1_a ' }).id).toBe('visa-1_a')
    for (const bad of ['', 'Visa', 'a b', 'a'.repeat(41)]) expect(() => validateNewPaymentMethod({ ...input, id: bad })).toThrow(code('payment_method_id_invalid'))
  })

  it('validates only patched fields', () => {
    expect(validatePaymentMethodPatch({})).toEqual({})
    expect(validatePaymentMethodPatch({ color: null, statementClosingDay: null })).toEqual({ color: null, statementClosingDay: null })
    expect(() => validatePaymentMethodPatch({ color: 'bad' })).toThrow(code('payment_method_color_invalid'))
  })
})
