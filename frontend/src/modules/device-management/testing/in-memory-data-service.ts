import { NotFoundError, ValidationError } from '../../../shared/errors'
import type { Page } from '../../../shared/page'
import { validateCategoryName } from '../domain/category'
import { assertNoCategoryCycle } from '../domain/category-tree'
import type { Category, NewCategory } from '../domain/category'
import { validateNewEquipment, type Equipment, type NewEquipment } from '../domain/equipment'
import { validateNewMaintenanceLog, type MaintenanceLog, type NewMaintenanceLog } from '../domain/maintenance'
import type { DataService } from '../application/data-service'
import type { EquipmentQuery } from '../application/equipment-repository'

// Test double mirroring the real adapters' semantics (ordering, paging, errors, cascade).
export class InMemoryDataService implements DataService {
  private equipment = new Map<string, Equipment>()
  private logs = new Map<string, MaintenanceLog>()
  private categories = new Map<string, Category>()
  private counter = 0
  private lastTime = 0

  // Strictly increasing so "modifiedAt DESC" is deterministic even within one millisecond.
  private now(): string {
    this.lastTime = Math.max(Date.now(), this.lastTime + 1)
    return new Date(this.lastTime).toISOString().replace('Z', '+00:00')
  }

  private nextId(): string {
    this.counter += 1
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`
  }

  private audit() {
    const stamp = this.now()
    return { createdAt: stamp, modifiedAt: stamp, createdBy: '', lastModifiedBy: '' }
  }

  async list(query: EquipmentQuery): Promise<Page<Equipment>> {
    const term = query.search?.trim().toLowerCase()
    const matches = [...this.equipment.values()]
      .filter((item) => !query.categoryIds || query.categoryIds.includes(item.categoryId))
      .filter((item) => !query.status || item.status === query.status)
      .filter((item) => !term || `${item.name} ${item.description}`.toLowerCase().includes(term))
      .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1))
    const start = (query.page - 1) * query.pageSize
    return { items: matches.slice(start, start + query.pageSize), total: matches.length, page: query.page, pageSize: query.pageSize }
  }

  async get(id: string): Promise<Equipment | null> {
    return this.equipment.get(id) ?? null
  }

  async create(input: NewEquipment): Promise<Equipment> {
    const valid = validateNewEquipment(input)
    this.requireCategory(valid.categoryId)
    const created: Equipment = { ...valid, id: this.nextId(), ...this.audit() }
    this.equipment.set(created.id, created)
    return created
  }

  async update(id: string, patch: Partial<NewEquipment>): Promise<Equipment> {
    const current = this.requireEquipment(id)
    const { id: _id, createdAt: _c, modifiedAt: _m, createdBy: _cb, lastModifiedBy: _lb, ...fields } = current
    const next = { ...current, ...validateNewEquipment({ ...fields, ...patch }) }
    this.requireCategory(next.categoryId)
    const updated = { ...next, modifiedAt: this.now() }
    this.equipment.set(id, updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    this.requireEquipment(id)
    this.equipment.delete(id)
    for (const log of this.logs.values()) if (log.equipmentId === id) this.logs.delete(log.id)
  }

  async listByEquipment(equipmentId: string): Promise<MaintenanceLog[]> {
    return [...this.logs.values()]
      .filter((log) => log.equipmentId === equipmentId)
      .sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1))
  }

  async add(input: NewMaintenanceLog): Promise<MaintenanceLog> {
    const valid = validateNewMaintenanceLog(input)
    this.requireEquipment(valid.equipmentId)
    const created: MaintenanceLog = { ...valid, id: this.nextId(), ...this.audit() }
    this.logs.set(created.id, created)
    return created
  }

  async listCategories(): Promise<Category[]> {
    return [...this.categories.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  }

  async getCategory(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null
  }

  async createCategory(input: NewCategory): Promise<Category> {
    this.validateCategory(input.name, input.parentId)
    const created: Category = { ...input, id: this.nextId(), ...this.audit() }
    this.categories.set(created.id, created)
    return created
  }

  async updateCategory(id: string, patch: Partial<NewCategory>): Promise<Category> {
    const current = this.requireCategoryRow(id)
    const next = { ...current, ...patch }
    this.validateCategory(next.name, next.parentId, id)
    const updated = { ...next, modifiedAt: this.now() }
    this.categories.set(id, updated)
    return updated
  }

  async removeCategory(id: string): Promise<void> {
    this.requireCategoryRow(id)
    const all = [...this.categories.values()]
    if (all.some((category) => category.parentId === id)) throw new ValidationError('Has children', 'category_has_children')
    if ([...this.equipment.values()].some((item) => item.categoryId === id)) throw new ValidationError('In use', 'category_in_use')
    this.categories.delete(id)
  }

  private validateCategory(name: string, parentId: string, selfId?: string): void {
    validateCategoryName(name)
    if (parentId) this.requireCategoryRow(parentId)
    if (selfId) assertNoCategoryCycle([...this.categories.values()], selfId, parentId)
    const lowered = name.trim().toLowerCase()
    const duplicate = [...this.categories.values()].some(
      (other) => other.id !== selfId && other.parentId === parentId && other.name.trim().toLowerCase() === lowered,
    )
    if (duplicate) throw new ValidationError('Duplicate name', 'category_name_duplicate')
  }

  // '' means uncategorized and is always valid.
  private requireCategory(id: string): void {
    if (id) this.requireCategoryRow(id)
  }

  private requireCategoryRow(id: string): Category {
    const found = this.categories.get(id)
    if (!found) throw new NotFoundError(`Category ${id} not found`)
    return found
  }

  private requireEquipment(id: string): Equipment {
    const found = this.equipment.get(id)
    if (!found) throw new NotFoundError(`Equipment ${id} not found`)
    return found
  }
}
