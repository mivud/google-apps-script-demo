import { describe, expect, it } from 'vitest'
import { NetworkError } from '../../../../shared/errors'
import { expensePatchToRow, rowToExpense, rowsToExpenses, toGenerateFixedResult, toNonNegativeInteger, toNullableInteger, type ExpenseRow } from './expense-rows'
import { rowToTemplate, templatePatchToRow, type FixedExpenseTemplateRow } from './fixed-expense-template-rows'
import { paymentMethodPatchToRow, rowToPaymentMethod, rowsToPaymentMethods } from './payment-method-rows'

const audit = { created: 'c', created_by: 'u', last_modified: 'm', last_modified_by: 'v' }
const expenseRow: ExpenseRow = { id: 'e1', description: 'Coffee', amount: '50000', payment_method_id: 'cash', spent_on: '2026-05-10', statement_month: '2026-05', is_fixed: false, template_id: '', ...audit }

describe('integer parsing', () => {
  it('accepts numbers and numeric strings', () => {
    expect(toNonNegativeInteger('12')).toBe(12)
    expect(toNonNegativeInteger(0)).toBe(0)
    expect(toNullableInteger('')).toBeNull()
    expect(toNullableInteger(null)).toBeNull()
    expect(toNullableInteger(undefined)).toBeNull()
  })

  it('rejects malformed values', () => {
    for (const bad of [-1, 1.5, 'abc', ' ', {}, Number.NaN]) expect(() => toNonNegativeInteger(bad)).toThrow(NetworkError)
  })
})

describe('expense rows', () => {
  it('maps a row to an expense', () => {
    expect(rowToExpense(expenseRow)).toEqual({ id: 'e1', description: 'Coffee', amount: 50000, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: false, templateId: null, paidAt: null, created: 'c', createdBy: 'u', lastModified: 'm', lastModifiedBy: 'v' })
  })

  it('maps empty amount and payment method to null', () => {
    const expense = rowToExpense({ ...expenseRow, amount: '', payment_method_id: null, template_id: 't1', is_fixed: true })
    expect(expense).toMatchObject({ amount: null, paymentMethodId: null, templateId: 't1', isFixed: true })
  })

  it('maps paid_at, treating empty as unpaid', () => {
    expect(rowToExpense({ ...expenseRow, paid_at: '2026-05-11T00:00:00Z' }).paidAt).toBe('2026-05-11T00:00:00Z')
    expect(rowToExpense({ ...expenseRow, paid_at: '' }).paidAt).toBeNull()
    expect(rowToExpense({ ...expenseRow, paid_at: null }).paidAt).toBeNull()
  })

  it('rejects malformed rows', () => {
    expect(() => rowToExpense({ ...expenseRow, spent_on: 'x' })).toThrow(NetworkError)
    expect(() => rowToExpense({ ...expenseRow, statement_month: '2026-13' })).toThrow(NetworkError)
    expect(() => rowToExpense(null as unknown as ExpenseRow)).toThrow(NetworkError)
    expect(() => rowToExpense({ ...expenseRow, amount: 'abc' })).toThrow(NetworkError)
    expect(() => rowsToExpenses({})).toThrow(NetworkError)
    expect(() => rowsToExpenses(null)).toThrow(NetworkError)
  })

  it('sends only patched fields in snake_case', () => {
    expect(expensePatchToRow({})).toEqual({})
    expect(expensePatchToRow({ paymentMethodId: 'x', spentOn: '2026-05-01', statementMonth: '2026-05' })).toEqual({ payment_method_id: 'x', spent_on: '2026-05-01', statement_month: '2026-05' })
  })

  it('maps the generate result and defaults skipped to 0', () => {
    expect(toGenerateFixedResult({ items: [expenseRow], skipped: '2' })).toMatchObject({ skipped: 2, created: [{ id: 'e1' }] })
    expect(toGenerateFixedResult({})).toEqual({ created: [], skipped: 0 })
    expect(() => toGenerateFixedResult(null)).toThrow(NetworkError)
  })
})

describe('template rows', () => {
  const row: FixedExpenseTemplateRow = { id: 't1', description: 'Rent', amount: null, payment_method_id: '', active: true, total_months: '12', months_added: '3', ...audit }

  it('maps a row to a template', () => {
    expect(rowToTemplate(row)).toMatchObject({ id: 't1', amount: null, paymentMethodId: null, active: true, totalMonths: 12, monthsAdded: 3 })
    expect(rowToTemplate({ ...row, total_months: null })).toMatchObject({ totalMonths: null })
  })

  it('rejects malformed rows', () => {
    expect(() => rowToTemplate({ ...row, months_added: 'x' })).toThrow(NetworkError)
    expect(() => rowToTemplate({ ...row, id: 1 as unknown as string })).toThrow(NetworkError)
  })

  it('maps payment_day, treating empty as no day', () => {
    expect(rowToTemplate({ ...row, payment_day: '15' }).paymentDay).toBe(15)
    expect(rowToTemplate({ ...row, payment_day: '' }).paymentDay).toBeNull()
    expect(rowToTemplate(row).paymentDay).toBeNull()
    expect(templatePatchToRow({ paymentDay: 5 })).toEqual({ payment_day: 5 })
    expect(templatePatchToRow({ paymentDay: null })).toEqual({ payment_day: null })
  })

  it('never sends months_added', () => {
    expect(templatePatchToRow({ totalMonths: null, active: false })).toEqual({ total_months: null, active: false })
  })
})

describe('payment method rows', () => {
  const row = { id: 'visa', name: 'Visa', active: true, statement_closing_day: '15', color: '#abcdef', ...audit }

  it('maps a row and parses the closing day', () => {
    expect(rowToPaymentMethod(row)).toMatchObject({ id: 'visa', statementClosingDay: 15, color: '#abcdef' })
  })

  it('drops an unsafe or missing color instead of passing it to CSS', () => {
    expect(rowToPaymentMethod({ ...row, color: 'red; background:url(x)' }).color).toBeNull()
    expect(rowToPaymentMethod({ ...row, color: '#ABCDEF' }).color).toBeNull()
    expect(rowToPaymentMethod({ ...row, color: undefined }).color).toBeNull()
  })

  it('rejects malformed rows', () => {
    expect(() => rowToPaymentMethod({ ...row, name: 5 as unknown as string })).toThrow(NetworkError)
    expect(() => rowsToPaymentMethods({ items: 'x' })).toThrow(NetworkError)
  })

  it('sends only patched fields', () => {
    expect(paymentMethodPatchToRow({ statementClosingDay: null, color: '#000000' })).toEqual({ statement_closing_day: null, color: '#000000' })
  })
})
