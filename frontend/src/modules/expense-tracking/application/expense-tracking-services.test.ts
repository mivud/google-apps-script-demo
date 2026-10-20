import { beforeEach, describe, expect, it } from 'vitest'
import { createInMemoryRepositories } from '../testing/create-in-memory-repositories'
import { ExpenseService } from './expense-service'
import { FixedExpenseTemplateService } from './fixed-expense-template-service'
import { PaymentMethodService } from './payment-method-service'

const code = (value: string) => expect.objectContaining({ code: value })
const newMethod = { id: 'visa', name: 'Visa', active: true, statementClosingDay: 15, color: null }
const expenseInput = { description: 'Coffee', amount: 50000, paymentMethodId: 'visa', spentOn: '2026-05-10' }

let repos: ReturnType<typeof createInMemoryRepositories>
let methods: PaymentMethodService
let expenses: ExpenseService
let templates: FixedExpenseTemplateService

beforeEach(async () => {
  repos = createInMemoryRepositories()
  methods = new PaymentMethodService(repos.paymentMethods)
  expenses = new ExpenseService(repos.expenses)
  templates = new FixedExpenseTemplateService(repos.templates)
  await methods.create(newMethod)
})

describe('PaymentMethodService', () => {
  it('rejects a duplicate id, even with another name', async () => {
    await expect(methods.create({ ...newMethod, name: 'Other' })).rejects.toThrow(code('payment_method_id_taken'))
  })

  it('rejects a duplicate name ignoring case', async () => {
    await expect(methods.create({ ...newMethod, id: 'visa2', name: 'VISA' })).rejects.toThrow(code('payment_method_name_taken'))
  })

  it('validates before reaching the repository', async () => {
    await expect(methods.create({ ...newMethod, id: 'Bad Id' })).rejects.toThrow(code('payment_method_id_invalid'))
    expect(await methods.list()).toHaveLength(1)
  })

  it('refuses to remove a method used by an expense or a template', async () => {
    await expenses.create(expenseInput)
    await expect(methods.remove('visa')).rejects.toThrow(code('payment_method_in_use'))
    await methods.create({ ...newMethod, id: 'cash', name: 'Cash' })
    await templates.create({ description: 'Rent', amount: null, paymentMethodId: 'cash', active: true, totalMonths: null, paymentDay: null })
    await expect(methods.remove('cash')).rejects.toThrow(code('payment_method_in_use'))
  })

  it('removes an unused method and detects stale updates', async () => {
    const [created] = await methods.list()
    await expect(methods.update('visa', { name: 'X' }, 'stale')).rejects.toThrow(code('conflict'))
    const updated = await methods.update('visa', { name: 'Visa Gold' }, created.lastModified)
    expect(updated.name).toBe('Visa Gold')
    await methods.remove('visa')
    expect(await methods.list()).toEqual([])
  })
})

describe('ExpenseService', () => {
  it('derives the statement month from the closing day', async () => {
    expect((await expenses.create(expenseInput)).statementMonth).toBe('2026-05')
    expect((await expenses.create({ ...expenseInput, spentOn: '2026-05-16' })).statementMonth).toBe('2026-06')
  })

  it('rejects an unknown payment method and invalid input', async () => {
    await expect(expenses.create({ ...expenseInput, paymentMethodId: 'nope' })).rejects.toThrow(code('payment_method_not_found'))
    await expect(expenses.create({ ...expenseInput, amount: Number.NaN })).rejects.toThrow(code('expense_amount_required'))
    await expect(expenses.listByStatementMonth('2026-13')).rejects.toThrow(code('statement_month_invalid'))
  })

  it('lists one month in display order', async () => {
    await expenses.create({ ...expenseInput, description: 'old', spentOn: '2026-05-01' })
    await expenses.create({ ...expenseInput, description: 'new', spentOn: '2026-05-12' })
    await expenses.create({ ...expenseInput, description: 'next', spentOn: '2026-05-20' })
    const list = await expenses.listByStatementMonth('2026-05')
    expect(list.map((expense) => expense.description)).toEqual(['new', 'old'])
  })

  it('updates with optimistic concurrency', async () => {
    const created = await expenses.create(expenseInput)
    await expect(expenses.update(created.id, { amount: 1 }, 'stale')).rejects.toThrow(code('conflict'))
    const updated = await expenses.update(created.id, { amount: 1 }, created.lastModified)
    expect(updated.amount).toBe(1)
  })
})

