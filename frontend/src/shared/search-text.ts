const COMBINING_MARKS = /[̀-ͯ]/g
const D_STROKE_LOWER = /đ/g
const D_STROKE_UPPER = /Đ/g

// Case- and accent-insensitive form, so "ca phe" finds "Cà phê" and "dien" finds "Điện".
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').replace(D_STROKE_LOWER, 'd').replace(D_STROKE_UPPER, 'D').toLowerCase().trim()
}

export function matchSearch(query: string, fields: readonly string[]): boolean {
  const needle = normalizeSearchText(query)
  if (needle === '') return true
  return fields.some((field) => normalizeSearchText(field).includes(needle))
}
