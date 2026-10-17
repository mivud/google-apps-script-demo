import { describe, expect, it } from 'vitest'
import { isBuiltInRole } from './role-rules'

describe('isBuiltInRole', () => {
  it('flags super only', () => {
    expect(isBuiltInRole('super')).toBe(true)
    expect(isBuiltInRole('admin')).toBe(false)
    expect(isBuiltInRole('editor')).toBe(false)
  })
})
