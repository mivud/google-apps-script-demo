import { documentId, where } from 'firebase/firestore'
import { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, descending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { FirebaseHandle } from '../../../../../shared/firebase/firebase-client'
import type { Page } from '../../../../../shared/page'
import type { DataService } from '../../../application/data-service'
import type { EquipmentQuery } from '../../../application/equipment-repository'
import type { Category, NewCategory } from '../../../domain/category'
import type { Equipment, NewEquipment } from '../../../domain/equipment'
import type { MaintenanceLog, NewMaintenanceLog } from '../../../domain/maintenance'
import { categoryInputToRow, equipmentPatchToRow, maintenanceInputToRow, rowToCategory, rowToEquipment, rowToMaintenanceLog } from '../row-mappers'
import type { CategoryRow, EquipmentRow, MaintenanceLogRow } from '../row-types'
import { filterEquipmentRows, pageEquipmentRows } from './firebase-equipment-filter'
import { toFirebaseDataError } from './firebase-error-mapper'

// Callable API actions, namespaced as <module>.<entity>.<action>; collections share the Postgres table names.
const ACTIONS = {
  createEquipment: 'device-management.equipment.create',
  updateEquipment: 'device-management.equipment.update',
  removeEquipment: 'device-management.equipment.remove',
  createCategory: 'device-management.category.create',
  updateCategory: 'device-management.category.update',
  removeCategory: 'device-management.category.remove',
  addLog: 'device-management.maintenance.add',
} as const
const EQUIPMENT = 'equipment'
const CATEGORIES = 'categories'
const LOGS = 'maintenance_logs'

export class FirebaseAdapter implements DataService {
  private readonly caller: FirebaseCaller

  constructor(handle: FirebaseHandle) {
    this.caller = new FirebaseCaller(handle, toFirebaseDataError)
  }

  // Firebase is called straight from the browser, so there is no separate backend version.
  async getBackendVersion(): Promise<string | null> {
    return null
  }

  async list(query: EquipmentQuery): Promise<Page<Equipment>> {
    const matching = filterEquipmentRows(await this.caller.rows(EQUIPMENT), query)
    const items = pageEquipmentRows(matching, query).map((row) => rowToEquipment(row as unknown as EquipmentRow))
    return { items, total: matching.length, page: query.page, pageSize: query.pageSize }
  }

  async get(id: string): Promise<Equipment | null> {
    const [row] = await this.caller.rows(EQUIPMENT, where(documentId(), '==', id))
    return row ? rowToEquipment(row as unknown as EquipmentRow) : null
  }

  async create(input: NewEquipment): Promise<Equipment> {
    return rowToEquipment(await this.caller.call<EquipmentRow>(ACTIONS.createEquipment, equipmentPatchToRow(input)))
  }

  async update(id: string, patch: Partial<NewEquipment>): Promise<Equipment> {
    return rowToEquipment(await this.caller.call<EquipmentRow>(ACTIONS.updateEquipment, { id, patch: equipmentPatchToRow(patch) }))
  }

  async remove(id: string): Promise<void> {
    await this.caller.call<null>(ACTIONS.removeEquipment, { id })
  }

  // Case-insensitive name order with id as tie-break, like the Sheets and Supabase adapters.
  async listCategories(): Promise<Category[]> {
    const rows = (await this.caller.rows(CATEGORIES)).map((row) => ({ ...row, name_key: String(row.name ?? '').toLowerCase() }))
    return sortRows(rows, ascending('name_key'), ascending('id')).map((row) => rowToCategory(row as unknown as CategoryRow))
  }

  async getCategory(id: string): Promise<Category | null> {
    const [row] = await this.caller.rows(CATEGORIES, where(documentId(), '==', id))
    return row ? rowToCategory(row as unknown as CategoryRow) : null
  }

  async createCategory(input: NewCategory): Promise<Category> {
    return rowToCategory(await this.caller.call<CategoryRow>(ACTIONS.createCategory, categoryInputToRow(input)))
  }

  async updateCategory(id: string, patch: Partial<NewCategory>): Promise<Category> {
    return rowToCategory(await this.caller.call<CategoryRow>(ACTIONS.updateCategory, { id, patch: categoryInputToRow(patch) }))
  }

  async removeCategory(id: string): Promise<void> {
    await this.caller.call<null>(ACTIONS.removeCategory, { id })
  }

  async listByEquipment(equipmentId: string): Promise<MaintenanceLog[]> {
    const rows = await this.caller.rows(LOGS, where('equipment_id', '==', equipmentId))
    return sortRows(rows, descending('performed_at'), ascending('id')).map((row) => rowToMaintenanceLog(row as unknown as MaintenanceLogRow))
  }

  async add(input: NewMaintenanceLog): Promise<MaintenanceLog> {
    return rowToMaintenanceLog(await this.caller.call<MaintenanceLogRow>(ACTIONS.addLog, maintenanceInputToRow(input)))
  }
}
