import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ALL_VALUE, MAX_SEARCH_LENGTH, TOGGLE_ON, emptyFilterValues, type FilterDefinition } from '../table-filters'

const SEARCH_PARAM = 'q'

export interface TableQuery {
  search: string
  values: Record<string, string>
  setSearch: (search: string) => void
  setValue: (key: string, value: string) => void
  clear: () => void
}

function isKnownValue<T>(definition: FilterDefinition<T>, value: string): boolean {
  if (definition.kind === 'toggle') return value === TOGGLE_ON
  return definition.options.some((option) => option.value === value)
}

// Search and filter state kept in the component only.
export function useLocalTableQuery<T>(definitions: readonly FilterDefinition<T>[]): TableQuery {
  const [search, setSearchState] = useState('')
  const [values, setValues] = useState(() => emptyFilterValues(definitions))
  const setSearch = useCallback((next: string) => setSearchState(next.slice(0, MAX_SEARCH_LENGTH)), [])
  const setValue = useCallback((key: string, value: string) => setValues((current) => ({ ...current, [key]: value })), [])
  const clear = useCallback(() => {
    setSearchState('')
    setValues(emptyFilterValues(definitions))
  }, [definitions])
  return { search, values, setSearch, setValue, clear }
}

// Same state in the URL search params; unknown values in a hand-edited URL fall back to "all".
export function useUrlTableQuery<T>(definitions: readonly FilterDefinition<T>[]): TableQuery {
  const [params, setParams] = useSearchParams()
  const search = (params.get(SEARCH_PARAM) ?? '').slice(0, MAX_SEARCH_LENGTH)
  const values = useMemo(() => {
    const parsed = emptyFilterValues(definitions)
    for (const definition of definitions) {
      const raw = params.get(definition.key)
      if (raw !== null && isKnownValue(definition, raw)) parsed[definition.key] = raw
    }
    return parsed
  }, [definitions, params])

  const write = useCallback((key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value === '' || value === ALL_VALUE) next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }, [setParams])

  const setSearch = useCallback((next: string) => write(SEARCH_PARAM, next.slice(0, MAX_SEARCH_LENGTH)), [write])
  const clear = useCallback(() => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete(SEARCH_PARAM)
      definitions.forEach((definition) => next.delete(definition.key))
      return next
    }, { replace: true })
  }, [definitions, setParams])
  return { search, values, setSearch, setValue: write, clear }
}
