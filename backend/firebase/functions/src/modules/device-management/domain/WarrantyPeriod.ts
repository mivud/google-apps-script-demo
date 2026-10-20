import { validation } from '../../../shared/errors/DomainError';
import { daysInMonth, optionalInteger, parseDateOnly } from '../../../shared/validation/Values';

export const WARRANTY_MONTHS_MAX = 600;

export interface WarrantyPeriod {
  purchase_date: string | null;
  warranty_months: number | null;
  warranty_expiry_date: string | null;
}

// purchase date + months, clamped to the end of a shorter month (31 Jan + 1 month = 28/29 Feb).
export function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

// The expiry date is server-owned: it is always recomputed and never read from the client.
export function buildWarrantyPeriod(purchaseDate: unknown, warrantyMonths: unknown): WarrantyPeriod {
  const blank = purchaseDate === undefined || purchaseDate === null || purchaseDate === '';
  const purchase = blank ? null : parseDateOnly(purchaseDate, 'purchase_date_invalid');
  const months = optionalInteger(warrantyMonths, 0, WARRANTY_MONTHS_MAX, 'warranty_months_invalid');
  if (months !== null && purchase === null) throw validation('warranty_requires_purchase_date');
  return {
    purchase_date: purchase,
    warranty_months: months,
    warranty_expiry_date: purchase !== null && months !== null ? addMonthsClamped(purchase, months) : null,
  };
}
