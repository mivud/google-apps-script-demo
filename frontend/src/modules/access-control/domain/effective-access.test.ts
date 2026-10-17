import { describe, expect, it } from 'vitest'
import { NetworkError } from '../../../shared/errors'
import { parseEffectiveAccess } from './effective-access'

describe('parseEffectiveAccess', () => {
  it('accepts any role string, including an empty or unknown one', () => {
    expect(parseEffectiveAccess({ email: 'a@b.c', role: '' }).role).toBe('')
    expect(parseEffectiveAccess({ email: 'a@b.c', role: 'auditor', roles: ['auditor'] }).role).toBe('auditor')
  })

  it('rejects a non-string role or email', () => {
    expect(() => parseEffectiveAccess({ email: 'a@b.c', role: null })).toThrow(NetworkError)
    expect(() => parseEffectiveAccess({ email: 1, role: 'x' })).toThrow(NetworkError)
  })
})
