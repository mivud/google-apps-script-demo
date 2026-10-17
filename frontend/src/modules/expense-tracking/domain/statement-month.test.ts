import { describe, expect, it } from 'vitest'
import { currentStatementMonth, isStatementMonth, monthOfDate, resolveStatementMonth, shiftStatementMonth, validateSpentOn, validateStatementMonth } from './statement-month'

describe('statement month', () => {
  it('accepts only YYYY-MM within the supported years', () => {
    expect(isStatementMonth('2026-05')).toBe(true)
    for (const bad of ['2026-13', '2026-00', '2026-5', '1999-12', '2101-01', '2026-05-01', '']) expect(isStatementMonth(bad)).toBe(false)
    expect(() => validateStatementMonth('nope')).toThrow(expect.objectContaining({ code: 'statement_month_invalid' }))
  })

  it('rejects impossible dates', () => {
    expect(validateSpentOn('2024-02-29')).toBe('2024-02-29')
    for (const bad of ['2026-02-31', '2026-13-01', '2026-2-1', '1999-01-01']) {
      expect(() => validateSpentOn(bad)).toThrow(expect.objectContaining({ code: 'expense_date_invalid' }))
    }
  })

  it('shifts months across year boundaries', () => {
    expect(shiftStatementMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftStatementMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftStatementMonth('2026-05', 0)).toBe('2026-05')
    expect(shiftStatementMonth('2026-05', -17)).toBe('2024-12')
  })

  it('reads the month of a date and of now', () => {
    expect(monthOfDate('2026-05-09')).toBe('2026-05')
    expect(currentStatementMonth(new Date(2026, 0, 31))).toBe('2026-01')
  })

  it('uses the calendar month without a closing day', () => {
    expect(resolveStatementMonth('2026-05-31', null)).toBe('2026-05')
  })

  it('keeps spending up to the closing day and moves later spending to the next month', () => {
    expect(resolveStatementMonth('2026-05-15', 15)).toBe('2026-05')
    expect(resolveStatementMonth('2026-05-16', 15)).toBe('2026-06')
    expect(resolveStatementMonth('2026-12-20', 15)).toBe('2027-01')
  })

  it('caps the closing day to the month length', () => {
    expect(resolveStatementMonth('2026-02-28', 31)).toBe('2026-02')
    expect(resolveStatementMonth('2026-02-28', 30)).toBe('2026-02')
    expect(resolveStatementMonth('2024-02-29', 28)).toBe('2024-03')
  })
})
