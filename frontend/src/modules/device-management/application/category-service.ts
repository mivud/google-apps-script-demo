import type { CategoryRepository } from './category-repository'
import { validateCategoryName, type Category, type NewCategory } from '../domain/category'
import { assertNoCategoryCycle, assertWithinDepthLimit, getDescendantIds } from '../domain/category-tree'

export class CategoryService {
  private readonly repository: CategoryRepository

  constructor(repository: CategoryRepository) {
    this.repository = repository
  }

  list(): Promise<Category[]> {
    return this.repository.listCategories()
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async create(input: NewCategory): Promise<Category> {
    const name = validateCategoryName(input.name)
    if (input.parentId) assertWithinDepthLimit(await this.repository.listCategories(), undefined, input.parentId)
    return this.repository.createCategory({ ...input, name })
  }

  async update(id: string, patch: Partial<NewCategory>): Promise<Category> {
    const normalized = { ...patch }
    if (patch.name !== undefined) normalized.name = validateCategoryName(patch.name)
    // Fresh tree so a move under the category's own subtree is rejected before any provider call.
    if (patch.parentId) {
      const all = await this.repository.listCategories()
      assertNoCategoryCycle(all, id, patch.parentId)
      assertWithinDepthLimit(all, id, patch.parentId)
    }
    return this.repository.updateCategory(id, normalized)
  }

  remove(id: string): Promise<void> {
    return this.repository.removeCategory(id)
  }

  // Ids of every category below `id`, fetched fresh so filters never use a stale tree.
  async getDescendantIds(id: string): Promise<string[]> {
    return getDescendantIds(await this.repository.listCategories(), id)
  }
}
