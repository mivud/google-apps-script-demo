import type { DeviceAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { formatUtc } from '../../../shared/time/Clock';
import { optionalText } from '../../../shared/validation/Values';
import { VENDOR_MAX_LENGTH } from './Equipment';

export const MAINTENANCE_TYPES = ['new', 'repair', 'replacement', 'maintenance'] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  type: MaintenanceType;
  performed_at: string;
  note: string;
  vendor: string | null;
}
export type StoredMaintenanceLog = MaintenanceLog & DeviceAudit;

function parseType(value: unknown): MaintenanceType {
  if (!MAINTENANCE_TYPES.includes(value as MaintenanceType)) throw validation('maintenance_type_invalid');
  return value as MaintenanceType;
}

// Blank means now; the result is always UTC ISO with +00:00.
function parsePerformedAt(value: unknown, nowIso: string): string {
  if (value === undefined || value === null || value === '') return nowIso;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw validation('performed_at_invalid');
  return formatUtc(new Date(value));
}

function parseNote(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw validation('note_invalid');
  return value.trim();
}

export function buildMaintenanceLog(
  id: string,
  equipmentId: string,
  input: Record<string, unknown>,
  nowIso: string,
): MaintenanceLog {
  return {
    id,
    equipment_id: equipmentId,
    type: parseType(input.type),
    performed_at: parsePerformedAt(input.performed_at, nowIso),
    note: parseNote(input.note),
    vendor: optionalText(input.vendor, VENDOR_MAX_LENGTH, 'vendor_too_long'),
  };
}
