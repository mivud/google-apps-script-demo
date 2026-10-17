import type { SupabaseClient } from '@supabase/supabase-js'
import type { Expense, ExpenseInput, ExpensePatch } from '../../../domain/expense'
import type { ExpenseRepository, GenerateFixedResult } from '../../../application/expense-repository'
import { toExpenseTrackingError } from './expense-tracking-supabase-errors'
import { expenseToRow, rowToExpense, type ExpenseRow } from './expense-tracking-supabase-rows'
import { SupabaseTable } from './expense-tracking-supabase-table'

const TABLE = 'expenses'
const TEMPLATES_TABLE = 'fixed_expense_templates'
const GENERATE_FIXED_FUNCTION = 'generate_fixed_expenses'

export class ExpenseSupabaseRepository implements ExpenseRepository {
  private readonly client: SupabaseClient
  private readonly table: SupabaseTable<ExpenseRow, Expense>

  constructor(client: SupabaseClient) {
    this.client = client
    this.table = new SupabaseTable(client, TABLE, rowToExpense)
  }

  // Newest spending first; id breaks ties so the order is identical on every provider.
  async listByStatementMonth(statementMonth: string): Promise<Expense[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('statement_month', statementMonth)
      .order('spent_on', { ascending: false })
      .order('id')
    if (error) throw toExpenseTrackingError(error)
    return (data as ExpenseRow[]).map(rowToExpense)
  }

  create(input: ExpenseInput): Promise<Expense> {
    return this.table.insert(expenseToRow(input))
  }

  update(id: string, patch: ExpensePatch, expectedLastModified: string): Promise<Expense> {
    return this.table.update(id, expenseToRow(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.table.remove(id)
  }

  // Idempotent on the server: only the expenses created by this call are returned.
  async generateFixed(statementMonth: string): Promise<GenerateFixedResult> {
    const { data, error } = await this.client.rpc(GENERATE_FIXED_FUNCTION, { p_month: statementMonth })
    if (error) throw toExpenseTrackingError(error)
    const created = ((data ?? []) as ExpenseRow[]).map(rowToExpense)
    return { created, skipped: Math.max(0, (await this.countActiveTemplates()) - created.length) }
  }

  private async countActiveTemplates(): Promise<number> {
    const { count, error } = await this.client
      .from(TEMPLATES_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
    if (error) throw toExpenseTrackingError(error)
    return count ?? 0
  }
}
