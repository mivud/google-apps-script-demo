import { toUtcOffsetIso } from '../../../../shared/utc-iso'
import type { Category, NewCategory } from '../../domain/category'
import type { Equipment, EquipmentStatus, NewEquipment } from '../../domain/equipment'
import type { MaintenanceLog, MaintenanceType, NewMaintenanceLog } from '../../domain/maintenance'
import type { CategoryRow, EquipmentRow, MaintenanceLogRow } from './row-types'

// Row <-> entity mapping lives here once because both backends share the row shape.
export function rowToEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    categoryId: row.category_id ?? '',
    name: row.name,
    description: row.description,
    status: row.status as EquipmentStatus,
    quantity: Number(row.quantity),
    createdAt: toUtcOffsetIso(row.created_at),
    modifiedAt: toUtcOffsetIso(row.modified_at),
    createdBy: row.created_by ?? '',
    lastModifiedBy: row.last_modified_by ?? '',
  }
}

export function equipmentPatchToRow(patch: Partial<NewEquipment>): Partial<EquipmentRow> {
  const row: Partial<EquipmentRow> = {}
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description
  if (patch.status !== undefined) row.status = patch.status
  if (patch.quantity !== undefined) row.quantity = patch.quantity
  return row
}

export function rowToMaintenanceLog(row: MaintenanceLogRow): MaintenanceLog {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    type: row.type as MaintenanceType,
    performedAt: toUtcOffsetIso(row.performed_at),
    note: row.note,
    createdAt: toUtcOffsetIso(row.created_at),
    modifiedAt: toUtcOffsetIso(row.modified_at),
    createdBy: row.created_by ?? '',
    lastModifiedBy: row.last_modified_by ?? '',
  }
}

export function maintenanceInputToRow(input: NewMaintenanceLog): Partial<MaintenanceLogRow> {
  return {
    equipment_id: input.equipmentId,
    type: input.type,
    performed_at: toUtcOffsetIso(input.performedAt),
    note: input.note,
  }
}

export function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id ?? '',
    name: row.name,
    createdAt: toUtcOffsetIso(row.created_at),
    modifiedAt: toUtcOffsetIso(row.modified_at),
    createdBy: row.created_by ?? '',
    lastModifiedBy: row.last_modified_by ?? '',
  }
}

export function categoryInputToRow(input: Partial<NewCategory>): Partial<CategoryRow> {
  const row: Partial<CategoryRow> = {}
  if (input.parentId !== undefined) row.parent_id = input.parentId
  if (input.name !== undefined) row.name = input.name
  return row
}
