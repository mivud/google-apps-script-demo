import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoleService } from '../../roles'
import { createUserService } from './create-user-service'

afterEach(() => vi.unstubAllGlobals())

const config = { provider: 'sheets' as const, apiUrl: 'https://api.test', getIdToken: () => 'tok' }
const audit = { created: 'c', created_by: 'x', last_modified: 'm', last_modified_by: 'y' }

function stub(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data }) })
  vi.stubGlobal('fetch', fetchMock)
  return () => JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)
}

describe('users on Sheets', () => {
  it('maps a user row, text booleans included', async () => {
    stub({ items: [{ id: 'u1', email: 'a@b.com', active: 'TRUE', role_ids: ['r1'], claims: [{ key: 'k', value: 'v' }], ...audit }] })
    const [user] = await createUserService(config).list()
    expect(user).toEqual({
      id: 'u1', email: 'a@b.com', active: true, roleIds: ['r1'], claims: [{ key: 'k', value: 'v' }],
      created: 'c', createdBy: 'x', lastModified: 'm', lastModifiedBy: 'y',
    })
  })

  it('sends snake_case payloads with expected_last_modified', async () => {
    const sent = stub({ id: 'u1', email: 'a@b.com', active: false, role_ids: [], claims: [], ...audit })
    await createUserService(config).update('u1', { email: 'A@b.com', active: false }, 'm')
    expect(sent()).toEqual({
      action: 'users.user.update',
      idToken: 'tok',
      payload: { id: 'u1', email: 'a@b.com', active: false, expected_last_modified: 'm' },
    })
  })

  it('maps domain failures and rejects malformed rows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: { code: 'VALIDATION', message: 'last_super' } }) }))
    await expect(createUserService(config).remove('u1')).rejects.toMatchObject({ code: 'last_super' })
    stub({ id: 5 })
    await expect(createUserService(config).get('u1')).rejects.toMatchObject({ code: 'network' })
  })
})

describe('roles on Sheets', () => {
  it('maps a role with claims and sends role claim payloads', async () => {
    const sent = stub({ id: 'r1', name: 'editor', description: '', claims: [{ key: 'k', value: 'v' }], ...audit })
    const role = await createRoleService(config).addClaim('r1', { key: 'k', value: 'v' })
    expect(role.claims).toEqual([{ key: 'k', value: 'v' }])
    expect(sent()).toEqual({
      action: 'roles.roleClaim.add',
      idToken: 'tok',
      payload: { role_id: 'r1', key: 'k', value: 'v' },
    })
  })
})
