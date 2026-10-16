import type { Page } from '../../../../../shared/page'
import type { DataService } from '../../../application/data-service'
import type { EquipmentQuery } from '../../../application/equipment-repository'
import type { Category, NewCategory } from '../../../domain/category'
import type { Equipment, NewEquipment } from '../../../domain/equipment'
import { AuthError, NetworkError, NotFoundError, ValidationError, type ValidationCode } from '../../../../../shared/errors'
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
import { API_ACTIONS } from './api-actions'

interface ApiSuccess<T> {
  ok: true
  data: T
}
interface ApiFailure {
  ok: false
  error: { code: string; message: string }
}

// The backend sends lowercase English messages; mapping them here keeps the same codes as the services.
const BACKEND_VALIDATION_CODES: Record<string, ValidationCode> = {
  'name is required': 'name_required',
  'quantity must be an integer >= 0': 'quantity_invalid',
  'invalid status': 'status_invalid',
  'invalid maintenance type': 'maintenance_type_invalid',
  'invalid date': 'date_invalid',
  'category_name_required': 'category_name_required',
  'category_name_duplicate': 'category_name_duplicate',
  'category_cycle': 'category_cycle',
  'category_in_use': 'category_in_use',
  'category_has_children': 'category_has_children',
}

// An empty id list means "no category filter" in every adapter.
function toListPayload(query: EquipmentQuery) {
  const { categoryIds, ...rest } = query
  return categoryIds && categoryIds.length > 0 ? { ...rest, categoryIds } : rest
}

export interface SheetsAdapterConfig {
  apiUrl: string
  token: string
}

export class SheetsAdapter implements DataService {
  private readonly config: SheetsAdapterConfig

  constructor(config: SheetsAdapterConfig) {
    this.config = config
  }

  async list(query: EquipmentQuery): Promise<Page<Equipment>> {
    const result = await this.call<Page<EquipmentRow>>(API_ACTIONS.equipment.list, toListPayload(query))
    return { ...result, items: result.items.map(rowToEquipment) }
  }

  async get(id: string): Promise<Equipment | null> {
    const row = await this.call<EquipmentRow | null>(API_ACTIONS.equipment.get, { id })
    return row ? rowToEquipment(row) : null
  }

  async create(input: NewEquipment): Promise<Equipment> {
    return rowToEquipment(await this.call<EquipmentRow>(API_ACTIONS.equipment.create, equipmentPatchToRow(input)))
  }

  async update(id: string, patch: Partial<NewEquipment>): Promise<Equipment> {
    return rowToEquipment(
      await this.call<EquipmentRow>(API_ACTIONS.equipment.update, { id, patch: equipmentPatchToRow(patch) }),
    )
  }

  async remove(id: string): Promise<void> {
    await this.call<null>(API_ACTIONS.equipment.remove, { id })
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.call<CategoryRow[]>(API_ACTIONS.category.list, {})
    return rows.map(rowToCategory)
  }

  async getCategory(id: string): Promise<Category | null> {
    const row = await this.call<CategoryRow | null>(API_ACTIONS.category.get, { id })
    return row ? rowToCategory(row) : null
  }

  async createCategory(input: NewCategory): Promise<Category> {
    return rowToCategory(await this.call<CategoryRow>(API_ACTIONS.category.create, categoryInputToRow(input)))
  }

  async updateCategory(id: string, patch: Partial<NewCategory>): Promise<Category> {
    return rowToCategory(await this.call<CategoryRow>(API_ACTIONS.category.update, { id, patch: categoryInputToRow(patch) }))
  }

  async removeCategory(id: string): Promise<void> {
    await this.call<null>(API_ACTIONS.category.remove, { id })
  }

  async listByEquipment(equipmentId: string): Promise<MaintenanceLog[]> {
    // Backend currently reads camelCase and will accept snake_case; drop `equipmentId` once it is redeployed.
    const rows = await this.call<MaintenanceLogRow[]>(API_ACTIONS.maintenance.listByEquipment, {
      equipment_id: equipmentId,
      equipmentId,
    })
    return rows.map(rowToMaintenanceLog)
  }

  async add(input: NewMaintenanceLog): Promise<MaintenanceLog> {
    return rowToMaintenanceLog(await this.call<MaintenanceLogRow>(API_ACTIONS.maintenance.add, maintenanceInputToRow(input)))
  }

  private async call<T>(action: string, payload: unknown): Promise<T> {
    let body: ApiSuccess<T> | ApiFailure
    try {
      // text/plain keeps this a "simple" request; Apps Script cannot answer CORS preflights.
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: this.config.token, action, payload }),
      })
      if (!response.ok) throw new NetworkError(`HTTP ${response.status}`)
      body = (await response.json()) as ApiSuccess<T> | ApiFailure
    } catch (error) {
      if (error instanceof NetworkError) throw error
      throw new NetworkError(error instanceof Error ? error.message : 'Network request failed')
    }

    if (body.ok) return body.data
    switch (body.error.code) {
      case 'NOT_FOUND':
        throw new NotFoundError(body.error.message)
      case 'VALIDATION':
        throw new ValidationError(
          body.error.message,
          BACKEND_VALIDATION_CODES[body.error.message.trim().toLowerCase()] ?? 'unknown',
        )
      case 'UNAUTHORIZED':
        throw new AuthError(body.error.message)
      default:
        throw new NetworkError(body.error.message)
    }
  }
}
