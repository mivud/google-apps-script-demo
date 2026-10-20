import { ValidationError } from '../../../shared/errors'
import type { ExpenseRepository, GenerateFixedResult } from '../application/expense-repository'
import type { Expense, ExpenseInput, ExpensePatch } from '../domain/expense'
import { resolveStatementMonth } from '../domain/statement-month'
import { isTemplateCompleted } from '../domain/fixed-expense-template'
import { findOrThrow, type InMemoryExpenseTrackingStore } from './in-memory-store'

// Payment day capped to the month length; the 1st when the template has none (mirrors generate_fixed_expenses).
function dueDate(month: string, paymentDay: number | null): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return `${month}-${String(Math.min(paymentDay ?? 1, lastDay)).padStart(2, '0')}`
}

// Test double mirroring the backend rules, including generateFixed: one expense per eligible template, once per month.
export class InMemoryExpenseRepository implements ExpenseRepository {
  private readonly store: InMemoryExpenseTrackingStore

  constructor(store: InMemoryExpenseTrackingStore) {
    this.store = store
  }

  async listByStatementMonth(month: string): Promise<Expense[]> {
    return this.store.expenses.filter((expense) => expense.statementMonth === month).map((expense) => ({ ...expense }))
  }

  async create(input: ExpenseInput): Promise<Expense> {
    const method = this.store.paymentMethods.find((candidate) => candidate.id === input.paymentMethodId)
    if (!method) throw new ValidationError(undefined, 'payment_method_not_found')
    const statementMonth = input.statementMonth ?? resolveStatementMonth(input.spentOn, method.statementClosingDay)
    return this.add({ ...input, statementMonth, isFixed: false, templateId: null, paidAt: null })
  }

  async update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense> {
    const expense = findOrThrow(this.store.expenses, id)
    if (expense.lastModified !== expectedLastModified) throw new ValidationError(undefined, 'conflict')
    if (patch.paymentMethodId !== undefined) this.assertMethodExists(patch.paymentMethodId)
    Object.assign(expense, patch)
    this.store.touch(expense)
    return { ...expense }
  }

  async setPaid(id: string, paid: boolean): Promise<Expense> {
    const expense = findOrThrow(this.store.expenses, id)
    if (!expense.isFixed) throw new ValidationError(undefined, 'expense_not_fixed')
    expense.paidAt = paid ? new Date().toISOString() : null
    this.store.touch(expense)
    return { ...expense }
  }

  async remove(id: string): Promise<void> {
    const expense = findOrThrow(this.store.expenses, id)
    this.store.expenses.splice(this.store.expenses.indexOf(expense), 1)
  }

  async generateFixed(month: string): Promise<GenerateFixedResult> {
    const created: Expense[] = []
    let skipped = 0
    for (const template of this.store.templates.filter((candidate) => candidate.active)) {
      const alreadyThere = this.store.expenses.some((e) => e.templateId === template.id && e.statementMonth === month)
      if (alreadyThere || isTemplateCompleted(template)) {
        skipped += 1
        continue
      }
      created.push(this.add({
        description: template.description,
        amount: template.amount,
        paymentMethodId: template.paymentMethodId,
        spentOn: dueDate(month, template.paymentDay),
        statementMonth: month,
        isFixed: true,
        templateId: template.id,
        paidAt: null,
      }))
      template.monthsAdded += 1
      this.store.touch(template)
    }
    return { created, skipped }
  }

  private add(fields: Omit<Expense, 'id' | 'created' | 'createdBy' | 'lastModified' | 'lastModifiedBy'>): Expense {
    const expense: Expense = { id: this.store.nextId('expense'), ...fields, ...this.store.newAudit() }
    this.store.expenses.push(expense)
    return { ...expense }
  }

  private assertMethodExists(paymentMethodId: string): void {
    if (!this.store.paymentMethods.some((method) => method.id === paymentMethodId)) {
      throw new ValidationError(undefined, 'payment_method_not_found')
    }
  }
}
