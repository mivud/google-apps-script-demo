import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DataService } from '../../../application/data-service'
import type { EquipmentStatus, NewEquipment } from '../../../domain/equipment'
import type { NewMaintenanceLog } from '../../../domain/maintenance'
import { NotFoundError, ValidationError } from '../../../../../shared/errors'
import { CategoryService } from '../../../application/category-service'
import { EquipmentService } from '../../../application/equipment-service'

const MISSING_ID = '00000000-0000-4000-8000-000000000000'
const MALFORMED_ID = 'not-a-uuid'

// Unique per run so concurrent or leftover data never affects assertions.
const runTag = Math.random().toString(36).slice(2, 8)
const UTC_OFFSET_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+00:00$/
// Assigned in beforeAll; every sample equipment lives under this category so list assertions stay isolated.
let categoryId = ''

const sample = (name: string, extra: Partial<NewEquipment> = {}): NewEquipment => ({
  categoryId,
  name,
  description: 'created by contract test',
  status: 'active',
  quantity: 2,
  ...extra,
})

// Gives timestamps (second or millisecond precision) room to differ between writes.
const tick = (ms = 1100): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Every adapter must pass this suite so they stay substitutable behind DataService.
// Run it only against a dedicated test sheet/project, never production data.
export function runDataServiceContract(label: string, createService: () => DataService): void {
  describe(`DataService contract: ${label}`, () => {
    const service = createService()
    const createdIds: string[] = []
    const createdCategoryIds: string[] = []

    const trackCategory = async (name: string, parentId = '') => {
      const created = await service.createCategory({ parentId, name: `${name}-${runTag}` })
      createdCategoryIds.push(created.id)
      return created
    }

    beforeAll(async () => {
      categoryId = (await trackCategory('contract-root')).id
    })

    const track = async (input: NewEquipment) => {
      const created = await service.create(input)
      createdIds.push(created.id)
      return created
    }

    afterAll(async () => {
      for (const id of createdIds) await service.remove(id).catch(() => undefined)
      // Newest first so children are deleted before their parents.
      for (const id of [...createdCategoryIds].reverse()) await service.removeCategory(id).catch(() => undefined)
    })

    it('creates and reads equipment', async () => {
      const created = await track(sample('Contract Drill'))
      expect(created.quantity).toBe(2)
      expect(await service.get(created.id)).toEqual(created)
    })

    it('returns null optional details for old-style rows and normalizes blanks', async () => {
      const created = await track(sample('Contract Blank Details', { note: '  ', vendor: '', purchaseDate: ' ' }))
      expect(created).toMatchObject({ purchaseDate: null, warrantyMonths: null, warrantyExpiryDate: null, note: null, vendor: null })
    })

    it('derives the warranty expiry with end-of-month clamping', async () => {
      const created = await track(sample('Contract Warranty', { purchaseDate: '2024-01-31', warrantyMonths: 1, vendor: 'Acme', note: 'n' }))
      expect(created).toMatchObject({ purchaseDate: '2024-01-31', warrantyMonths: 1, warrantyExpiryDate: '2024-02-29', vendor: 'Acme', note: 'n' })
      const zero = await service.update(created.id, { warrantyMonths: 0 })
      expect(zero.warrantyExpiryDate).toBe('2024-01-31')
      const cleared = await service.update(created.id, { warrantyMonths: null })
      expect(cleared.warrantyExpiryDate).toBeNull()
      expect(await service.get(created.id)).toEqual(cleared)
    })

    it('rejects invalid warranty input', async () => {
      await expect(service.create(sample('Contract Bad Warranty', { warrantyMonths: 12 }))).rejects.toBeInstanceOf(ValidationError)
      await expect(
        service.create(sample('Contract Bad Months', { purchaseDate: '2024-01-01', warrantyMonths: 601 })),
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('returns null for a missing or malformed id', async () => {
      expect(await service.get(MISSING_ID)).toBeNull()
      expect(await service.get(MALFORMED_ID)).toBeNull()
    })

    it('updates and bumps modifiedAt', async () => {
      const created = await track(sample('Contract Saw'))
      await tick()
      const updated = await service.update(created.id, { status: 'in_repair' })
      expect(updated.status).toBe('in_repair')
      expect(updated.modifiedAt > created.modifiedAt).toBe(true)
      expect(updated.createdAt).toBe(created.createdAt)
    })

    it('fills audit fields in UTC offset format', async () => {
      const created = await track(sample('Contract Audit'))
      expect(created.createdAt).toMatch(UTC_OFFSET_ISO)
      expect(created.modifiedAt).toMatch(UTC_OFFSET_ISO)
      expect(created.createdBy).toBe('')
      expect(created.lastModifiedBy).toBe('')
      const log = await service.add({
        equipmentId: created.id,
        type: 'new',
        performedAt: '2026-01-01T00:00:00.000+00:00',
        note: '',
      })
      expect(log.performedAt).toBe('2026-01-01T00:00:00.000+00:00')
      for (const value of [log.createdAt, log.modifiedAt]) expect(value).toMatch(UTC_OFFSET_ISO)
      expect(log.createdBy).toBe('')
      expect(log.lastModifiedBy).toBe('')
    })

    it('rejects invalid input', async () => {
      await expect(service.create({ ...sample('x'), quantity: -1 })).rejects.toBeInstanceOf(ValidationError)
      await expect(service.create(sample(''))).rejects.toBeInstanceOf(ValidationError)
      await expect(
        service.create({ ...sample('Bad Status'), status: 'bogus' as EquipmentStatus }),
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('throws NotFoundError when updating or removing a missing or malformed id', async () => {
      for (const id of [MISSING_ID, MALFORMED_ID]) {
        await expect(service.update(id, { name: 'y' })).rejects.toBeInstanceOf(NotFoundError)
        await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundError)
      }
    })

    it('lists newest-updated first', async () => {
      const a = await track(sample('Contract Order A'))
      await tick()
      const b = await track(sample('Contract Order B'))
      await tick()
      const updatedA = await service.update(a.id, { quantity: 5 })
      const page = await service.list({ categoryIds: [categoryId], page: 1, pageSize: 50 })
      const ids = page.items.map((item) => item.id)
      expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id))
      expect(updatedA.modifiedAt > b.modifiedAt).toBe(true)
      for (let i = 1; i < page.items.length; i++) {
        expect(page.items[i - 1].modifiedAt >= page.items[i].modifiedAt).toBe(true)
      }
    })

    it('paginates with disjoint pages and handles out-of-range pages', async () => {
      await track(sample('Contract Page A'))
      await track(sample('Contract Page B'))
      await track(sample('Contract Page C'))
      const query = { categoryIds: [categoryId], pageSize: 1 }
      const first = await service.list({ ...query, page: 1 })
      const second = await service.list({ ...query, page: 2 })
      expect(first.items).toHaveLength(1)
      expect(second.items).toHaveLength(1)
      expect(second.items[0].id).not.toBe(first.items[0].id)
      expect(first.total).toBeGreaterThanOrEqual(3)
      expect(second.total).toBe(first.total)

      const beyond = await service.list({ ...query, page: first.total + 10 })
      expect(beyond.items).toEqual([])
      expect(beyond.total).toBe(first.total)
    })

    it('filters by search term, case-insensitively', async () => {
      const created = await track(sample('Zebra Contract Lathe'))
      for (const search of ['zebra contract', 'ZEBRA CONTRACT']) {
        const page = await service.list({ search, page: 1, pageSize: 10 })
        expect(page.items.some((item) => item.id === created.id)).toBe(true)
      }
    })

    it('treats special characters in search as plain text', async () => {
      const created = await track(sample('Contract 50%_off, (promo)'))
      for (const search of ['%', '_', ',', '(', ')', '50%_off, (promo)']) {
        const page = await service.list({ search, page: 1, pageSize: 10 })
        expect(Array.isArray(page.items)).toBe(true)
      }
      const exact = await service.list({ search: '50%_off, (promo)', page: 1, pageSize: 10 })
      expect(exact.items.some((item) => item.id === created.id)).toBe(true)
    })

    it('filters by category and status', async () => {
      const active = await track(sample('Contract Filter Active'))
      const retired = await track(sample('Contract Filter Retired', { status: 'retired' }))
      const byCategory = await service.list({ categoryIds: [categoryId], page: 1, pageSize: 100 })
      const ids = byCategory.items.map((item) => item.id)
      expect(ids).toContain(active.id)
      expect(ids).toContain(retired.id)
      expect(byCategory.items.every((item) => item.categoryId === categoryId)).toBe(true)

      const byStatus = await service.list({ categoryIds: [categoryId], status: 'retired', page: 1, pageSize: 100 })
      const statusIds = byStatus.items.map((item) => item.id)
      expect(statusIds).toContain(retired.id)
      expect(statusIds).not.toContain(active.id)
      expect(byStatus.items.every((item) => item.status === 'retired')).toBe(true)
    })

    it('rejects an unknown category id with NotFoundError', async () => {
      await expect(service.create(sample('Contract Orphan', { categoryId: MISSING_ID }))).rejects.toBeInstanceOf(NotFoundError)
      const created = await track(sample('Contract Orphan Update'))
      await expect(service.update(created.id, { categoryId: MISSING_ID })).rejects.toBeInstanceOf(NotFoundError)
    })

    it('filtering by a parent category includes its descendants', async () => {
      const parent = await trackCategory('contract-filter-parent', categoryId)
      const child = await trackCategory('contract-filter-child', parent.id)
      const inParent = await track(sample('Contract In Parent', { categoryId: parent.id }))
      const inChild = await track(sample('Contract In Child', { categoryId: child.id }))
      const elsewhere = await track(sample('Contract Elsewhere'))
      const equipmentService = new EquipmentService(service, new CategoryService(service))
      const page = await equipmentService.list({ categoryId: parent.id, pageSize: 100 })
      const ids = page.items.map((item) => item.id)
      expect(ids).toContain(inParent.id)
      expect(ids).toContain(inChild.id)
      expect(ids).not.toContain(elsewhere.id)
    })

    it('creates, reads, renames, moves and lists categories', async () => {
      const a = await trackCategory('contract-cat-a')
      const b = await trackCategory('contract-cat-b')
      expect(a.parentId).toBe('')
      expect(a.createdAt).toMatch(UTC_OFFSET_ISO)
      expect(await service.getCategory(a.id)).toEqual(a)
      expect(await service.getCategory(MISSING_ID)).toBeNull()

      const renamed = await service.updateCategory(a.id, { name: `contract-cat-a2-${runTag}` })
      expect(renamed.name).toBe(`contract-cat-a2-${runTag}`)
      expect((await service.updateCategory(b.id, { parentId: a.id })).parentId).toBe(a.id)
      expect((await service.updateCategory(b.id, { parentId: '' })).parentId).toBe('')

      const all = await service.listCategories()
      expect(all.map((c) => c.id)).toEqual(expect.arrayContaining([a.id, b.id]))
      const names = all.map((c) => c.name.toLowerCase())
      expect(names).toEqual([...names].sort())
    })

    it('rejects blank names and duplicate sibling names but allows them under other parents', async () => {
      const parent = await trackCategory('contract-dup-parent')
      const other = await trackCategory('contract-dup-other')
      await trackCategory('contract-dup', parent.id)
      await expect(service.createCategory({ parentId: '', name: '' })).rejects.toMatchObject({ code: 'category_name_required' })
      await expect(service.createCategory({ parentId: parent.id, name: `contract-dup-${runTag}` })).rejects.toMatchObject({
        code: 'category_name_duplicate',
      })
      await trackCategory('contract-dup', other.id)
    })

    it('rejects cycles', async () => {
      const top = await trackCategory('contract-cycle-top')
      const mid = await trackCategory('contract-cycle-mid', top.id)
      const leaf = await trackCategory('contract-cycle-leaf', mid.id)
      for (const [id, parentId] of [[top.id, top.id], [top.id, leaf.id], [mid.id, leaf.id]]) {
        await expect(service.updateCategory(id, { parentId })).rejects.toMatchObject({ code: 'category_cycle' })
      }
    })

    it('blocks deleting a category with children or equipment', async () => {
      const parent = await trackCategory('contract-del-parent')
      const child = await trackCategory('contract-del-child', parent.id)
      await expect(service.removeCategory(parent.id)).rejects.toMatchObject({ code: 'category_has_children' })
      const item = await track(sample('Contract Del Item', { categoryId: child.id }))
      await expect(service.removeCategory(child.id)).rejects.toMatchObject({ code: 'category_in_use' })
      await service.remove(item.id)
      await service.removeCategory(child.id)
      expect(await service.getCategory(child.id)).toBeNull()
    })

    it('throws NotFoundError for unknown categories and parents', async () => {
      await expect(service.createCategory({ parentId: MISSING_ID, name: `contract-orphan-${runTag}` })).rejects.toBeInstanceOf(NotFoundError)
      for (const id of [MISSING_ID, MALFORMED_ID]) {
        await expect(service.updateCategory(id, { name: 'y' })).rejects.toBeInstanceOf(NotFoundError)
        await expect(service.removeCategory(id)).rejects.toBeInstanceOf(NotFoundError)
      }
    })

    it('records maintenance logs newest first and rejects unknown equipment', async () => {
      const created = await track(sample('Contract Press'))
      await service.add({ equipmentId: created.id, type: 'new', performedAt: '2026-01-01T00:00:00.000+00:00', note: 'bought' })
      await service.add({ equipmentId: created.id, type: 'repair', performedAt: '2026-03-01T00:00:00.000+00:00', note: 'fixed' })
      const logs = await service.listByEquipment(created.id)
      expect(logs.map((log) => log.type)).toEqual(['repair', 'new'])
      await expect(
        service.add({ equipmentId: MISSING_ID, type: 'repair', performedAt: '2026-03-01T00:00:00.000+00:00', note: '' }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('validates the maintenance type before looking up the equipment', async () => {
      const invalid = {
        equipmentId: MISSING_ID,
        type: 'bogus',
        performedAt: '2026-03-01T00:00:00.000+00:00',
        note: '',
      } as unknown as NewMaintenanceLog
      await expect(service.add(invalid)).rejects.toBeInstanceOf(ValidationError)
    })

    it('removes maintenance logs together with their equipment', async () => {
      const created = await track(sample('Contract Cascade'))
      await service.add({ equipmentId: created.id, type: 'maintenance', performedAt: '2026-02-01T00:00:00.000+00:00', note: '' })
      expect(await service.listByEquipment(created.id)).toHaveLength(1)
      await service.remove(created.id)
      expect(await service.listByEquipment(created.id)).toEqual([])
    })
  })
}
