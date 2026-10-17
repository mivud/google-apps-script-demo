import { hasClaim } from '../../claims'
import type { Identity } from './session'

export const PERMISSION_CLAIM_KEY = 'permission'
// Holders of this role pass every permission check.
export const SUPER_ROLE = 'super'

type PermissionSubject = Pick<Identity, 'role' | 'roles' | 'claims'>

export function isSuper(subject: PermissionSubject): boolean {
  return subject.role === SUPER_ROLE || subject.roles.includes(SUPER_ROLE)
}

// UI hint only; the backend (and RLS) enforce the real permission.
export function hasPermission(subject: PermissionSubject, permission: string): boolean {
  return isSuper(subject) || hasClaim(subject.claims, PERMISSION_CLAIM_KEY, permission)
}
