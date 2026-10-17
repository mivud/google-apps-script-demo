import { ValidationError } from '../../../shared/errors'

export const EQUIPMENT_STATUSES = ['active', 'in_repair', 'retired'] as const
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]

export interface Equipment {
  id: string
  // '' means uncategorized.
  categoryId: string
  name: string
  description: string
  status: EquipmentStatus
  quantity: number
  // Audit fields are filled by the backend; datetimes are UTC with a "+00:00" offset.
  createdAt: string
  modifiedAt: string
  createdBy: string
  lastModifiedBy: string
}

export type NewEquipment = Omit<Equipment, 'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy'>

// Business rules for equipment; throws ValidationError with stable codes and returns the trimmed input.
export function validateNewEquipment(input: NewEquipment): NewEquipment {
  const name = input.name.trim()
  if (!name) throw new ValidationError('Name is required', 'name_required')
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new ValidationError('Quantity must be a whole number, 0 or more', 'quantity_invalid')
  }
  if (!(EQUIPMENT_STATUSES as readonly string[]).includes(input.status)) throw new ValidationError('Invalid status', 'status_invalid')
  return { ...input, name, categoryId: input.categoryId.trim(), description: input.description.trim() }
}
