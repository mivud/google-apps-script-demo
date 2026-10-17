import { ValidationError } from '../../../shared/errors'

export const MAINTENANCE_TYPES = ['new', 'repair', 'replacement', 'maintenance'] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export interface MaintenanceLog {
  id: string
  equipmentId: string
  type: MaintenanceType
  // UTC with a "+00:00" offset.
  performedAt: string
  note: string
  // Audit fields are filled by the backend.
  createdAt: string
  modifiedAt: string
  createdBy: string
  lastModifiedBy: string
}

export type NewMaintenanceLog = Omit<MaintenanceLog, 'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy'>

export function isMaintenanceType(value: string): value is MaintenanceType {
  return (MAINTENANCE_TYPES as readonly string[]).includes(value)
}

// Trims the note and rejects unknown types or unparsable dates.
export function validateNewMaintenanceLog(input: NewMaintenanceLog): NewMaintenanceLog {
  if (!isMaintenanceType(input.type)) throw new ValidationError('Invalid maintenance type', 'maintenance_type_invalid')
  if (Number.isNaN(Date.parse(input.performedAt))) throw new ValidationError('Invalid date', 'date_invalid')
  return { ...input, note: input.note.trim() }
}

// Noon UTC keeps a date-only value on the same calendar day for viewers in (almost) any timezone.
export function maintenanceDateToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const time = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : Number.NaN
  if (Number.isNaN(time)) throw new ValidationError('Invalid date', 'date_invalid')
  return new Date(time).toISOString().replace('Z', '+00:00')
}
