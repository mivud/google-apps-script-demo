import type { DeviceAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { optionalText, requireText } from '../../../shared/validation/Values';
import { buildWarrantyPeriod, type WarrantyPeriod } from './WarrantyPeriod';

export const EQUIPMENT_STATUSES = ['active', 'in_repair', 'retired'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const NOTE_MAX_LENGTH = 2000;
export const VENDOR_MAX_LENGTH = 200;
const QUANTITY_MAX = 1_000_000;

export interface Equipment extends WarrantyPeriod {
  id: string;
  category_id: string | null;
  name: string;
  description: string;
  status: EquipmentStatus;
  quantity: number;
  note: string | null;
  vendor: string | null;
}
export type StoredEquipment = Equipment & DeviceAudit;

type Input = Record<string, unknown>;
const has = (input: Input, key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

function parseStatus(value: unknown): EquipmentStatus {
  if (!EQUIPMENT_STATUSES.includes(value as EquipmentStatus)) throw validation('equipment_status_invalid');
  return value as EquipmentStatus;
}

function parseQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > QUANTITY_MAX) {
    throw validation('equipment_quantity_invalid');
  }
  return value;
}

function parseName(value: unknown): string {
  const name = requireText(value, 'equipment_name_required');
  if (name === '') throw validation('equipment_name_required');
  return name;
}

// Create (existing = null) applies defaults; update merges only the keys present in the patch.
// category_id is returned as sent (normalized later by the use case, which also checks it exists).
export function buildEquipment(id: string, existing: Equipment | null, input: Input): Equipment {
  const pick = <T>(key: string, parse: (value: unknown) => T, fallback: T): T =>
    has(input, key) ? parse(input[key]) : existing ? (existing as unknown as Record<string, T>)[key] : fallback;

  const warranty = has(input, 'purchase_date') || has(input, 'warranty_months') || !existing
    ? buildWarrantyPeriod(
      has(input, 'purchase_date') ? input.purchase_date : existing?.purchase_date,
      has(input, 'warranty_months') ? input.warranty_months : existing?.warranty_months,
    )
    : existing;

  return {
    id,
    category_id: existing?.category_id ?? null,
    name: has(input, 'name') || !existing ? parseName(input.name) : existing.name,
    description: pick('description', (v) => requireText(v, 'description_invalid'), ''),
    status: pick('status', parseStatus, 'active'),
    quantity: pick('quantity', parseQuantity, 1),
    purchase_date: warranty.purchase_date,
    warranty_months: warranty.warranty_months,
    warranty_expiry_date: warranty.warranty_expiry_date,
    note: pick('note', (v) => optionalText(v, NOTE_MAX_LENGTH, 'note_too_long'), null),
    vendor: pick('vendor', (v) => optionalText(v, VENDOR_MAX_LENGTH, 'vendor_too_long'), null),
  };
}

export const hasCategoryInput = (input: Input): boolean => has(input, 'category_id');
