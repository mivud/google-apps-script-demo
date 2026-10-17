import { NetworkError } from '../../../shared/errors'
import { rowsToClaims, type Claim } from '../../claims'
import { isRole, type Role } from './role'

// What the backend resolved for one user: primary role (legacy-compatible), role names and effective claims.
export interface EffectiveAccess {
  // An empty role means no valid built-in role; only the admin preview can show it, a real sign-in is refused.
  role: Role | ''
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
  if (typeof email !== 'string' || !(isRole(role) || role === '')) throw new NetworkError()
  return { email, role, roles: toRoleNames(roles ?? []), claims: rowsToClaims(claims ?? []) }
}

// Sign-in requires a real role; the empty role is only valid for previews.
export function parseSignedInAccess(data: EffectiveAccessPayload | null | undefined): EffectiveAccess & { role: Role } {
  const access = parseEffectiveAccess(data)
  if (access.role === '') throw new NetworkError()
  return { ...access, role: access.role }
}
