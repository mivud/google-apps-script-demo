import { ascending, descending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { EquipmentQuery } from '../../../application/equipment-repository'

type Row = Record<string, unknown>

// Same sanitising as the Supabase adapter so a search term means the same on every provider.
function sanitizeSearch(term: string): string {
  return term.replace(/[,()%_\\]/g, ' ').trim()
}

function matchesSearch(row: Row, search: string): boolean {
  const needle = search.toLowerCase()
  return [row.name, row.description].some((value) => String(value ?? '').toLowerCase().includes(needle))
}

// Firestore cannot combine these filters with ordering without composite indexes, so they run client-side.
export function filterEquipmentRows(rows: Row[], query: EquipmentQuery): Row[] {
  const categoryIds = query.categoryIds ?? []
  const search = query.search ? sanitizeSearch(query.search) : ''
  return rows.filter(
    (row) =>
      (categoryIds.length === 0 || categoryIds.includes(String(row.category_id))) &&
      (!query.status || row.status === query.status) &&
      (!search || matchesSearch(row, search)),
  )
}

// modifiedAt DESC, id ASC: identical in every adapter.
export function pageEquipmentRows(rows: Row[], query: EquipmentQuery): Row[] {
  const from = (query.page - 1) * query.pageSize
  return sortRows(rows, descending('modified_at'), ascending('id')).slice(from, from + query.pageSize)
}
