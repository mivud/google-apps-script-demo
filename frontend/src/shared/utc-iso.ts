// Single wire format for datetimes so Sheets and Supabase return byte-identical strings:
// UTC, millisecond precision, explicit "+00:00" offset (never "Z").
export function toUtcOffsetIso(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  // Pass unparsable values through so bad data stays visible instead of throwing in a mapper.
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().replace('Z', '+00:00')
}
