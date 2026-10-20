import { describe, expect, it } from 'vitest'
import type { Category } from './category'
import { assertNoCategoryCycle, assertWithinDepthLimit, selectableParents, selectableRootParents } from './category-tree'
import { validateNewEquipment } from './equipment'
import { maintenanceDateToIso, validateNewMaintenanceLog } from './maintenance'
import { computeWarrantyExpiry } from './warranty'

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

  it('normalizes optional equipment details to null', () => {
    const base = { categoryId: '', name: 'x', description: '', status: 'active', quantity: 1 } as const
    expect(validateNewEquipment(base)).toMatchObject({ purchaseDate: null, warrantyMonths: null, note: null, vendor: null })
    expect(validateNewEquipment({ ...base, note: '  ', vendor: ' Acme ', purchaseDate: ' ' })).toMatchObject({
      note: null, vendor: 'Acme', purchaseDate: null,
    })
  })

  it('validates warranty rules', () => {
    const base = { categoryId: '', name: 'x', description: '', status: 'active', quantity: 1 } as const
    const code = (value: string) => expect.objectContaining({ code: value })
    expect(validateNewEquipment({ ...base, purchaseDate: '2999-01-01', warrantyMonths: 0 }).warrantyMonths).toBe(0)
    expect(validateNewEquipment({ ...base, purchaseDate: '2024-02-29' }).warrantyMonths).toBeNull()
    expect(() => validateNewEquipment({ ...base, warrantyMonths: 12 })).toThrow(code('warranty_requires_purchase_date'))
    expect(() => validateNewEquipment({ ...base, purchaseDate: '2024-01-01', warrantyMonths: 601 })).toThrow(code('warranty_months_invalid'))
    expect(() => validateNewEquipment({ ...base, purchaseDate: '2024-01-01', warrantyMonths: 1.5 })).toThrow(code('warranty_months_invalid'))
    expect(() => validateNewEquipment({ ...base, purchaseDate: '2023-02-29' })).toThrow(code('purchase_date_invalid'))
    expect(() => validateNewEquipment({ ...base, note: 'n'.repeat(2001) })).toThrow(code('note_too_long'))
    expect(() => validateNewEquipment({ ...base, vendor: 'v'.repeat(201) })).toThrow(code('vendor_too_long'))
  })

  it('computes the warranty expiry with end-of-month clamping', () => {
    expect(computeWarrantyExpiry('2024-01-31', 1)).toBe('2024-02-29')
    expect(computeWarrantyExpiry('2023-01-31', 1)).toBe('2023-02-28')
    expect(computeWarrantyExpiry('2024-03-15', 0)).toBe('2024-03-15')
    expect(computeWarrantyExpiry('2024-11-30', 3)).toBe('2025-02-28')
    expect(computeWarrantyExpiry('2024-02-29', 12)).toBe('2025-02-28')
    expect(computeWarrantyExpiry('2024-02-29', 600)).toBe('2074-02-28')
    expect(computeWarrantyExpiry(null, 12)).toBeNull()
    expect(computeWarrantyExpiry('2024-01-01', null)).toBeNull()
  })

  it('validates maintenance', () => {
    expect(() => validateNewMaintenanceLog({ equipmentId: 'e', type: 'bad' as never, performedAt: '2024-01-01', note: '' })).toThrow(
      expect.objectContaining({ code: 'maintenance_type_invalid' }),
    )
    expect(maintenanceDateToIso('2024-01-02')).toBe('2024-01-02T12:00:00.000+00:00')
    expect(() => maintenanceDateToIso('nope')).toThrow(expect.objectContaining({ code: 'date_invalid' }))
  })
})
