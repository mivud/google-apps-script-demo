import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FixedExpenseTemplate,
  FixedExpenseTemplateInput,
  FixedExpenseTemplatePatch,
} from '../../../domain/fixed-expense-template'
import type { FixedExpenseTemplateRepository } from '../../../application/fixed-expense-template-repository'
import { toExpenseTrackingError } from './expense-tracking-supabase-errors'
import { rowToTemplate, templateToRow, type FixedExpenseTemplateRow } from './expense-tracking-supabase-rows'
import { SupabaseTable } from './expense-tracking-supabase-table'

const TABLE = 'fixed_expense_templates'

export class FixedExpenseTemplateSupabaseRepository implements FixedExpenseTemplateRepository {
  private readonly client: SupabaseClient
  private readonly table: SupabaseTable<FixedExpenseTemplateRow, FixedExpenseTemplate>

  constructor(client: SupabaseClient) {
    this.client = client
    this.table = new SupabaseTable(client, TABLE, rowToTemplate)
  }

  async list(): Promise<FixedExpenseTemplate[]> {
    const { data, error } = await this.client.from(TABLE).select('*').order('description')
    if (error) throw toExpenseTrackingError(error)
    return (data as FixedExpenseTemplateRow[]).map(rowToTemplate)
  }

  create(input: FixedExpenseTemplateInput): Promise<FixedExpenseTemplate> {
    return this.table.insert(templateToRow(input))
  }

  // months_added is never sent: the server owns it.
  update(id: string, patch: FixedExpenseTemplatePatch, expectedLastModified: string): Promise<FixedExpenseTemplate> {
    return this.table.update(id, templateToRow(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.table.remove(id)
  }
}
