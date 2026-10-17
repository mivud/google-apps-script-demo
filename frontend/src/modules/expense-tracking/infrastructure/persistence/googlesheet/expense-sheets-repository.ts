import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import type { ExpenseRepository, GenerateFixedResult } from '../../../application/expense-repository'
import type { Expense, ExpenseInput, ExpensePatch } from '../../../domain/expense'
import { expensePatchToRow, rowsToExpenses, rowToExpense, toGenerateFixedResult, type ExpenseRow } from '../expense-rows'
import { EXPENSE_ACTIONS } from './api-actions'

export class ExpenseSheetsRepository implements ExpenseRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async listByStatementMonth(month: string): Promise<Expense[]> {
    return rowsToExpenses(await this.caller.call<{ items: unknown }>(EXPENSE_ACTIONS.list, { statement_month: month }))
  }

  async create(input: ExpenseInput): Promise<Expense> {
    return rowToExpense(await this.caller.call<ExpenseRow>(EXPENSE_ACTIONS.create, expensePatchToRow(input)))
  }

  async update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense> {
    const payload = { id, ...expensePatchToRow(patch), expected_last_modified: expectedLastModified }
    return rowToExpense(await this.caller.call<ExpenseRow>(EXPENSE_ACTIONS.update, payload))
  }

  async remove(id: string): Promise<void> {
    await this.caller.call<unknown>(EXPENSE_ACTIONS.remove, { id })
  }

  async generateFixed(month: string): Promise<GenerateFixedResult> {
    return toGenerateFixedResult(await this.caller.call<{ items?: unknown; skipped?: unknown }>(EXPENSE_ACTIONS.generateFixed, { statement_month: month }))
  }
}
