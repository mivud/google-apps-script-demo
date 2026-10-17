import { describe, expect, it } from 'vitest'
import { ALL_VALUE, TOGGLE_ON, applyFilters, countActiveFilters, emptyFilterValues, isDefaultQuery, type FilterDefinition } from './table-filters'

interface Row { name: string; kind: string; urgent: boolean }

const rows: Row[] = [
  { name: 'Cà phê', kind: 'a', urgent: false },
  { name: 'Rent', kind: 'b', urgent: true },
  { name: 'Rice', kind: 'a', urgent: true },
]
const filters: FilterDefinition<Row>[] = [
  { key: 'kind', label: 'Kind', kind: 'select', options: [{ value: ALL_VALUE, label: 'All' }, { value: 'a', label: 'A' }], predicate: (row, value) => row.kind === value },
  { key: 'urgent', label: 'Urgent', kind: 'toggle', predicate: (row) => row.urgent },
]
const toolbar = { searchFields: (row: Row) => [row.name], filters }
const names = (query: { search: string; values: Record<string, string> }) => applyFilters(rows, query, toolbar).map((row) => row.name)

describe('table filters', () => {
  it('starts every filter on "all"', () => {
    expect(emptyFilterValues(filters)).toEqual({ kind: ALL_VALUE, urgent: ALL_VALUE })
  })

  it('returns every row for the default query', () => {
    expect(names({ search: '', values: emptyFilterValues(filters) })).toHaveLength(3)
    expect(applyFilters(rows, { search: '', values: {} }, { searchFields: toolbar.searchFields })).toHaveLength(3)
  })

  it('combines search and filters with AND', () => {
    expect(names({ search: 'ca phe', values: {} })).toEqual(['Cà phê'])
    expect(names({ search: '', values: { kind: 'a', urgent: TOGGLE_ON } })).toEqual(['Rice'])
    expect(names({ search: 'rent', values: { kind: 'a' } })).toEqual([])
  })

  it('counts active filters and detects the default query', () => {
    expect(countActiveFilters(filters, { kind: 'a' })).toBe(1)
    expect(isDefaultQuery(filters, { search: '', values: { kind: ALL_VALUE } })).toBe(true)
    expect(isDefaultQuery(filters, { search: 'x', values: {} })).toBe(false)
    expect(isDefaultQuery(filters, { search: '', values: { urgent: TOGGLE_ON } })).toBe(false)
  })
})
