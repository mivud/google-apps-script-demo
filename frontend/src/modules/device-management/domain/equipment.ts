import { ValidationError } from '../../../shared/errors'
import { blankToNull, NOTE_MAX_LENGTH, optionalText, VENDOR_MAX_LENGTH } from './optional-text'
import { parseDateOnly } from './warranty'

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
  // Optional details; null = not set (also for old rows). Dates are YYYY-MM-DD.
  purchaseDate: string | null
  warrantyMonths: number | null
  // Derived by the backend from purchaseDate + warrantyMonths; never sent by clients.
  warrantyExpiryDate: string | null
  note: string | null
  // Seller.
  vendor: string | null
  // Audit fields are filled by the backend; datetimes are UTC with a "+00:00" offset.
  createdAt: string
  modifiedAt: string
  createdBy: string
  lastModifiedBy: string
}

type EquipmentOptionalInput = 'purchaseDate' | 'warrantyMonths' | 'note' | 'vendor'

// The optional details may be omitted (treated as null).
export type NewEquipment = Omit<
  Equipment,
  'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy' | 'warrantyExpiryDate' | EquipmentOptionalInput
> &
  Partial<Pick<Equipment, EquipmentOptionalInput>>

// NewEquipment after validation: every optional detail is present (null when not set).
export type ValidEquipment = Omit<Equipment, 'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy' | 'warrantyExpiryDate'>

export const WARRANTY_MONTHS_MAX = 600

function validatePurchaseDate(value: string | null | undefined): string | null {
  const text = blankToNull(value)
  if (text !== null && !parseDateOnly(text)) throw new ValidationError('Invalid purchase date', 'purchase_date_invalid')
  return text
}

function validateWarrantyMonths(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value < 0 || value > WARRANTY_MONTHS_MAX) {
    throw new ValidationError(`Warranty must be a whole number of months, 0 to ${WARRANTY_MONTHS_MAX}`, 'warranty_months_invalid')
  }
  return value
}

// Business rules for equipment; throws ValidationError with stable codes and returns the trimmed input
// with every optional detail normalized to null.
export function validateNewEquipment(input: NewEquipment): ValidEquipment {
  const name = input.name.trim()
  if (!name) throw new ValidationError('Name is required', 'name_required')
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new ValidationError('Quantity must be a whole number, 0 or more', 'quantity_invalid')
  }
  if (!(EQUIPMENT_STATUSES as readonly string[]).includes(input.status)) throw new ValidationError('Invalid status', 'status_invalid')
  const purchaseDate = validatePurchaseDate(input.purchaseDate)
  const warrantyMonths = validateWarrantyMonths(input.warrantyMonths)
  if (warrantyMonths !== null && purchaseDate === null) {
    throw new ValidationError('Warranty needs a purchase date', 'warranty_requires_purchase_date')
  }
  return {
    ...input,
    name,
    categoryId: input.categoryId.trim(),
    description: input.description.trim(),
    purchaseDate,
    warrantyMonths,
    note: optionalText(input.note, NOTE_MAX_LENGTH, 'note_too_long'),
    vendor: optionalText(input.vendor, VENDOR_MAX_LENGTH, 'vendor_too_long'),
  }
}
