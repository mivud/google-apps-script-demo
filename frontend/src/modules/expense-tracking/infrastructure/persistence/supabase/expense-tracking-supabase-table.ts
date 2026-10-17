import type { SupabaseClient } from '@supabase/supabase-js'
import { NotFoundError, ValidationError } from '../../../../../shared/errors'
import { toExpenseTrackingError } from './expense-tracking-supabase-errors'

// Shared CRUD for one table. All access goes through RLS with the anon key; nothing is trusted here.
export class SupabaseTable<Row extends { id: string }, Entity> {
  private readonly client: SupabaseClient
  private readonly table: string
  private readonly toEntity: (row: Row) => Entity
  private readonly duplicateCode: string

  constructor(client: SupabaseClient, table: string, toEntity: (row: Row) => Entity, duplicateCode = 'unknown') {
    this.client = client
    this.table = table
    this.toEntity = toEntity
    this.duplicateCode = duplicateCode
  }

  async insert(values: Record<string, unknown>): Promise<Entity> {
    const { data, error } = await this.client.from(this.table).insert(values).select('*').single()
    if (error) throw toExpenseTrackingError(error, this.duplicateCode)
    return this.toEntity(data as Row)
  }

  // The last_modified filter is the optimistic-concurrency check: zero rows means stale or missing.
  async update(id: string, values: Record<string, unknown>, expectedLastModified: string): Promise<Entity> {
    const { data, error } = await this.client
      .from(this.table)
      .update(values)
      .eq('id', id)
      .eq('last_modified', expectedLastModified)
      .select('*')
      .maybeSingle()
    if (error) throw toExpenseTrackingError(error, this.duplicateCode)
    if (data) return this.toEntity(data as Row)
    await this.assertExists(id)
    throw new ValidationError(undefined, 'conflict')
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await this.client.from(this.table).delete().eq('id', id).select('id')
    if (error) throw toExpenseTrackingError(error)
    if (!data || data.length === 0) throw new NotFoundError()
  }

  private async assertExists(id: string): Promise<void> {
    const { data, error } = await this.client.from(this.table).select('id').eq('id', id).maybeSingle()
    if (error) throw toExpenseTrackingError(error)
    if (!data) throw new NotFoundError()
  }
}
