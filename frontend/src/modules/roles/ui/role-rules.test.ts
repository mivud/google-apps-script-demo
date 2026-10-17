import { describe, expect, it } from 'vitest'
import { isBuiltInRole } from './role-rules'

describe('isBuiltInRole', () => {
  it('flags admin and viewer only', () => {
    expect(isBuiltInRole('admin')).toBe(true)
    expect(isBuiltInRole('viewer')).toBe(true)
    expect(isBuiltInRole('editor')).toBe(false)
  })
})
