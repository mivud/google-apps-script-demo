import type { SupabaseClient } from '@supabase/supabase-js'
import type { Page } from '../../../../../shared/page'
import type { DataService } from '../../../application/data-service'
import type { EquipmentQuery } from '../../../application/equipment-repository'
import type { Category, NewCategory } from '../../../domain/category'
import type { Equipment, NewEquipment } from '../../../domain/equipment'
import { AuthError, ForbiddenError, NetworkError, NotFoundError, ValidationError, type ValidationCode } from '../../../../../shared/errors'
import type { MaintenanceLog, NewMaintenanceLog } from '../../../domain/maintenance'
import {
  categoryInputToRow,
  equipmentPatchToRow,
  maintenanceInputToRow,
  rowToCategory,
  rowToEquipment,
  rowToMaintenanceLog,
} from '../row-mappers'
import type { CategoryRow, EquipmentRow, MaintenanceLogRow } from '../row-types'
import { blankRefsToNull } from './blank-refs-to-null'

interface SupabaseError {
  code?: string
  message: string
}

// Postgres codes: 22P02 bad input, 23502 not null, 23503 FK, 23514 check constraint.
const VALIDATION_CODES = new Set(['22P02', '23502', '23503', '23514'])

// Database triggers raise these codes as the exception message (same codes the Sheets backend returns).
const RAISED_CATEGORY_CODES: ValidationCode[] = [
  'category_name_required',
  'category_name_duplicate',
  'category_cycle',
  'category_in_use',
  'category_has_children',
  'purchase_date_invalid',
  'warranty_months_invalid',
  'warranty_requires_purchase_date',
  'note_too_long',
  'vendor_too_long',
]

function toDomainError(error: SupabaseError): Error {
  const raised = RAISED_CATEGORY_CODES.find((code) => error.message.includes(code))
  if (raised) return new ValidationError(error.message, raised)
  // 42501 = RLS/privilege denial; PGRST301 = missing or expired JWT.
  if (error.code === '42501') return new ForbiddenError(error.message)
  if (error.code === 'PGRST301') return new AuthError(error.message)
  if (error.code === 'PGRST116') return new NotFoundError(error.message)
  if (error.code === '23505') return new ValidationError(error.message, 'category_name_duplicate')
  if (error.code === '23503') {
    // Deleting a referenced row: the message names the referencing table. Otherwise a parent/category id does not exist.
    if (error.message.includes('update or delete')) {
      const inUse = error.message.includes('on table "equipment"')
      return new ValidationError(error.message, inUse ? 'category_in_use' : 'category_has_children')
    }
    return new NotFoundError(error.message)
  }
  if (error.code && VALIDATION_CODES.has(error.code)) return new ValidationError(error.message)
  return new NetworkError()
}

// Commas and parentheses would break the PostgREST `or` filter syntax; % and _ are ilike wildcards.
function sanitizeSearch(term: string): string {
  return term.replace(/[,()%_\\]/g, ' ').trim()
}

export class SupabaseAdapter implements DataService {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // Supabase is called straight from the browser, so there is no separate backend version.
  async getBackendVersion(): Promise<string | null> {
    return null
  }

  async list(query: EquipmentQuery): Promise<Page<Equipment>> {
    const from = (query.page - 1) * query.pageSize
    let request = this.client
      .from('equipment')
      .select('*', { count: 'exact' })
      .order('modified_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + query.pageSize - 1)

    if (query.categoryIds && query.categoryIds.length > 0) request = request.in('category_id', query.categoryIds)
    if (query.status) request = request.eq('status', query.status)
    const search = query.search ? sanitizeSearch(query.search) : ''
    if (search) request = request.or(`name.ilike.%${search}%,description.ilike.%${search}%`)

    const { data, count, error } = await request
    if (error) throw toDomainError(error)
    return {
      items: (data as EquipmentRow[]).map(rowToEquipment),
      total: count ?? 0,
      page: query.page,
      pageSize: query.pageSize,
    }
  }

  async get(id: string): Promise<Equipment | null> {
    const { data, error } = await this.client.from('equipment').select('*').eq('id', id).maybeSingle()
    if (error) throw toDomainError(error)
    return data ? rowToEquipment(data as EquipmentRow) : null
  }

  async create(input: NewEquipment): Promise<Equipment> {
    const { data, error } = await this.client
      .from('equipment')
      .insert(blankRefsToNull(equipmentPatchToRow(input)))
      .select()
      .single()
    if (error) throw toDomainError(error)
    return rowToEquipment(data as EquipmentRow)
  }

  async update(id: string, patch: Partial<NewEquipment>): Promise<Equipment> {
    const { data, error } = await this.client
      .from('equipment')
      .update(blankRefsToNull(equipmentPatchToRow(patch)))
      .eq('id', id)
      .select()
      .single()
    if (error) throw toDomainError(error)
    return rowToEquipment(data as EquipmentRow)
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await this.client.from('equipment').delete().eq('id', id).select('id')
    if (error) throw toDomainError(error)
    if (!data || data.length === 0) throw new NotFoundError(`Equipment ${id} not found`)
  }

  async listCategories(): Promise<Category[]> {
    const { data, error } = await this.client.from('categories').select('*')
    if (error) throw toDomainError(error)
    // Sorted here because Postgres collation order may differ from the case-insensitive order the Sheets backend uses.
    const key = (row: CategoryRow) => row.name.toLowerCase()
    return (data as CategoryRow[])
      .sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : a.id < b.id ? -1 : 1))
      .map(rowToCategory)
  }

  async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await this.client.from('categories').select('*').eq('id', id).maybeSingle()
    if (error) throw toDomainError(error)
    return data ? rowToCategory(data as CategoryRow) : null
  }

  async createCategory(input: NewCategory): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .insert(blankRefsToNull(categoryInputToRow(input)))
      .select()
      .single()
    if (error) throw toDomainError(error)
    return rowToCategory(data as CategoryRow)
  }

  async updateCategory(id: string, patch: Partial<NewCategory>): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .update(blankRefsToNull(categoryInputToRow(patch)))
      .eq('id', id)
      .select()
      .single()
    if (error) throw toDomainError(error)
    return rowToCategory(data as CategoryRow)
  }

  async removeCategory(id: string): Promise<void> {
    const { data, error } = await this.client.from('categories').delete().eq('id', id).select('id')
    if (error) throw toDomainError(error)
    if (!data || data.length === 0) throw new NotFoundError(`Category ${id} not found`)
  }

  async listByEquipment(equipmentId: string): Promise<MaintenanceLog[]> {
    const { data, error } = await this.client
      .from('maintenance_logs')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('performed_at', { ascending: false })
      .order('id', { ascending: true })
    if (error) throw toDomainError(error)
    return (data as MaintenanceLogRow[]).map(rowToMaintenanceLog)
  }

  async add(input: NewMaintenanceLog): Promise<MaintenanceLog> {
    const { data, error } = await this.client
      .from('maintenance_logs')
      .insert(maintenanceInputToRow(input))
      .select()
      .single()
    if (error) {
      // A missing parent surfaces as an FK violation; report it as NotFound to match the Sheets adapter.
      if (error.code === '23503') throw new NotFoundError(`Equipment ${input.equipmentId} not found`)
      throw toDomainError(error)
    }
    return rowToMaintenanceLog(data as MaintenanceLogRow)
  }
}
