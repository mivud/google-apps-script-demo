import { NetworkError } from '../../../shared/errors'
import { rowsToClaims, type Claim } from '../../claims'

// What the backend resolved for one user: primary role (legacy-compatible), role names and effective claims.
export interface EffectiveAccess {
  // Plain role name; may be empty when the user has no primary role.
  role: string
  email: string
  roles: string[]
  claims: Claim[]
}

interface EffectiveAccessPayload {
  email?: unknown
  role?: unknown
  roles?: unknown
  claims?: unknown
}

function toRoleNames(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) throw new NetworkError()
  return value as string[]
}

// Missing roles/claims default to empty so an older backend deployment still signs users in.
export function parseEffectiveAccess(data: EffectiveAccessPayload | null | undefined): EffectiveAccess {
  const { email, role, roles, claims } = data ?? {}
  if (typeof email !== 'string' || typeof role !== 'string') throw new NetworkError()
  return { email, role, roles: toRoleNames(roles ?? []), claims: rowsToClaims(claims ?? []) }
}
