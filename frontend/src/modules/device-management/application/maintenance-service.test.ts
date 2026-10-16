import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors'
import type { NewMaintenanceLog } from '../domain/maintenance'
import { MaintenanceService } from './maintenance-service'
import { InMemoryDataService } from '../testing/InMemoryDataService'

let data: InMemoryDataService
let service: MaintenanceService
let equipmentId: string

const log = (extra: Partial<NewMaintenanceLog> = {}): NewMaintenanceLog => ({
  equipmentId, type: 'repair', performedAt: '2026-03-01T00:00:00.000+00:00', note: '', ...extra,
})

beforeEach(async () => {
  data = new InMemoryDataService()
  service = new MaintenanceService(data)
  equipmentId = (await data.create({ categoryId: '', name: 'Drill', description: '', status: 'active', quantity: 1 })).id
})

describe('MaintenanceService', () => {
  it('trims the note and lists newest performedAt first', async () => {
    await service.add(log({ performedAt: '2026-01-01T00:00:00.000+00:00', note: ' old ' }))
    await service.add(log())
    const logs = await service.listByEquipment(equipmentId)
    expect(logs.map((l) => l.performedAt)).toEqual(['2026-03-01T00:00:00.000+00:00', '2026-01-01T00:00:00.000+00:00'])
    expect(logs[1].note).toBe('old')
  })

  it('rejects an invalid type or date', async () => {
    await expect(service.add(log({ type: 'bogus' as never }))).rejects.toMatchObject({ code: 'maintenance_type_invalid' })
    await expect(service.add(log({ performedAt: 'nope' }))).rejects.toMatchObject({ code: 'date_invalid' })
  })

  it('rejects unknown equipment', async () => {
    await expect(service.add(log({ equipmentId: 'missing' }))).rejects.toBeInstanceOf(NotFoundError)
  })

  it('removes logs when their equipment is removed', async () => {
    await service.add(log())
    await data.remove(equipmentId)
    expect(await service.listByEquipment(equipmentId)).toEqual([])
  })
})
