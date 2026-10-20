import { describe, expect, it, vi } from 'vitest'
import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import { EXPENSE_ACTIONS, FIXED_TEMPLATE_ACTIONS, PAYMENT_METHOD_ACTIONS } from './api-actions'
import { ExpenseSheetsRepository } from './expense-sheets-repository'
import { FixedExpenseTemplateSheetsRepository } from './fixed-expense-template-sheets-repository'
import { PaymentMethodSheetsRepository } from './payment-method-sheets-repository'

const audit = { created: 'c', created_by: 'u', last_modified: 'm', last_modified_by: 'v' }
const expenseRow = { id: 'e1', description: 'Coffee', amount: 5, payment_method_id: 'cash', spent_on: '2026-05-10', statement_month: '2026-05', is_fixed: false, template_id: null, ...audit }

function mockCaller(result: unknown) {
  const call = vi.fn().mockResolvedValue(result)
  return { call, caller: { call } as unknown as SheetsCaller }
}

describe('api actions', () => {
  it('are namespaced by module and entity', () => {
    const all = [...Object.values(EXPENSE_ACTIONS), ...Object.values(PAYMENT_METHOD_ACTIONS), ...Object.values(FIXED_TEMPLATE_ACTIONS)]
    expect(all.every((action) => /^expense-tracking\.[a-zA-Z]+\.[a-zA-Z]+$/.test(action))).toBe(true)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('ExpenseSheetsRepository', () => {
  it('lists by statement month', async () => {
    const { call, caller } = mockCaller({ items: [expenseRow] })
    const list = await new ExpenseSheetsRepository(caller).listByStatementMonth('2026-05')
    expect(call).toHaveBeenCalledWith(EXPENSE_ACTIONS.list, { statement_month: '2026-05' })
    expect(list[0].id).toBe('e1')
  })

  it('sends the concurrency token on update', async () => {
    const { call, caller } = mockCaller(expenseRow)
    await new ExpenseSheetsRepository(caller).update('e1', { amount: 5 }, 'tok')
    expect(call).toHaveBeenCalledWith(EXPENSE_ACTIONS.update, { id: 'e1', amount: 5, expected_last_modified: 'tok' })
  })

  it('maps create, remove and generateFixed', async () => {
    const { call, caller } = mockCaller({ items: [expenseRow], skipped: 1 })
    const repository = new ExpenseSheetsRepository(caller)
    expect(await repository.generateFixed('2026-05')).toMatchObject({ skipped: 1, created: [{ id: 'e1' }] })
    expect(call).toHaveBeenLastCalledWith(EXPENSE_ACTIONS.generateFixed, { statement_month: '2026-05' })
    await repository.remove('e1')
    expect(call).toHaveBeenLastCalledWith(EXPENSE_ACTIONS.remove, { id: 'e1' })
    call.mockResolvedValueOnce(expenseRow)
    await repository.create({ description: 'Coffee', amount: 5, paymentMethodId: 'cash', spentOn: '2026-05-10' })
    expect(call).toHaveBeenLastCalledWith(EXPENSE_ACTIONS.create, { description: 'Coffee', amount: 5, payment_method_id: 'cash', spent_on: '2026-05-10' })
  })

  it('calls markPaid or markUnpaid by the paid flag', async () => {
    const { call, caller } = mockCaller({ ...expenseRow, is_fixed: true, paid_at: '2026-05-11T00:00:00Z' })
    const repository = new ExpenseSheetsRepository(caller)
    const paid = await repository.setPaid('e1', true)
    expect(call).toHaveBeenLastCalledWith(EXPENSE_ACTIONS.markPaid, { id: 'e1' })
    expect(paid.paidAt).toBe('2026-05-11T00:00:00Z')
    call.mockResolvedValueOnce({ ...expenseRow, is_fixed: true, paid_at: null })
    expect((await repository.setPaid('e1', false)).paidAt).toBeNull()
    expect(call).toHaveBeenLastCalledWith(EXPENSE_ACTIONS.markUnpaid, { id: 'e1' })
  })

  it('propagates caller failures', async () => {
    const call = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(new ExpenseSheetsRepository({ call } as unknown as SheetsCaller).remove('x')).rejects.toThrow('boom')
  })
})

describe('PaymentMethodSheetsRepository', () => {
  it('sends the id and fields on create', async () => {
    const { call, caller } = mockCaller({ id: 'visa', name: 'Visa', active: true, statement_closing_day: 15, color: null, ...audit })
    const created = await new PaymentMethodSheetsRepository(caller).create({ id: 'visa', name: 'Visa', active: true, statementClosingDay: 15, color: null })
    expect(call).toHaveBeenCalledWith(PAYMENT_METHOD_ACTIONS.create, { id: 'visa', name: 'Visa', active: true, statement_closing_day: 15, color: null })
    expect(created.statementClosingDay).toBe(15)
  })

  it('lists and removes', async () => {
    const { call, caller } = mockCaller({ items: [] })
    const repository = new PaymentMethodSheetsRepository(caller)
    expect(await repository.list()).toEqual([])
    await repository.remove('visa')
    expect(call).toHaveBeenLastCalledWith(PAYMENT_METHOD_ACTIONS.remove, { id: 'visa' })
  })
})

describe('FixedExpenseTemplateSheetsRepository', () => {
  const row = { id: 't1', description: 'Rent', amount: null, payment_method_id: null, active: true, total_months: null, months_added: 0, ...audit }

  it('creates and updates with snake_case payloads', async () => {
    const { call, caller } = mockCaller(row)
    const repository = new FixedExpenseTemplateSheetsRepository(caller)
    await repository.create({ description: 'Rent', amount: null, paymentMethodId: null, active: true, totalMonths: null, paymentDay: null })
    expect(call).toHaveBeenLastCalledWith(FIXED_TEMPLATE_ACTIONS.create, { description: 'Rent', amount: null, payment_method_id: null, active: true, total_months: null, payment_day: null })
    await repository.update('t1', { active: false }, 'tok')
    expect(call).toHaveBeenLastCalledWith(FIXED_TEMPLATE_ACTIONS.update, { id: 't1', active: false, expected_last_modified: 'tok' })
  })
})
