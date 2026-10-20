import { validation } from '../../../shared/errors/DomainError';
import { daysInMonth } from '../../../shared/validation/Values';

const STATEMENT_MONTH_PATTERN = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

export function parseStatementMonth(value: unknown): string {
  if (typeof value !== 'string' || !STATEMENT_MONTH_PATTERN.test(value.trim())) throw validation('statement_month_invalid');
  return value.trim();
}

const pad = (n: number): string => String(n).padStart(2, '0');

// The billing cycle closes on closingDay (capped to the month length); spending after it belongs to the
// next month's statement. A null closing day means the calendar month.
export function resolveStatementMonth(spentOn: string, closingDay: number | null): string {
  const [year, month, day] = spentOn.split('-').map(Number);
  const closesOn = closingDay === null ? daysInMonth(year, month) : Math.min(closingDay, daysInMonth(year, month));
  if (day <= closesOn) return `${year}-${pad(month)}`;
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`;
}

// Day of the month a fixed expense is due: the payment day capped to the month length, the 1st when none.
export function dueDate(statementMonth: string, paymentDay: number | null): string {
  const [year, month] = statementMonth.split('-').map(Number);
  const day = Math.min(paymentDay ?? 1, daysInMonth(year, month));
  return `${statementMonth}-${pad(day)}`;
}
