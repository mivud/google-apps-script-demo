// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ALL_VALUE, MAX_SEARCH_LENGTH, TOGGLE_ON, type FilterDefinition } from '../table-filters'
import { useLocalTableQuery, useUrlTableQuery } from './use-table-query'

const definitions: FilterDefinition<unknown>[] = [
  { key: 'kind', label: 'Kind', kind: 'select', options: [{ value: ALL_VALUE, label: 'All' }, { value: 'a', label: 'A' }], predicate: () => true },
  { key: 'urgent', label: 'Urgent', kind: 'toggle', predicate: () => true },
]

const at = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>

describe('useLocalTableQuery', () => {
  it('sets, caps and clears search and filters', () => {
    const { result } = renderHook(() => useLocalTableQuery(definitions))
    expect(result.current.values).toEqual({ kind: ALL_VALUE, urgent: ALL_VALUE })
    act(() => result.current.setSearch('x'.repeat(MAX_SEARCH_LENGTH + 20)))
    act(() => result.current.setValue('kind', 'a'))
    expect(result.current.search).toHaveLength(MAX_SEARCH_LENGTH)
    expect(result.current.values.kind).toBe('a')
    act(() => result.current.clear())
    expect(result.current.search).toBe('')
    expect(result.current.values.kind).toBe(ALL_VALUE)
  })
})

describe('useUrlTableQuery', () => {
  it('reads known values from the URL', () => {
    const { result } = renderHook(() => useUrlTableQuery(definitions), { wrapper: at('/?q=rent&kind=a&urgent=on') })
    expect(result.current.search).toBe('rent')
    expect(result.current.values).toEqual({ kind: 'a', urgent: TOGGLE_ON })
  })

  it('falls back to "all" for hand-edited unknown values', () => {
    const { result } = renderHook(() => useUrlTableQuery(definitions), { wrapper: at('/?kind=evil&urgent=yes') })
    expect(result.current.values).toEqual({ kind: ALL_VALUE, urgent: ALL_VALUE })
  })

  it('writes changes back and removes "all" from the URL', () => {
    const { result } = renderHook(() => useUrlTableQuery(definitions), { wrapper: at('/') })
    act(() => result.current.setValue('kind', 'a'))
    act(() => result.current.setSearch('abc'))
    expect(result.current.values.kind).toBe('a')
    expect(result.current.search).toBe('abc')
    act(() => result.current.setValue('kind', ALL_VALUE))
    expect(result.current.values.kind).toBe(ALL_VALUE)
    act(() => result.current.clear())
    expect(result.current.search).toBe('')
  })
})
