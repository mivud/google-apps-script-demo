import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryRoleRepository } from '../testing/in-memory-role-repository'
import { RoleService } from './role-service'

let store: InMemoryRoleRepository
let service: RoleService

beforeEach(() => {
  store = new InMemoryRoleRepository()
  service = new RoleService(store)
})

describe('RoleService', () => {
  it('validates name and description', async () => {
    await expect(service.create({ name: 'Bad Name', description: '' })).rejects.toMatchObject({ code: 'role_name_invalid' })
    await expect(service.create({ name: 'a', description: '' })).rejects.toMatchObject({ code: 'role_name_invalid' })
    await expect(service.create({ name: 'ok', description: 'x'.repeat(201) })).rejects.toMatchObject({
      code: 'role_description_invalid',
    })
    expect((await service.create({ name: ' editor ', description: ' d ' })).name).toBe('editor')
  })

  it('rejects duplicate names case-insensitively', async () => {
    await service.create({ name: 'editor', description: '' })
    await expect(service.create({ name: 'editor', description: '' })).rejects.toMatchObject({ code: 'role_name_duplicate' })
  })

  it('detects stale updates as conflict and applies fresh ones', async () => {
    const role = await service.create({ name: 'editor', description: '' })
    const updated = await service.update(role.id, { name: 'editor', description: 'new' }, role.lastModified)
    expect(updated.description).toBe('new')
    await expect(service.update(role.id, { name: 'editor', description: 'x' }, role.lastModified)).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('protects built-in roles and roles in use', async () => {
    const admin = await store.createRole({ name: 'super', description: '' })
    await expect(service.remove(admin.id)).rejects.toMatchObject({ code: 'role_protected' })
    await expect(service.update(admin.id, { name: 'boss', description: '' }, admin.lastModified)).rejects.toMatchObject({
      code: 'role_protected',
    })
    const editor = await service.create({ name: 'editor', description: '' })
    store.assignedRoleIds.add(editor.id)
    await expect(service.remove(editor.id)).rejects.toMatchObject({ code: 'role_in_use' })
  })

  it('adds only known claims and keeps claims sorted', async () => {
    const role = await service.create({ name: 'editor', description: '' })
    await expect(service.addClaim(role.id, { key: 'a', value: '1' })).rejects.toMatchObject({ code: 'claim_unknown' })
    store.knownClaims.push({ key: 'b', value: '1' }, { key: 'a', value: '1' })
    await service.addClaim(role.id, { key: 'b', value: '1' })
    const withBoth = await service.addClaim(role.id, { key: 'a', value: '1' })
    expect(withBoth.claims.map((claim) => claim.key)).toEqual(['a', 'b'])
    expect((await service.removeClaim(role.id, { key: 'a', value: '1' })).claims).toHaveLength(1)
  })

  it('reports missing roles as not found', async () => {
    await expect(service.get('nope')).rejects.toMatchObject({ code: 'not_found' })
  })
})
