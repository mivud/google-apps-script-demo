import { beforeEach, describe, expect, it } from 'vitest'
import { CategoryService } from './category-service'
import { InMemoryDataService } from '../testing/in-memory-data-service'

let service: CategoryService
let store: InMemoryDataService

beforeEach(() => {
  store = new InMemoryDataService()
  service = new CategoryService(store)
})

describe('CategoryService', () => {
  it('trims names on create and update', async () => {
    const created = await service.create({ parentId: '', name: '  Tools ' })
    expect(created.name).toBe('Tools')
    expect((await service.update(created.id, { name: ' Power ' })).name).toBe('Power')
  })

  it('rejects blank names', async () => {
    await expect(service.create({ parentId: '', name: '   ' })).rejects.toMatchObject({ code: 'category_name_required' })
    const created = await service.create({ parentId: '', name: 'A' })
    await expect(service.update(created.id, { name: '' })).rejects.toMatchObject({ code: 'category_name_required' })
  })

  it('rejects a category as its own parent', async () => {
    const created = await service.create({ parentId: '', name: 'A' })
    await expect(service.update(created.id, { parentId: created.id })).rejects.toMatchObject({ code: 'category_cycle' })
  })

  // Legacy three-level data is seeded straight into the store, bypassing the depth rule.
  it('rejects moving a category under its own descendant', async () => {
    const a = await store.createCategory({ parentId: '', name: 'A' })
    const b = await store.createCategory({ parentId: a.id, name: 'B' })
    const c = await store.createCategory({ parentId: b.id, name: 'C' })
    await expect(service.update(a.id, { parentId: c.id })).rejects.toMatchObject({ code: 'category_cycle' })
  })

  it('rejects a third level on create and update', async () => {
    const a = await service.create({ parentId: '', name: 'A' })
    const b = await service.create({ parentId: a.id, name: 'B' })
    const d = await service.create({ parentId: '', name: 'D' })
    await expect(service.create({ parentId: b.id, name: 'C' })).rejects.toMatchObject({ code: 'category_depth_exceeded' })
    await expect(service.update(d.id, { parentId: b.id })).rejects.toMatchObject({ code: 'category_depth_exceeded' })
    await expect(service.update(a.id, { parentId: d.id })).rejects.toMatchObject({ code: 'category_depth_exceeded' })
  })

  it('returns descendant ids', async () => {
    const a = await store.createCategory({ parentId: '', name: 'A' })
    const b = await store.createCategory({ parentId: a.id, name: 'B' })
    const c = await store.createCategory({ parentId: b.id, name: 'C' })
    expect((await service.getDescendantIds(a.id)).sort()).toEqual([b.id, c.id].sort())
  })

  it('lists and removes', async () => {
    const a = await service.create({ parentId: '', name: 'A' })
    expect(await service.list()).toHaveLength(1)
    await service.remove(a.id)
    expect(await service.list()).toEqual([])
  })
})
