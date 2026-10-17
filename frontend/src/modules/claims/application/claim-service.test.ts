import { beforeEach, describe, expect, it } from 'vitest'
import { hasClaim } from '../domain/claim'
import { InMemoryClaimRepository } from '../testing/in-memory-claim-repository'
import { ClaimService } from './claim-service'

let store: InMemoryClaimRepository
let service: ClaimService

beforeEach(() => {
  store = new InMemoryClaimRepository()
  service = new ClaimService(store)
})

describe('ClaimService', () => {
  it('trims and creates claims, and lists them sorted by key then value', async () => {
    await service.create({ key: ' b ', value: '2' })
    await service.create({ key: 'a', value: '9' })
    await service.create({ key: 'a', value: '1' })
    expect(await service.list()).toEqual([
      { key: 'a', value: '1' },
      { key: 'a', value: '9' },
      { key: 'b', value: '2' },
    ])
  })

  it('rejects invalid keys and values with stable codes', async () => {
    await expect(service.create({ key: 'Bad Key', value: '1' })).rejects.toMatchObject({ code: 'claim_key_invalid' })
    await expect(service.create({ key: '1a', value: '1' })).rejects.toMatchObject({ code: 'claim_key_invalid' })
    await expect(service.create({ key: 'a', value: '   ' })).rejects.toMatchObject({ code: 'claim_value_invalid' })
    await expect(service.create({ key: 'a', value: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'claim_value_invalid' })
    await expect(service.create({ key: 'a', value: 'bad\u0007' })).rejects.toMatchObject({ code: 'claim_value_invalid' })
  })

  it('rejects duplicates and removing a claim in use', async () => {
    await service.create({ key: 'a', value: '1' })
    await expect(service.create({ key: 'a', value: '1' })).rejects.toMatchObject({ code: 'claim_duplicate' })
    store.inUse.push({ key: 'a', value: '1' })
    await expect(service.remove({ key: 'a', value: '1' })).rejects.toMatchObject({ code: 'claim_in_use' })
  })

  it('removes unused claims', async () => {
    await service.create({ key: 'a', value: '1' })
    await service.remove({ key: 'a', value: '1' })
    expect(await service.list()).toEqual([])
  })
})

describe('hasClaim', () => {
  const claims = [{ key: 'a', value: '1' }]
  it('matches by key, optionally by value', () => {
    expect(hasClaim(claims, 'a')).toBe(true)
    expect(hasClaim(claims, 'a', '1')).toBe(true)
    expect(hasClaim(claims, 'a', '2')).toBe(false)
    expect(hasClaim(claims, 'b')).toBe(false)
  })
})
