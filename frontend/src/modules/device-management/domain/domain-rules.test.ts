import { describe, expect, it } from 'vitest'
import type { Category } from './category'
import { assertNoCategoryCycle, assertWithinDepthLimit, selectableParents, selectableRootParents } from './category-tree'
import { validateNewEquipment } from './equipment'
import { maintenanceDateToIso, validateNewMaintenanceLog } from './maintenance'

const cat = (id: string, parentId = ''): Category => ({ id, parentId, name: id, createdAt: '', modifiedAt: '', createdBy: '', lastModifiedBy: '' })
const tree = [cat('a'), cat('b', 'a'), cat('c', 'b'), cat('d')]

describe('domain rules', () => {
  it('rejects cycles and lists selectable parents', () => {
    expect(() => assertNoCategoryCycle(tree, 'a', 'c')).toThrow(expect.objectContaining({ code: 'category_cycle' }))
    expect(() => assertNoCategoryCycle(tree, 'c', 'd')).not.toThrow()
    expect(selectableParents(tree, 'a').map((c) => c.id)).toEqual(['d'])
  })

  it('limits categories to two levels', () => {
    const exceeded = expect.objectContaining({ code: 'category_depth_exceeded' })
    expect(() => assertWithinDepthLimit(tree, undefined, 'a')).not.toThrow()
    expect(() => assertWithinDepthLimit(tree, undefined, 'b')).toThrow(exceeded)
    expect(() => assertWithinDepthLimit(tree, 'd', 'b')).toThrow(exceeded)
    expect(() => assertWithinDepthLimit(tree, 'd', 'a')).not.toThrow()
    // a has children, so moving it under d would create three levels.
    expect(() => assertWithinDepthLimit(tree, 'a', 'd')).toThrow(exceeded)
    expect(() => assertWithinDepthLimit(tree, 'a', '')).not.toThrow()
  })

  it('offers only valid root parents', () => {
    expect(selectableRootParents(tree).map((c) => c.id)).toEqual(['a', 'd'])
    expect(selectableRootParents(tree, 'a').map((c) => c.id)).toEqual([])
    expect(selectableRootParents([cat('x'), cat('y'), cat('z', 'x')], 'y').map((c) => c.id)).toEqual(['x'])
  })

  it('validates equipment', () => {
    const base = { categoryId: '', name: ' x ', description: '', status: 'active', quantity: 1 } as const
    expect(validateNewEquipment(base).name).toBe('x')
    expect(() => validateNewEquipment({ ...base, quantity: -1 })).toThrow(expect.objectContaining({ code: 'quantity_invalid' }))
  })

  it('validates maintenance', () => {
    expect(() => validateNewMaintenanceLog({ equipmentId: 'e', type: 'bad' as never, performedAt: '2024-01-01', note: '' })).toThrow(
      expect.objectContaining({ code: 'maintenance_type_invalid' }),
    )
    expect(maintenanceDateToIso('2024-01-02')).toBe('2024-01-02T12:00:00.000+00:00')
    expect(() => maintenanceDateToIso('nope')).toThrow(expect.objectContaining({ code: 'date_invalid' }))
  })
})
