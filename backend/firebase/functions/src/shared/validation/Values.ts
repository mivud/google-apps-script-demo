import { validation } from '../errors/DomainError';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const hasControlChars = (text: string): boolean => CONTROL_CHARS.test(text);

export function requireText(value: unknown, code: string): string {
  if (typeof value !== 'string') throw validation(code);
  return value.trim();
}

// Blank or missing means "not set" (null); a non-string is a malformed request.
export function optionalText(value: unknown, maxLength: number, tooLongCode: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw validation('invalid_request');
  const text = value.trim();
  if (text === '') return null;
  if (text.length > maxLength) throw validation(tooLongCode);
  return text;
}

export function optionalInteger(value: unknown, min: number, max: number, code: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw validation(code);
  return value;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// A real calendar date as YYYY-MM-DD.
export function parseDateOnly(value: unknown, code: string): string {
  if (typeof value !== 'string') throw validation(code);
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) throw validation(code);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw validation(code);
  return value.trim();
}

export function parseUuid(value: unknown, code: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim().toLowerCase())) throw validation(code);
  return value.trim().toLowerCase();
}
