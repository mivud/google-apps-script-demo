import type { Page } from '../../../shared/page'
import type { EquipmentQuery, EquipmentRepository } from './equipment-repository'
import { validateNewEquipment, type Equipment, type NewEquipment } from '../domain/equipment'
import { NotFoundError } from '../../../shared/errors'

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

// Narrow dependency: only what is needed to expand a category filter.
export interface CategoryDescendants {
  getDescendantIds(id: string): Promise<string[]>
}

export type EquipmentListQuery = Partial<Omit<EquipmentQuery, 'categoryIds'>> & { categoryId?: string }

export class EquipmentService {
  private readonly repository: EquipmentRepository
  private readonly categories: CategoryDescendants

  constructor(repository: EquipmentRepository, categories: CategoryDescendants) {
    this.repository = repository
    this.categories = categories
  }

  // A category filter includes the category itself and every descendant.
  async list(query: EquipmentListQuery = {}): Promise<Page<Equipment>> {
    const rawPage = Math.floor(query.page ?? 1)
    const rawSize = Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1
    const pageSize = Number.isFinite(rawSize) ? Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize)) : DEFAULT_PAGE_SIZE
    const { categoryId, ...rest } = query
    const categoryIds = categoryId ? [categoryId, ...(await this.categories.getDescendantIds(categoryId))] : undefined
    return this.repository.list({ ...rest, categoryIds, page, pageSize })
  }

  async get(id: string): Promise<Equipment> {
    const equipment = await this.repository.get(id)
    if (!equipment) throw new NotFoundError(`Equipment ${id} not found`)
    return equipment
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async create(input: NewEquipment): Promise<Equipment> {
    return this.repository.create(validateNewEquipment(input))
  }

  // Takes a full NewEquipment, so an empty patch cannot occur through this API.
  async update(id: string, input: NewEquipment): Promise<Equipment> {
    return this.repository.update(id, validateNewEquipment(input))
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(id)
  }
}
