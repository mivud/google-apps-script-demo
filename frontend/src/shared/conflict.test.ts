import { describe, expect, it } from 'vitest'
import { isConflictError } from './conflict'

describe('isConflictError', () => {
  it('detects the conflict code only', () => {
    expect(isConflictError(Object.assign(new Error('x'), { code: 'conflict' }))).toBe(true)
    expect(isConflictError(Object.assign(new Error('x'), { code: 'unknown' }))).toBe(false)
    expect(isConflictError(new Error('x'))).toBe(false)
    expect(isConflictError(undefined)).toBe(false)
  })
})
