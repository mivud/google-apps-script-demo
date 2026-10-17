import type { Audit } from '../../../shared/audit'
import { ValidationError } from '../../../shared/errors'
import type { Claim } from '../../claims'

export interface User extends Audit {
  id: string
  email: string
  active: boolean
  roleIds: string[]
  claims: Claim[]
}

export interface UserCreateInput {
  email: string
  active: boolean
  roleIds: string[]
}

export interface UserUpdateInput {
  email: string
  active: boolean
}

export const USER_EMAIL_MAX_LENGTH = 254
export const MAX_ROLES_PER_USER = 20
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Emails are stored lowercase so duplicate checks are case-insensitive on every provider.
export function validateUserEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (normalized.length > USER_EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError('Invalid email', 'user_email_invalid')
  }
  return normalized
}

export function validateRoleIdCount(roleIds: readonly string[]): string[] {
  const distinct = [...new Set(roleIds)]
  if (distinct.length > MAX_ROLES_PER_USER) throw new ValidationError('Too many roles', 'limit_exceeded')
  return distinct
}

export function validateUserCreateInput(input: UserCreateInput): UserCreateInput {
  return { email: validateUserEmail(input.email), active: input.active, roleIds: validateRoleIdCount(input.roleIds) }
}

export function validateUserUpdateInput(input: UserUpdateInput): UserUpdateInput {
  return { email: validateUserEmail(input.email), active: input.active }
}
