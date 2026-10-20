import type { IdentityAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { optionalInteger } from '../../../shared/validation/Values';

export interface PaymentMethod {
  id: string;
  name: string;
  active: boolean;
  statement_closing_day: number | null;
  color: string | null;
}
export type StoredPaymentMethod = PaymentMethod & IdentityAudit;

const ID_PATTERN = /^[a-z0-9_-]{1,40}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const NAME_MAX_LENGTH = 100;

export function parsePaymentMethodId(value: unknown): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value.trim())) throw validation('payment_method_id_invalid');
  return value.trim();
}

function parseName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) throw validation('payment_method_name_invalid');
  return name;
}

// Null or blank = no colour; otherwise exactly #RRGGBB (stored lowercase).
function parseColor(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const color = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!COLOR_PATTERN.test(color)) throw validation('payment_method_color_invalid');
  return color;
}

type Input = Record<string, unknown>;
const has = (input: Input, key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

// Create (existing = null) or merge a patch; the id never changes.
export function buildPaymentMethod(id: string, existing: PaymentMethod | null, input: Input): PaymentMethod {
  const active = input.active;
  if (active !== undefined && typeof active !== 'boolean') throw validation('invalid_request');
  return {
    id,
    name: has(input, 'name') || !existing ? parseName(input.name) : existing.name,
    active: active ?? existing?.active ?? true,
    statement_closing_day: has(input, 'statement_closing_day')
      ? optionalInteger(input.statement_closing_day, 1, 31, 'payment_method_closing_day_invalid')
      : existing?.statement_closing_day ?? null,
    color: has(input, 'color') ? parseColor(input.color) : existing?.color ?? null,
  };
}
