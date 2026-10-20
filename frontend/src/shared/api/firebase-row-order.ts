type Row = Record<string, unknown>
type Comparator = (left: Row, right: Row) => number

// Code-point comparison, the same order Firestore uses.
function compareText(left: unknown, right: unknown): number {
  const a = String(left ?? '')
  const b = String(right ?? '')
  return a < b ? -1 : a > b ? 1 : 0
}

export function ascending(field: string): Comparator {
  return (left, right) => compareText(left[field], right[field])
}

export function descending(field: string): Comparator {
  return (left, right) => compareText(right[field], left[field])
}

// Sorting client-side avoids composite Firestore indexes while keeping the order identical to the SQL ORDER BY.
export function sortRows(rows: Row[], ...comparators: Comparator[]): Row[] {
  return [...rows].sort((left, right) => {
    for (const compare of comparators) {
      const result = compare(left, right)
      if (result !== 0) return result
    }
    return 0
  })
}
