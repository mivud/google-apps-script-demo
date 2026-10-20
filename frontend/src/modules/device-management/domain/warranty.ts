const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

// Parses a strict YYYY-MM-DD calendar date; returns null for malformed or impossible dates (2025-02-30).
export function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const same = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return same ? { year, month, day } : null
}

// purchase_date + months, clamped to the end of a shorter month (31 Jan + 1 month = 28/29 Feb).
// Same semantics as Postgres date + interval and the Apps Script WarrantyPeriod.
export function computeWarrantyExpiry(purchaseDate: string | null, months: number | null): string | null {
  if (purchaseDate === null || months === null) return null
  const parts = parseDateOnly(purchaseDate)
  if (!parts) return null
  const monthIndex = parts.month - 1 + months
  const year = parts.year + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(parts.day, lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
