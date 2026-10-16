import type { Category, NewCategory } from '../domain/category'

// Method names carry a suffix because DataService merges all repositories into one object.
export interface CategoryRepository {
  // All rows, no paging, sorted by name case-insensitively.
  listCategories(): Promise<Category[]>
  getCategory(id: string): Promise<Category | null>
  createCategory(input: NewCategory): Promise<Category>
  updateCategory(id: string, patch: Partial<NewCategory>): Promise<Category>
  removeCategory(id: string): Promise<void>
}
