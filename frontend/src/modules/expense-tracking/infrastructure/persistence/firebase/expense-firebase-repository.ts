import { where } from 'firebase/firestore'
import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, descending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { ExpenseRepository, GenerateFixedResult } from '../../../application/expense-repository'
import type { Expense, ExpenseInput, ExpensePatch } from '../../../domain/expense'
import { expensePatchToRow, rowToExpense, toGenerateFixedResult, type ExpenseRow } from '../expense-rows'
import { EXPENSE_ACTIONS, EXPENSE_COLLECTIONS } from './firebase-api-actions'

export class ExpenseFirebaseRepository implements ExpenseRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  // Newest spending first; id breaks ties so the order is identical on every provider.
  async listByStatementMonth(month: string): Promise<Expense[]> {
    const rows = await this.caller.rows(EXPENSE_COLLECTIONS.expenses, where('statement_month', '==', month))
    return sortRows(rows, descending('spent_on'), ascending('id')).map((row) => rowToExpense(row as unknown as ExpenseRow))
  }

  async create(input: ExpenseInput): Promise<Expense> {
    return rowToExpense(await this.caller.call<ExpenseRow>(EXPENSE_ACTIONS.create, expensePatchToRow(input)))
  }

  async update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense> {
    const payload = { id, ...expensePatchToRow(patch), expected_last_modified: expectedLastModified }
    return rowToExpense(await this.caller.call<ExpenseRow>(EXPENSE_ACTIONS.update, payload))
  }

  async setPaid(id: string, paid: boolean): Promise<Expense> {
    const action = paid ? EXPENSE_ACTIONS.markPaid : EXPENSE_ACTIONS.markUnpaid
    return rowToExpense(await this.caller.call<ExpenseRow>(action, { id }))
  }

  async remove(id: string): Promise<void> {
    await this.caller.call<unknown>(EXPENSE_ACTIONS.remove, { id })
  }

  async generateFixed(month: string): Promise<GenerateFixedResult> {
    return toGenerateFixedResult(await this.caller.call<{ items?: unknown; skipped?: unknown }>(EXPENSE_ACTIONS.generateFixed, { statement_month: month }))
  }
}
