import { describe, expect, it } from 'vitest'
import { isAppAvailable } from './app-definition'
import { findOwner } from './app-route'
import { APP_REGISTRY } from './app-registry'
import type { Session } from '../../modules/access-control'

const session = { email: 'a@b.c', role: '' } as Session
const userWith = (roles: string[], claims: { key: string; value: string }[]) => ({ ...session, roles, claims }) as Session
const permission = (value: string) => ({ key: 'permission', value })

describe('APP_REGISTRY', () => {
  it('registers the apps with unique ids and paths', () => {
    expect(APP_REGISTRY.map((app) => app.id)).toEqual(['identity', 'device-management', 'expense'])
    expect(new Set(APP_REGISTRY.map((app) => app.path)).size).toBe(APP_REGISTRY.length)
  })

  it('owns the documented route prefixes', () => {
    expect(findOwner(APP_REGISTRY, '/devices/categories')?.id).toBe('device-management')
    expect(findOwner(APP_REGISTRY, '/identity/users/1')?.id).toBe('identity')
  })

  it('gates every app by a permission claim', () => {
    expect(APP_REGISTRY.map((app) => [app.accessClaimKey, app.accessClaimValue])).toEqual([
      ['permission', 'identity.read'],
      ['permission', 'device.mgt.read'],
      ['permission', 'expense.read'],
    ])
  })
})

describe('isAppAvailable', () => {
  const [identity, devices, expense] = APP_REGISTRY

  it('requires the matching read permission', () => {
    const user = userWith(['editor'], [permission('identity.read')])
    expect(isAppAvailable(identity, user)).toBe(true)
    expect(isAppAvailable(devices, user)).toBe(false)
    expect(isAppAvailable(expense, userWith([], [permission('expense.read')]))).toBe(true)
  })

  it('does not accept the legacy app claim', () => {
    expect(isAppAvailable(identity, userWith([], [{ key: 'app', value: 'identity' }]))).toBe(false)
    expect(isAppAvailable(devices, userWith([], [{ key: 'app', value: 'device.mgt' }]))).toBe(false)
  })

  it('does not treat a write permission as read access', () => {
    expect(isAppAvailable(devices, userWith([], [permission('device.mgt.write')]))).toBe(false)
  })

  it('ignores the value under another claim key', () => {
    expect(isAppAvailable(identity, userWith([], [{ key: 'other', value: 'identity.read' }]))).toBe(false)
  })

  it('gives the super role every app without claims', () => {
    const superUser = userWith(['super'], [])
    expect(APP_REGISTRY.every((app) => isAppAvailable(app, superUser))).toBe(true)
  })
})
