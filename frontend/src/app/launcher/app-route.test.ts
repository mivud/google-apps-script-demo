import { describe, expect, it } from 'vitest'
import { findOwner, legacyRedirect, ownsPath } from './app-route'

describe('legacyRedirect', () => {
  it('redirects old equipment and category routes', () => {
    expect(legacyRedirect('/equipment/abc')).toBe('/devices/equipment/abc')
    expect(legacyRedirect('/categories')).toBe('/devices/categories')
  })

  it('keeps escaped ids untouched', () => {
    expect(legacyRedirect('/equipment/a%2Fb')).toBe('/devices/equipment/a%2Fb')
  })

  it('ignores current and unrelated routes', () => {
    expect(legacyRedirect('/devices/equipment/abc')).toBeNull()
    expect(legacyRedirect('/')).toBeNull()
    expect(legacyRedirect('/equipment/')).toBeNull()
    expect(legacyRedirect('/equipments/abc')).toBeNull()
  })
})

describe('ownsPath / findOwner', () => {
  const apps = [{ path: '/devices' }, { path: '/identity' }]

  it('matches the app path and its children only', () => {
    expect(ownsPath('/devices', '/devices')).toBe(true)
    expect(ownsPath('/devices', '/devices/equipment/1')).toBe(true)
    expect(ownsPath('/devices', '/devices-x')).toBe(false)
    expect(ownsPath('/devices', '/')).toBe(false)
  })

  it('finds the owning app or null', () => {
    expect(findOwner(apps, '/identity/users')).toBe(apps[1])
    expect(findOwner(apps, '/nope')).toBeNull()
  })
})
