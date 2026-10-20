import { ValidationError } from '../../../shared/errors'
import { optionalText, VENDOR_MAX_LENGTH } from './optional-text'

export const MAINTENANCE_TYPES = ['new', 'repair', 'replacement', 'maintenance'] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export interface MaintenanceLog {
  id: string
  equipmentId: string
  type: MaintenanceType
  // UTC with a "+00:00" offset.
  performedAt: string
  note: string
  // Service provider; null = not set (also for old rows).
  vendor: string | null
  // Audit fields are filled by the backend.
  createdAt: string
  modifiedAt: string
  createdBy: string
  lastModifiedBy: string
}

// The vendor may be omitted (treated as null).
export type NewMaintenanceLog = Omit<MaintenanceLog, 'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy' | 'vendor'> &
  Partial<Pick<MaintenanceLog, 'vendor'>>

export function isMaintenanceType(value: string): value is MaintenanceType {
  return (MAINTENANCE_TYPES as readonly string[]).includes(value)
}

// Trims the note and rejects unknown types or unparsable dates.
export function validateNewMaintenanceLog(input: NewMaintenanceLog): Omit<NewMaintenanceLog, 'vendor'> & Pick<MaintenanceLog, 'vendor'> {
  if (!isMaintenanceType(input.type)) throw new ValidationError('Invalid maintenance type', 'maintenance_type_invalid')
  if (Number.isNaN(Date.parse(input.performedAt))) throw new ValidationError('Invalid date', 'date_invalid')
  return { ...input, note: input.note.trim(), vendor: optionalText(input.vendor, VENDOR_MAX_LENGTH, 'vendor_too_long') }
}

// Noon UTC keeps a date-only value on the same calendar day for viewers in (almost) any timezone.
export function maintenanceDateToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const time = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : Number.NaN
  if (Number.isNaN(time)) throw new ValidationError('Invalid date', 'date_invalid')
  return new Date(time).toISOString().replace('Z', '+00:00')
}
