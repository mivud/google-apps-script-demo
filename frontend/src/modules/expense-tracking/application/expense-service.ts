import type { Expense, ExpenseInput, ExpensePatch } from '../domain/expense'
import { compareExpensesForDisplay, validateExpenseInput, validateExpensePatch } from '../domain/expense'
import { validateStatementMonth } from '../domain/statement-month'
import type { ExpenseRepository, GenerateFixedResult } from './expense-repository'

// Validates input at the boundary, then delegates; rules that need data (payment method exists) live in the backend.
export class ExpenseService {
  private readonly repository: ExpenseRepository

  constructor(repository: ExpenseRepository) {
    this.repository = repository
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async listByStatementMonth(month: string): Promise<Expense[]> {
    const expenses = await this.repository.listByStatementMonth(validateStatementMonth(month))
    return [...expenses].sort(compareExpensesForDisplay)
  }

  async create(input: ExpenseInput): Promise<Expense> {
    return this.repository.create(validateExpenseInput(input))
  }

  async update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense> {
    return this.repository.update(id, validateExpensePatch(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(id)
  }

  async generateFixed(month: string): Promise<GenerateFixedResult> {
    return this.repository.generateFixed(validateStatementMonth(month))
  }
}
