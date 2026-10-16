import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors'
import type { NewEquipment } from '../domain/equipment'
import { CategoryService } from './category-service'
import { DEFAULT_PAGE_SIZE, EquipmentService, MAX_PAGE_SIZE } from './equipment-service'
import { InMemoryDataService } from '../testing/in-memory-data-service'

const sample = (extra: Partial<NewEquipment> = {}): NewEquipment => ({
  categoryId: '', name: 'Drill', description: '', status: 'active', quantity: 1, ...extra,
})

let categories: CategoryService
let service: EquipmentService

beforeEach(() => {
  const data = new InMemoryDataService()
  categories = new CategoryService(data)
  service = new EquipmentService(data, categories)
})

describe('EquipmentService validation', () => {
  it('trims text fields on create', async () => {
    const created = await service.create(sample({ name: '  Saw ', description: ' x ' }))
    expect(created).toMatchObject({ name: 'Saw', description: 'x' })
  })

  it('rejects blank name, bad quantity and bad status', async () => {
    await expect(service.create(sample({ name: ' ' }))).rejects.toMatchObject({ code: 'name_required' })
    await expect(service.create(sample({ quantity: -1 }))).rejects.toMatchObject({ code: 'quantity_invalid' })
    await expect(service.create(sample({ quantity: 1.5 }))).rejects.toMatchObject({ code: 'quantity_invalid' })
    await expect(service.create(sample({ status: 'x' as never }))).rejects.toMatchObject({ code: 'status_invalid' })
  })

  it('validates on update too', async () => {
    const created = await service.create(sample())
    await expect(service.update(created.id, sample({ name: '' }))).rejects.toMatchObject({ code: 'name_required' })
  })
})

describe('EquipmentService.get', () => {
  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.get('missing')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('EquipmentService.list', () => {
  it('uses default paging and orders by modifiedAt DESC', async () => {
    const a = await service.create(sample({ name: 'A' }))
    const b = await service.create(sample({ name: 'B' }))
    const page = await service.list()
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: DEFAULT_PAGE_SIZE })
    expect(page.items.map((i) => i.id)).toEqual([b.id, a.id])
  })

  it('clamps page and pageSize', async () => {
    expect(await service.list({ page: 0, pageSize: 1000 })).toMatchObject({ page: 1, pageSize: MAX_PAGE_SIZE })
    expect(await service.list({ page: NaN, pageSize: 0 })).toMatchObject({ page: 1, pageSize: 1 })
  })

  it('paginates', async () => {
    for (const name of ['A', 'B', 'C']) await service.create(sample({ name }))
    const second = await service.list({ page: 2, pageSize: 2 })
    expect(second.items).toHaveLength(1)
    expect(second.total).toBe(3)
  })

  it('includes descendant categories when filtering by category', async () => {
    const parent = await categories.create({ parentId: '', name: 'P' })
    const child = await categories.create({ parentId: parent.id, name: 'C' })
    const other = await categories.create({ parentId: '', name: 'O' })
    await service.create(sample({ name: 'in parent', categoryId: parent.id }))
    await service.create(sample({ name: 'in child', categoryId: child.id }))
    await service.create(sample({ name: 'elsewhere', categoryId: other.id }))
    const page = await service.list({ categoryId: parent.id })
    expect(page.items.map((i) => i.name).sort()).toEqual(['in child', 'in parent'])
  })

  it('filters by status and search', async () => {
    await service.create(sample({ name: 'Red Drill' }))
    await service.create(sample({ name: 'Blue Saw', status: 'retired' }))
    expect((await service.list({ status: 'retired' })).items.map((i) => i.name)).toEqual(['Blue Saw'])
    expect((await service.list({ search: 'DRILL' })).items.map((i) => i.name)).toEqual(['Red Drill'])
  })
})

describe('EquipmentService.remove', () => {
  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundError)
  })
})
