import { describe, expect, it } from 'vitest'
import { caretPosition, formatAmount, formatAmountDigits, maskInput, parseAmountDigits } from './amount-mask'

describe('amount mask', () => {
  it('groups digits by three with commas', () => {
    expect(formatAmountDigits('1234567')).toBe('1,234,567')
    expect(formatAmountDigits('123')).toBe('123')
    expect(formatAmount(1000)).toBe('1,000')
  })

  it('parses only digits and collapses leading zeros', () => {
    expect(parseAmountDigits('1,234 \u20ab')).toBe(1234)
    expect(parseAmountDigits('007')).toBe(7)
    expect(parseAmountDigits('0')).toBe(0)
    expect(parseAmountDigits('')).toBeNull()
    expect(parseAmountDigits('-1.5')).toBe(15)
  })

  it('caps the length at 12 digits', () => {
    expect(parseAmountDigits('1234567890123456')).toBe(123456789012)
  })

  it('tracks the caret in digits', () => {
    expect(maskInput('1,2345', 5)).toEqual({ digits: '12345', digitsBeforeCaret: 4 })
    expect(maskInput('007', 3)).toEqual({ digits: '7', digitsBeforeCaret: 1 })
  })

  it('formats edge values', () => {
    expect(formatAmountDigits('')).toBe('')
    expect(formatAmountDigits('1000000')).toBe('1,000,000')
    expect(formatAmount(-1234.9)).toBe('1,234')
    expect(formatAmount(0)).toBe('0')
  })

  it('drops pasted text that is not a digit and clamps the caret', () => {
    expect(maskInput('abc 12.5 d', 99)).toEqual({ digits: '125', digitsBeforeCaret: 3 })
    expect(maskInput('', 0)).toEqual({ digits: '', digitsBeforeCaret: 0 })
    expect(maskInput('1234567890123456', 16).digits).toHaveLength(12)
  })

  it('puts the caret at the end when asked for more digits than exist', () => {
    expect(caretPosition('12,345', 5)).toBe(6)
    expect(caretPosition('12,345', 99)).toBe(6)
  })

  it('places the caret after the given number of digits', () => {
    expect(caretPosition('12,345', 2)).toBe(2)
    expect(caretPosition('12,345', 3)).toBe(4)
    expect(caretPosition('12,345', 0)).toBe(0)
  })
})
