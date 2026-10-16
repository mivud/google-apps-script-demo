import { useMemo, type ReactNode } from 'react'
import { useAsyncData } from '../../../shared/hooks/use-async-data'
import { buildTree, flattenTree, formatPath } from '../domain/category-tree'
import { CategoriesContext, type CategoriesState } from './categories-context'
import { useServices } from './services-context'

// Categories are loaded once and shared; mutations call reload() so every consumer refreshes.
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { categories } = useServices()
  const state = useAsyncData(() => categories.list(), [categories])
  const { data } = state

  const value = useMemo<CategoriesState>(() => {
    const list = data ?? []
    return { ...state, flat: flattenTree(buildTree(list)), pathOf: (id) => formatPath(list, id) }
    // `state` is a fresh object each render; its fields are the real dependencies.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [data, state.loading, state.error, state.reload])

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}
