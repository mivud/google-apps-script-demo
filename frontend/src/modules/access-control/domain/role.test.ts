import { describe, expect, it } from 'vitest'
import { canWrite, isRole } from './role'

describe('role', () => {
  it('recognizes only known roles', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('viewer')).toBe(true)
    expect(isRole('root')).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })

  it('lets only admins write', () => {
    expect(canWrite('admin')).toBe(true)
    expect(canWrite('viewer')).toBe(false)
  })
})
