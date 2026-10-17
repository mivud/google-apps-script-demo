// Postgres uuid columns reject '' so the Supabase adapter turns "no reference" into NULL; Sheets keeps ''.
export function blankRefsToNull<T extends { parent_id?: string | null; category_id?: string | null }>(row: T): T {
  const copy = { ...row }
  if (copy.parent_id === '') copy.parent_id = null
  if (copy.category_id === '') copy.category_id = null
  return copy
}
