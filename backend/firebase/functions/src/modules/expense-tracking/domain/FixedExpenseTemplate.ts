import type { IdentityAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { optionalInteger } from '../../../shared/validation/Values';

export interface FixedExpenseTemplate {
  id: string;
  description: string;
  amount: number | null;
  payment_method_id: string | null;
  active: boolean;
  total_months: number | null;
  months_added: number;
  payment_day: number | null;
}
export type StoredFixedExpenseTemplate = FixedExpenseTemplate & IdentityAudit;

export const DESCRIPTION_MAX_LENGTH = 200;
export const AMOUNT_MAX = Number.MAX_SAFE_INTEGER;
const TOTAL_MONTHS_MAX = 1200;

export function parseDescription(value: unknown, code = 'description_invalid'): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < 1 || text.length > DESCRIPTION_MAX_LENGTH) throw validation(code);
  return text;
}

// Positive integer VND. Missing, null, empty or 0 means "no amount yet" when allowed.
export function parseAmount(value: unknown, allowEmpty: boolean): number | null {
  const empty = value === undefined || value === null || value === '' || value === 0;
  if (empty) {
    if (allowEmpty) return null;
    throw validation('expense_amount_required');
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > AMOUNT_MAX) {
    throw validation('amount_invalid');
  }
  return value;
}

export function parseOptionalId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw validation('invalid_request');
  return value.trim();
}

type Input = Record<string, unknown>;
const has = (input: Input, key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);

// months_added is server-owned: it is copied from the stored template and never read from the client.
export function buildTemplate(id: string, existing: FixedExpenseTemplate | null, input: Input): FixedExpenseTemplate {
  const active = input.active;
  if (active !== undefined && typeof active !== 'boolean') throw validation('invalid_request');
  const monthsAdded = existing?.months_added ?? 0;
  const totalMonths = has(input, 'total_months')
    ? (input.total_months === 0 ? null : optionalInteger(input.total_months, 1, TOTAL_MONTHS_MAX, 'total_months_invalid'))
    : existing?.total_months ?? null;
  if (totalMonths !== null && totalMonths < monthsAdded) throw validation('total_months_below_added');
  return {
    id,
    description: has(input, 'description') || !existing ? parseDescription(input.description) : existing.description,
    amount: has(input, 'amount') ? parseAmount(input.amount, true) : existing?.amount ?? null,
    payment_method_id: has(input, 'payment_method_id') ? parseOptionalId(input.payment_method_id) : existing?.payment_method_id ?? null,
    active: active ?? existing?.active ?? true,
    total_months: totalMonths,
    months_added: monthsAdded,
    payment_day: has(input, 'payment_day')
      ? optionalInteger(input.payment_day, 1, 31, 'payment_day_invalid')
      : existing?.payment_day ?? null,
  };
}

export const isDue = (template: FixedExpenseTemplate): boolean =>
  template.active && (template.total_months === null || template.months_added < template.total_months);
