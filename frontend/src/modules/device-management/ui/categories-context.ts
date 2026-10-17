import { createContext, useContext } from 'react'
import type { AsyncData } from '../../../shared/hooks/use-async-data'
import type { FlatCategory } from '../domain/category-tree'
import type { Category } from '../domain/category'

export interface CategoriesState extends AsyncData<Category[]> {
  // Depth-first rows with full paths, ready for trees and selects.
  flat: FlatCategory[]
  pathOf: (id: string) => string
}

export const CategoriesContext = createContext<CategoriesState | undefined>(undefined)

export function useCategories(): CategoriesState {
  const value = useContext(CategoriesContext)
  if (!value) throw new Error('useCategories must be used inside CategoriesProvider')
  return value
}
