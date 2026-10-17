import { describe, expect, it } from 'vitest'
import { compareExpensesForDisplay, validateExpenseInput, validateExpensePatch, type Expense } from './expense'
import { MAX_AMOUNT, validateAmount, validateRequiredAmount } from './amount'

const base: Expense = { id: 'a', description: 'd', amount: 1, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: false, templateId: null, created: '2026-05-10T00:00:00.000+00:00', createdBy: 'u', lastModified: '', lastModifiedBy: '' }
const make = (over: Partial<Expense>): Expense => ({ ...base, ...over })
const order = (list: Expense[]) => [...list].sort(compareExpensesForDisplay).map((e) => e.id)
const code = (value: string) => expect.objectContaining({ code: value })

describe('amount', () => {
  it('accepts whole positive amounts up to the cap', () => {
    expect(validateAmount(1)).toBe(1)
    expect(validateAmount(MAX_AMOUNT)).toBe(MAX_AMOUNT)
    for (const bad of [0, -5, 1.5, MAX_AMOUNT + 1, Number.NaN]) expect(() => validateAmount(bad)).toThrow(code('expense_amount_invalid'))
  })

  it('reports an empty field as required', () => {
    expect(() => validateRequiredAmount(Number.NaN)).toThrow(code('expense_amount_required'))
  })
})

describe('expense validation', () => {
  const input = { description: '  Coffee ', amount: 50000, paymentMethodId: 'cash', spentOn: '2026-05-10' }

  it('trims the description and validates every field', () => {
    expect(validateExpenseInput(input).description).toBe('Coffee')
    expect(() => validateExpenseInput({ ...input, description: ' ' })).toThrow(code('expense_description_invalid'))
    expect(() => validateExpenseInput({ ...input, paymentMethodId: ' ' })).toThrow(code('expense_payment_method_required'))
    expect(() => validateExpenseInput({ ...input, spentOn: '2026-02-30' })).toThrow(code('expense_date_invalid'))
    expect(() => validateExpenseInput({ ...input, statementMonth: '2026-99' })).toThrow(code('statement_month_invalid'))
  })

  it('checks only the fields present in a patch', () => {
    expect(validateExpensePatch({})).toEqual({})
    expect(validateExpensePatch({ amount: 5 })).toEqual({ amount: 5 })
  })
})

describe('compareExpensesForDisplay', () => {
  it('puts fixed expenses first', () => {
    expect(order([make({ id: 'v' }), make({ id: 'f', isFixed: true, spentOn: '2020-01-01' })])).toEqual(['f', 'v'])
  })

  it('sorts newest payment date first, malformed dates last', () => {
    const list = [make({ id: 'old', spentOn: '2026-05-01' }), make({ id: 'bad', spentOn: '' }), make({ id: 'new', spentOn: '2026-05-20' })]
    expect(order(list)).toEqual(['new', 'old', 'bad'])
  })

  it('breaks ties by newest creation, then id', () => {
    const list = [make({ id: 'b', created: '2026-01-01' }), make({ id: 'a', created: '2026-01-01' }), make({ id: 'c', created: '2026-02-01' })]
    expect(order(list)).toEqual(['c', 'a', 'b'])
  })
})
