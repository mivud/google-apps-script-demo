import { ValidationError } from '../../../shared/errors'

// A claim is a (key, value) pair compared by value, e.g. device.write = true.
export interface Claim {
  key: string
  value: string
}

export const CLAIM_KEY_PATTERN = /^[a-z][a-z0-9_.:-]{0,63}$/
export const CLAIM_VALUE_MAX_LENGTH = 200
// Control characters are rejected so values stay printable in sheets and logs.
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

export function validateClaimKey(key: string): string {
  const trimmed = key.trim()
  if (!CLAIM_KEY_PATTERN.test(trimmed)) throw new ValidationError('Invalid claim key', 'claim_key_invalid')
  return trimmed
}

export function validateClaimValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 1 || trimmed.length > CLAIM_VALUE_MAX_LENGTH || CONTROL_CHARACTERS.test(trimmed)) {
    throw new ValidationError('Invalid claim value', 'claim_value_invalid')
  }
  return trimmed
}

export function validateClaim(claim: Claim): Claim {
  return { key: validateClaimKey(claim.key), value: validateClaimValue(claim.value) }
}

export function sameClaim(a: Claim, b: Claim): boolean {
  return a.key === b.key && a.value === b.value
}

// Plain string compare on purpose: it must match the backend ordering on both providers.
export function compareClaims(a: Claim, b: Claim): number {
  if (a.key !== b.key) return a.key < b.key ? -1 : 1
  if (a.value === b.value) return 0
  return a.value < b.value ? -1 : 1
}

export function sortClaims(claims: readonly Claim[]): Claim[] {
  return [...claims].sort(compareClaims)
}

// With no value, any claim with the key matches.
export function hasClaim(claims: readonly Claim[], key: string, value?: string): boolean {
  return claims.some((claim) => claim.key === key && (value === undefined || claim.value === value))
}
