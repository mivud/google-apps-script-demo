import { describe, expect, it } from 'vitest'
import { isAppAvailable } from './app-definition'
import { findOwner } from './app-route'
import { APP_REGISTRY } from './app-registry'
import type { Session } from '../../modules/access-control'

const session = { email: 'a@b.c', role: 'viewer' } as Session

describe('APP_REGISTRY', () => {
  it('registers device management and identity with unique ids and paths', () => {
    expect(APP_REGISTRY.map((app) => app.id)).toEqual(['identity', 'device-management', 'expense'])
    expect(new Set(APP_REGISTRY.map((app) => app.path)).size).toBe(APP_REGISTRY.length)
  })

  it('owns the documented route prefixes', () => {
    expect(findOwner(APP_REGISTRY, '/devices/categories')?.id).toBe('device-management')
    expect(findOwner(APP_REGISTRY, '/identity/users/1')?.id).toBe('identity')
  })
})

describe('isAppAvailable with a custom claim key', () => {
  const expense = APP_REGISTRY.find((app) => app.id === 'expense')!
  const userWith = (claims: { key: string; value: string }[]) => ({ ...session, roles: [], claims }) as Session

  it('requires permission=expense.read, not app=expense', () => {
    expect(isAppAvailable(expense, userWith([{ key: 'permission', value: 'expense.read' }]))).toBe(true)
    expect(isAppAvailable(expense, userWith([{ key: 'app', value: 'expense' }]))).toBe(false)
  })
})

describe('isAppAvailable', () => {
  const [identity, devices] = APP_REGISTRY
  const userWith = (roles: string[], claims: { key: string; value: string }[]) => ({ ...session, roles, claims }) as Session

  it('requires the matching app claim', () => {
    const user = userWith(['viewer'], [{ key: 'app', value: 'identity' }])
    expect(isAppAvailable(identity, user)).toBe(true)
    expect(isAppAvailable(devices, user)).toBe(false)
  })

  it('maps device.mgt to device management', () => {
    expect(isAppAvailable(devices, userWith([], [{ key: 'app', value: 'device.mgt' }]))).toBe(true)
  })

  it('ignores the value under another claim key', () => {
    expect(isAppAvailable(identity, userWith([], [{ key: 'other', value: 'identity' }]))).toBe(false)
  })

  it('gives the super role every app without claims', () => {
    const superUser = userWith(['super'], [])
    expect(APP_REGISTRY.every((app) => isAppAvailable(app, superUser))).toBe(true)
  })
})
