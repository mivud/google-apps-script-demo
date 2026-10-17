import { describe, expect, it } from 'vitest'
import { parseIdentityRoute, rolePath, userPath } from './identity-routes'

const UID = '123e4567-e89b-42d3-a456-426614174000'

describe('parseIdentityRoute', () => {
  it('parses list and detail routes', () => {
    expect(parseIdentityRoute('/identity/users')).toEqual({ page: 'users' })
    expect(parseIdentityRoute(`/identity/users/${UID}`)).toEqual({ page: 'user', id: UID })
    expect(parseIdentityRoute('/identity/roles')).toEqual({ page: 'roles' })
    expect(parseIdentityRoute(`/identity/roles/${UID}`)).toEqual({ page: 'role', id: UID })
    expect(parseIdentityRoute('/identity/claims')).toEqual({ page: 'claims' })
  })

  it('falls back to users for unknown or malformed paths', () => {
    expect(parseIdentityRoute('/identity')).toEqual({ page: 'users' })
    expect(parseIdentityRoute('/identity/claims/x')).toEqual({ page: 'users' })
    expect(parseIdentityRoute('/identity/users/%E0%A4%A')).toEqual({ page: 'users' })
    expect(parseIdentityRoute('/identity/users/a/b')).toEqual({ page: 'users' })
  })

  it('accepts short non-UUID ids from hand-made rows', () => {
    expect(parseIdentityRoute('/identity/users/u1')).toEqual({ page: 'user', id: 'u1' })
  })

  it('falls back to the list when the id has unsafe characters', () => {
    expect(parseIdentityRoute('/identity/roles/..%2Fx')).toEqual({ page: 'roles' })
  })

  it('encodes ids in hrefs', () => {
    expect(userPath('a/b')).toBe('/identity/users/a%2Fb')
    expect(rolePath('r1')).toBe('/identity/roles/r1')
  })
})
