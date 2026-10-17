import type { Expense, ExpenseInput, ExpensePatch } from '../domain/expense'

// created: expenses generated now; skipped: active templates that produced nothing (completed or already generated).
export interface GenerateFixedResult {
  created: Expense[]
  skipped: number
}

export interface ExpenseRepository {
  listByStatementMonth(month: string): Promise<Expense[]>
  create(input: ExpenseInput): Promise<Expense>
  // A stale expectedLastModified fails with ValidationError code 'conflict'.
  update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense>
  remove(id: string): Promise<void>
  // Idempotent per month: running it again for the same month creates nothing.
  generateFixed(month: string): Promise<GenerateFixedResult>
}
