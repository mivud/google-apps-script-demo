import { describe, expect, it } from 'vitest'
import { isAppAvailable, type AppDefinition } from './app-definition'
import { findOwner } from './app-route'
import { APP_REGISTRY } from './app-registry'
import type { Session } from '../../modules/access-control'

const session = { email: 'a@b.c', role: 'viewer' } as Session

describe('APP_REGISTRY', () => {
  it('registers device management and identity with unique ids and paths', () => {
    expect(APP_REGISTRY.map((app) => app.id)).toEqual(['identity', 'device-management'])
    expect(new Set(APP_REGISTRY.map((app) => app.path)).size).toBe(APP_REGISTRY.length)
  })

  it('owns the documented route prefixes', () => {
    expect(findOwner(APP_REGISTRY, '/devices/categories')?.id).toBe('device-management')
    expect(findOwner(APP_REGISTRY, '/identity/users/1')?.id).toBe('identity')
  })
})

describe('isAppAvailable', () => {
  const base = { ...APP_REGISTRY[0] }

  it('defaults to available', () => {
    expect(isAppAvailable(base, session)).toBe(true)
  })

  it('uses the app rule when present', () => {
    const hidden: AppDefinition = { ...base, isAvailable: () => false }
    expect(isAppAvailable(hidden, session)).toBe(false)
  })
})
