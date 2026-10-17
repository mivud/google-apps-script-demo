import { describe, expect, it } from 'vitest'
import { hasPermission } from './permission'

const subject = (over: { role?: string; roles?: string[]; claims?: { key: string; value: string }[] }) => ({ role: '', roles: [], claims: [], ...over })

describe('hasPermission', () => {
  it('matches a permission claim', () => {
    const claims = [{ key: 'permission', value: 'identity.read' }]
    expect(hasPermission(subject({ claims }), 'identity.read')).toBe(true)
    expect(hasPermission(subject({ claims }), 'identity.write')).toBe(false)
  })

  it('ignores the value under another claim key', () => {
    expect(hasPermission(subject({ claims: [{ key: 'app', value: 'identity.read' }] }), 'identity.read')).toBe(false)
  })

  it('passes everything for the super role or role name', () => {
    expect(hasPermission(subject({ roles: ['super'] }), 'x.write')).toBe(true)
    expect(hasPermission(subject({ role: 'super' }), 'x.write')).toBe(true)
  })

  it('denies a user without roles or claims', () => {
    expect(hasPermission(subject({ role: 'viewer' }), 'x.read')).toBe(false)
  })
})
