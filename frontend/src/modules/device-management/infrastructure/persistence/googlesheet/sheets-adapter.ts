import type { Page } from '../../../../../shared/page'
import type { DataService } from '../../../application/data-service'
import type { EquipmentQuery } from '../../../application/equipment-repository'
import type { Category, NewCategory } from '../../../domain/category'
import type { Equipment, NewEquipment } from '../../../domain/equipment'
import { postToAppsScript, type ApiResponse } from '../../../../../shared/api/apps-script-api'
import { WarmupGate } from '../../../../../shared/api/warmup-gate'
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
import { toDataError } from './sheets-error-mapper'

// An empty id list means "no category filter" in every adapter.
function toListPayload(query: EquipmentQuery) {
  const { categoryIds, ...rest } = query
  return categoryIds && categoryIds.length > 0 ? { ...rest, categoryIds } : rest
}

export interface SheetsAdapterConfig {
  apiUrl: string
  getIdToken: () => string | null
  // Silent re-auth used once when the backend answers UNAUTHORIZED.
  refreshIdToken?: () => Promise<string | null>
  // Injectable so tests and other hosts can swap the first-request policy; defaults to a fresh gate.
  warmup?: WarmupGate
}

export class SheetsAdapter implements DataService {
  private readonly config: SheetsAdapterConfig
  private readonly warmup: WarmupGate

  constructor(config: SheetsAdapterConfig) {
    this.config = config
    this.warmup = config.warmup ?? new WarmupGate()
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

  async getBackendVersion(): Promise<string | null> {
    return (await this.call<{ version: string }>(API_ACTIONS.system.version, {})).version
  }

  // The first call after sign-in runs alone: it fills the backend's access cache for this token.
  private call<T>(action: string, payload: unknown): Promise<T> {
    return this.warmup.run(this.config.getIdToken(), () => this.send<T>(action, payload))
  }

  private async send<T>(action: string, payload: unknown): Promise<T> {
    let body = await this.post<T>(action, payload, this.config.getIdToken())
    if (!body.ok && body.error.code === 'UNAUTHORIZED' && this.config.refreshIdToken) {
      // The backend answers one generic UNAUTHORIZED on purpose, so any of them gets one silent re-auth and a single retry.
      const freshToken = await this.config.refreshIdToken()
      if (freshToken) body = await this.post<T>(action, payload, freshToken)
    }
    if (body.ok) return body.data
    throw toDataError(body)
  }

  private post<T>(action: string, payload: unknown, idToken: string | null): Promise<ApiResponse<T>> {
    return postToAppsScript<T>(this.config.apiUrl, { action, idToken, payload })
  }
}
