import { describe, expect, it } from 'vitest'
import {
  categoryInputToRow, equipmentPatchToRow, maintenanceInputToRow,
  rowToCategory, rowToEquipment, rowToMaintenanceLog,
} from './row-mappers'

const audit = { created_at: '2026-01-01T00:00:00Z', modified_at: '2026-01-02T00:00:00Z', created_by: 'u', last_modified_by: 'v' }
const isoAudit = { createdAt: '2026-01-01T00:00:00.000+00:00', modifiedAt: '2026-01-02T00:00:00.000+00:00' }

describe('rowToEquipment', () => {
  it('maps columns, coerces quantity and normalizes dates', () => {
    const equipment = rowToEquipment({
      id: '1', category_id: 'c', name: 'Drill', description: 'd', status: 'active',
      quantity: '3' as unknown as number, ...audit,
    })
    expect(equipment).toMatchObject({ id: '1', categoryId: 'c', quantity: 3, createdBy: 'u', lastModifiedBy: 'v', ...isoAudit })
  })

  it('turns null refs and audit users into empty strings', () => {
    const equipment = rowToEquipment({
      id: '1', category_id: null, name: 'n', description: '', status: 'active', quantity: 0,
      ...audit, created_by: null as unknown as string, last_modified_by: null as unknown as string,
    })
    expect(equipment).toMatchObject({ categoryId: '', createdBy: '', lastModifiedBy: '' })
  })
})

describe('equipmentPatchToRow', () => {
  it('maps only provided fields and keeps falsy values', () => {
    expect(equipmentPatchToRow({ quantity: 0, categoryId: '' })).toEqual({ quantity: 0, category_id: '' })
    expect(equipmentPatchToRow({})).toEqual({})
  })
})

describe('maintenance mappers', () => {
  it('maps a row to a log', () => {
    const log = rowToMaintenanceLog({
      id: 'l', equipment_id: 'e', type: 'repair', performed_at: '2026-03-01T00:00:00Z', note: 'n', ...audit,
    })
    expect(log).toMatchObject({ equipmentId: 'e', type: 'repair', performedAt: '2026-03-01T00:00:00.000+00:00', ...isoAudit })
  })

  it('maps input to a row with normalized performed_at', () => {
    expect(maintenanceInputToRow({ equipmentId: 'e', type: 'new', performedAt: '2026-03-01T07:00:00+07:00', note: 'x' })).toEqual({
      equipment_id: 'e', type: 'new', performed_at: '2026-03-01T00:00:00.000+00:00', note: 'x',
    })
  })
})

describe('category mappers', () => {
  it('maps null parent_id to an empty parentId', () => {
    expect(rowToCategory({ id: 'c', parent_id: null, name: 'n', ...audit })).toMatchObject({ parentId: '', name: 'n', ...isoAudit })
  })

  it('maps only provided input fields', () => {
    expect(categoryInputToRow({ parentId: '' })).toEqual({ parent_id: '' })
    expect(categoryInputToRow({ name: 'n' })).toEqual({ name: 'n' })
  })
})
