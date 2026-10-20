import { toUtcOffsetIso } from '../../../../shared/utc-iso'
import type { Category, NewCategory } from '../../domain/category'
import { blankToNull } from '../../domain/optional-text'
import type { Equipment,EquipmentStatus, NewEquipment } from '../../domain/equipment'
import type { MaintenanceLog, MaintenanceType, NewMaintenanceLog } from '../../domain/maintenance'
import type { CategoryRow, EquipmentRow, MaintenanceLogRow } from './row-types'

// A date cell may arrive as a full ISO datetime; the app only keeps YYYY-MM-DD.
function toDateOnly(value: string | null | undefined): string | null {
  const text = blankToNull(value)
  return text === null ? null : text.slice(0, 10)
}

function toMonths(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

// Row <-> entity mapping lives here once because both backends share the row shape.
export function rowToEquipment(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    categoryId: row.category_id ?? '',
    name: row.name,
    description: row.description,
    status: row.status as EquipmentStatus,
    quantity: Number(row.quantity),
    purchaseDate: toDateOnly(row.purchase_date),
    warrantyMonths: toMonths(row.warranty_months),
    warrantyExpiryDate: toDateOnly(row.warranty_expiry_date),
    note: blankToNull(row.note),
    vendor: blankToNull(row.vendor),
    createdAt: toUtcOffsetIso(row.created_at),
    modifiedAt: toUtcOffsetIso(row.modified_at),
    createdBy: row.created_by ?? '',
    lastModifiedBy: row.last_modified_by ?? '',
  }
}

// warranty_expiry_date is never written: the backend derives it.
export function equipmentPatchToRow(patch: Partial<NewEquipment>): Partial<EquipmentRow> {
  const row: Partial<EquipmentRow> = {}
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId
  if (patch.name !== undefined) row.name = patch.name
  if (patch.description !== undefined) row.description = patch.description
  if (patch.status !== undefined) row.status = patch.status
  if (patch.quantity !== undefined) row.quantity = patch.quantity
  if (patch.purchaseDate !== undefined) row.purchase_date = blankToNull(patch.purchaseDate)
  if (patch.warrantyMonths !== undefined) row.warranty_months = patch.warrantyMonths
  if (patch.note !== undefined) row.note = blankToNull(patch.note)
  if (patch.vendor !== undefined) row.vendor = blankToNull(patch.vendor)
  return row
}

export function rowToMaintenanceLog(row: MaintenanceLogRow): MaintenanceLog {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    type: row.type as MaintenanceType,
    performedAt: toUtcOffsetIso(row.performed_at),
    note: row.note,
    vendor: blankToNull(row.vendor),
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
    vendor: blankToNull(input.vendor),
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
