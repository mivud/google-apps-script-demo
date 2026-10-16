import { ValidationError } from '../../../shared/errors'

export interface Category {
  id: string
  // '' marks a root category (Postgres NULL / empty Sheet cell).
  parentId: string
  name: string
  // Audit fields are filled by the backend; datetimes are UTC with a "+00:00" offset.
  createdAt: string
  modifiedAt: string
  createdBy: string
  lastModifiedBy: string
}

export type NewCategory = Omit<Category, 'id' | 'createdAt' | 'modifiedAt' | 'createdBy' | 'lastModifiedBy'>

// Names are stored trimmed; blank names are rejected before reaching any provider.
export function validateCategoryName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new ValidationError('Category name is required', 'category_name_required')
  return trimmed
}
