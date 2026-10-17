import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryUserRepository } from '../testing/in-memory-user-repository'
import { UserService } from './user-service'

let store: InMemoryUserRepository
let service: UserService

beforeEach(() => {
  store = new InMemoryUserRepository()
  service = new UserService(store)
})

describe('UserService', () => {
  it('normalizes and validates the email', async () => {
    expect((await service.create({ email: '  A@B.com ', active: true, roleIds: [] })).email).toBe('a@b.com')
    await expect(service.create({ email: 'nope', active: true, roleIds: [] })).rejects.toMatchObject({
      code: 'user_email_invalid',
    })
  })

  it('rejects duplicate emails case-insensitively', async () => {
    await service.create({ email: 'a@b.com', active: true, roleIds: [] })
    await expect(service.create({ email: 'A@B.COM', active: true, roleIds: [] })).rejects.toMatchObject({
      code: 'user_email_duplicate',
    })
  })

  it('limits roles per user to 20', async () => {
    const roleIds = Array.from({ length: 21 }, (_, index) => `r${index}`)
    await expect(service.create({ email: 'a@b.com', active: true, roleIds })).rejects.toMatchObject({ code: 'limit_exceeded' })
    const user = await service.create({ email: 'a@b.com', active: true, roleIds: roleIds.slice(0, 20) })
    await expect(service.assignRole(user.id, 'extra')).rejects.toMatchObject({ code: 'limit_exceeded' })
  })

  it('uses expected last modified for concurrency', async () => {
    const user = await service.create({ email: 'a@b.com', active: true, roleIds: [] })
    const updated = await service.update(user.id, { email: 'a@b.com', active: false }, user.lastModified)
    expect(updated.active).toBe(false)
    await expect(service.update(user.id, { email: 'a@b.com', active: true }, user.lastModified)).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('assigns and unassigns roles idempotently', async () => {
    const user = await service.create({ email: 'a@b.com', active: true, roleIds: [] })
    await service.assignRole(user.id, 'r1')
    expect((await service.assignRole(user.id, 'r1')).roleIds).toEqual(['r1'])
    expect((await service.unassignRole(user.id, 'r1')).roleIds).toEqual([])
  })

  it('adds known claims only and validates them', async () => {
    const user = await service.create({ email: 'a@b.com', active: true, roleIds: [] })
    await expect(service.addClaim(user.id, { key: 'Bad', value: '1' })).rejects.toMatchObject({ code: 'claim_key_invalid' })
    await expect(service.addClaim(user.id, { key: 'a', value: '1' })).rejects.toMatchObject({ code: 'claim_unknown' })
    store.knownClaims.push({ key: 'a', value: '1' })
    expect((await service.addClaim(user.id, { key: 'a', value: '1' })).claims).toHaveLength(1)
    expect((await service.removeClaim(user.id, { key: 'a', value: '1' })).claims).toHaveLength(0)
  })

  it('removes users and reports missing ones', async () => {
    const user = await service.create({ email: 'a@b.com', active: true, roleIds: [] })
    await service.remove(user.id)
    await expect(service.get(user.id)).rejects.toMatchObject({ code: 'not_found' })
  })
})
