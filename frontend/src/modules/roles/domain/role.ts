import type { Audit } from '../../../shared/audit'
import { ValidationError } from '../../../shared/errors'
import type { Claim } from '../../claims'

export interface Role extends Audit {
  id: string
  name: string
  description: string
  claims: Claim[]
}

export interface RoleInput {
  name: string
  description: string
}

export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/
export const ROLE_DESCRIPTION_MAX_LENGTH = 200
// The backend refuses to rename or delete these.
export const BUILT_IN_ROLE_NAMES = ['admin', 'viewer'] as const

export function isBuiltInRoleName(name: string): boolean {
  return (BUILT_IN_ROLE_NAMES as readonly string[]).includes(name)
}

export function validateRoleName(name: string): string {
  const trimmed = name.trim()
  if (!ROLE_NAME_PATTERN.test(trimmed)) throw new ValidationError('Invalid role name', 'role_name_invalid')
  return trimmed
}

export function validateRoleDescription(description: string): string {
  const trimmed = description.trim()
  if (trimmed.length > ROLE_DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError('Invalid role description', 'role_description_invalid')
  }
  return trimmed
}

export function validateRoleInput(input: RoleInput): RoleInput {
  return { name: validateRoleName(input.name), description: validateRoleDescription(input.description) }
}
