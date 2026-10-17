import { AuthError, ForbiddenError, NetworkError, NotFoundError, ValidationError, type ValidationCode } from '../errors'
import { toSharedApiError, type ApiFailure } from './apps-script-api'

// Stable domain codes the identity modules raise on both providers (Apps Script error.message / Postgres exception message).
const IDENTITY_CODES: readonly ValidationCode[] = [
  'role_name_invalid',
  'role_description_invalid',
  'role_name_duplicate',
  'role_protected',
  'role_in_use',
  'claim_key_invalid',
  'claim_value_invalid',
  'claim_duplicate',
  'claim_in_use',
  'claim_unknown',
  'user_email_invalid',
  'user_email_duplicate',
  'limit_exceeded',
  'last_super',
  'self_lockout',
  'conflict',
]

// Postgres wraps messages, so match a code as a whole word (never inside a longer identifier).
export function findIdentityCode(message: string): ValidationCode | null {
  const text = message.trim().toLowerCase()
  return IDENTITY_CODES.find((code) => text === code) ?? IDENTITY_CODES.find((code) => new RegExp(`(?<![a-z0-9_])${code}(?![a-z0-9_])`).test(text)) ?? null
}

export function toIdentityError(failure: ApiFailure): Error {
  switch (failure.error.code) {
    case 'NOT_FOUND':
      return new NotFoundError()
    case 'VALIDATION':
      return new ValidationError(undefined, findIdentityCode(failure.error.message) ?? 'unknown')
    default:
      return toSharedApiError(failure)
  }
}

interface SupabaseError {
  code?: string
  message: string
}

// Triggers raise the stable code as the message; the rest maps by Postgres/PostgREST code.
// A unique violation (23505) means "duplicate" of whatever the calling table holds, so the caller names it.
export function toSupabaseIdentityError(error: SupabaseError, duplicateCode: ValidationCode = 'unknown'): Error {
  const raised = findIdentityCode(error.message)
  if (raised) return new ValidationError(undefined, raised)
  if (error.code === '42501') return new ForbiddenError()
  if (error.code === 'PGRST301') return new AuthError()
  if (error.code === 'PGRST116') return new NotFoundError()
  if (error.code === '23505') return new ValidationError(undefined, duplicateCode)
  if (error.code === '22P02' || error.code === '23502' || error.code === '23514') return new ValidationError()
  return new NetworkError()
}
