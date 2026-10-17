import type { ReactNode } from 'react'
import { matchSearch } from './search-text'

// Value of the "no filtering" option; every filter definition starts with it.
export const ALL_VALUE = 'all'
export const MAX_SEARCH_LENGTH = 100

export interface FilterOption {
  value: string
  label: string
}

// Value of an enabled toggle filter.
export const TOGGLE_ON = 'on'

interface FilterBase<T> {
  key: string
  label: string
  // Called only for values other than ALL_VALUE (TOGGLE_ON for toggles).
  predicate: (row: T, value: string) => boolean
}

// 'select' for long lists, 'radio' for a few fixed choices (first option is ALL_VALUE).
export interface ChoiceFilter<T> extends FilterBase<T> {
  kind: 'select' | 'radio'
  options: FilterOption[]
  // Select only: renders rich options (e.g. colored badges) in a RichSelect instead of a native select.
  renderOption?: (option: FilterOption) => ReactNode
}

// Independent on/off flag; all toggles share one labelled checkbox group.
export interface ToggleFilter<T> extends FilterBase<T> {
  kind: 'toggle'
}

export type FilterDefinition<T> = ChoiceFilter<T> | ToggleFilter<T>

export interface TableQueryValues {
  search: string
  values: Record<string, string>
}

export interface DataTableToolbar<T> {
  searchLabel: string
  // Text fields the search box looks at.
  searchFields: (row: T) => string[]
  filters?: FilterDefinition<T>[]
  // Caption of the checkbox group that holds the toggle filters, e.g. "Needs attention".
  toggleGroupLabel?: string
  // Slot next to the search box, e.g. a ReloadButton.
  actions?: ReactNode
  // Plural name of the rows for the count line, e.g. "expenses".
  itemsName: string
  // Rendered between the toolbar and the table with exactly the rows the table shows, e.g. a chart.
  renderAbove?: (visibleRows: T[]) => ReactNode
  // Keep search and filters in the URL so navigation and reloads do not lose them.
  urlSync?: boolean
}

export function emptyFilterValues<T>(definitions: readonly FilterDefinition<T>[]): Record<string, string> {
  return Object.fromEntries(definitions.map((definition) => [definition.key, ALL_VALUE]))
}

export function applyFilters<T>(rows: readonly T[], query: TableQueryValues, toolbar: Pick<DataTableToolbar<T>, 'searchFields' | 'filters'>): T[] {
  const definitions = toolbar.filters ?? []
  return rows.filter((row) => {
    if (!matchSearch(query.search, toolbar.searchFields(row))) return false
    return definitions.every((definition) => {
      const value = query.values[definition.key] ?? ALL_VALUE
      return value === ALL_VALUE || definition.predicate(row, value)
    })
  })
}

export function countActiveFilters<T>(definitions: readonly FilterDefinition<T>[], values: Record<string, string>): number {
  return definitions.filter((definition) => (values[definition.key] ?? ALL_VALUE) !== ALL_VALUE).length
}

export function isDefaultQuery<T>(definitions: readonly FilterDefinition<T>[], query: TableQueryValues): boolean {
  return query.search === '' && countActiveFilters(definitions, query.values) === 0
}

export function hasChoiceFilters<T>(definitions: readonly FilterDefinition<T>[]): boolean {
  return definitions.some((definition) => definition.kind !== 'select')
}