describe('ExpenseService.setPaid', () => {
  it('marks a fixed expense paid and unpaid', async () => {
    await templates.create({ description: 'Rent', amount: 1000, paymentMethodId: 'visa', active: true, totalMonths: null, paymentDay: null })
    const [fixed] = (await expenses.generateFixed('2026-05')).created
    const paid = await expenses.setPaid(fixed.id, true)
    expect(paid.paidAt).not.toBeNull()
    expect((await expenses.setPaid(fixed.id, false)).paidAt).toBeNull()
  })

  it('refuses non-fixed expenses and unknown ids', async () => {
    const plain = await expenses.create(expenseInput)
    await expect(expenses.setPaid(plain.id, true)).rejects.toThrow(code('expense_not_fixed'))
    await expect(expenses.setPaid('missing', true)).rejects.toThrow()
  })
})

describe('generateFixed', () => {
  it('uses the payment day as the spent date, clamped to the month length', async () => {
    const base = { amount: 1, paymentMethodId: 'visa', active: true, totalMonths: null }
    await templates.create({ ...base, description: 'A', paymentDay: 15 })
    await templates.create({ ...base, description: 'B', paymentDay: 31 })
    await templates.create({ ...base, description: 'C', paymentDay: null })
    const { created } = await expenses.generateFixed('2026-02')
    const dateOf = (name: string) => created.find((e) => e.description === name)?.spentOn
    expect(dateOf('A')).toBe('2026-02-15')
    expect(dateOf('B')).toBe('2026-02-28')
    expect(dateOf('C')).toBe('2026-02-01')
  })

  it('creates one expense per active template and is idempotent per month', async () => {
    await templates.create({ description: 'Rent', amount: 1000, paymentMethodId: 'visa', active: true, totalMonths: null, paymentDay: null })
    await templates.create({ description: 'Paused', amount: 1, paymentMethodId: null, active: false, totalMonths: null, paymentDay: null })
    const first = await expenses.generateFixed('2026-05')
    expect(first.created).toHaveLength(1)
    expect(first.created[0]).toMatchObject({ isFixed: true, statementMonth: '2026-05', amount: 1000 })
    const again = await expenses.generateFixed('2026-05')
    expect(again).toMatchObject({ created: [], skipped: 1 })
    expect(await expenses.listByStatementMonth('2026-05')).toHaveLength(1)
    expect((await templates.list())[0].monthsAdded).toBe(1)
  })

  it('stops once a template reached its total months', async () => {
    await templates.create({ description: 'Loan', amount: 5, paymentMethodId: null, active: true, totalMonths: 1, paymentDay: null })
    expect((await expenses.generateFixed('2026-05')).created).toHaveLength(1)
    expect(await expenses.generateFixed('2026-06')).toMatchObject({ created: [], skipped: 1 })
  })

  it('creates pending expenses from templates without an amount', async () => {
    await templates.create({ description: 'Power', amount: null, paymentMethodId: null, active: true, totalMonths: null, paymentDay: null })
    const { created } = await expenses.generateFixed('2026-05')
    expect(created[0]).toMatchObject({ amount: null, paymentMethodId: null })
  })

  it('validates the month', async () => {
    await expect(expenses.generateFixed('May')).rejects.toThrow(code('statement_month_invalid'))
  })
})

describe('FixedExpenseTemplateService', () => {
  it('validates input and unknown payment methods', async () => {
    await expect(templates.create({ description: '', amount: null, paymentMethodId: null, active: true, totalMonths: null, paymentDay: null })).rejects.toThrow(code('expense_description_invalid'))
    await expect(templates.create({ description: 'x', amount: null, paymentMethodId: 'nope', active: true, totalMonths: null, paymentDay: null })).rejects.toThrow(code('payment_method_not_found'))
  })

  it('cannot shorten below months already added', async () => {
    const template = await templates.create({ description: 'Loan', amount: 5, paymentMethodId: null, active: true, totalMonths: 3, paymentDay: null })
    await expenses.generateFixed('2026-05')
    await expenses.generateFixed('2026-06')
    const [current] = await templates.list()
    await expect(templates.update(template.id, { totalMonths: 1 }, current.lastModified)).rejects.toThrow(code('total_months_below_added'))
  })
})
