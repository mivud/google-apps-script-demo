import { describe, expect, it } from 'vitest'
import { findIdentityCode, toIdentityError, toSupabaseIdentityError } from './identity-errors'

const failure = (code: string, message: string) => ({ ok: false as const, error: { code, message } })

describe('toIdentityError', () => {
  it('maps VALIDATION messages to stable codes', () => {
    expect(toIdentityError(failure('VALIDATION', 'role_in_use'))).toMatchObject({ code: 'role_in_use' })
    expect(toIdentityError(failure('VALIDATION', ' Conflict '))).toMatchObject({ code: 'conflict' })
    expect(toIdentityError(failure('VALIDATION', 'something else'))).toMatchObject({ code: 'unknown' })
  })

  it('maps NOT_FOUND, FORBIDDEN and unknown codes', () => {
    expect(toIdentityError(failure('NOT_FOUND', 'x'))).toMatchObject({ code: 'not_found' })
    expect(toIdentityError(failure('FORBIDDEN', 'x'))).toMatchObject({ code: 'forbidden' })
    expect(toIdentityError(failure('INTERNAL', 'secret'))).toMatchObject({ code: 'network', message: 'Network request failed' })
  })
})

describe('toSupabaseIdentityError', () => {
  it('maps raised exception messages to stable codes', () => {
    expect(toSupabaseIdentityError({ message: 'last_super' })).toMatchObject({ code: 'last_super' })
    expect(toSupabaseIdentityError({ code: 'P0001', message: 'ERROR: self_lockout' })).toMatchObject({ code: 'self_lockout' })
  })

  it('maps postgres and postgrest codes', () => {
    expect(toSupabaseIdentityError({ code: '42501', message: 'x' })).toMatchObject({ code: 'forbidden' })
    expect(toSupabaseIdentityError({ code: 'PGRST301', message: 'x' })).toMatchObject({ code: 'unauthorized' })
    expect(toSupabaseIdentityError({ code: 'PGRST116', message: 'x' })).toMatchObject({ code: 'not_found' })
    expect(toSupabaseIdentityError({ code: '23505', message: 'x' }, 'role_name_duplicate')).toMatchObject({
      code: 'role_name_duplicate',
    })
    expect(toSupabaseIdentityError({ code: '08006', message: 'secret' })).toMatchObject({ code: 'network' })
  })
})

describe('findIdentityCode', () => {
  it('matches a code as a whole word, wrapped or exact', () => {
    expect(findIdentityCode('ERROR: role_in_use (P0001)')).toBe('role_in_use')
  })

  it('ignores a code embedded in a longer identifier', () => {
    expect(findIdentityCode('my_conflict_resolver failed')).toBeNull()
    expect(findIdentityCode('preconflict')).toBeNull()
  })
})
