import { rowToAudit, type AuditRow } from '../../../../shared/audit'
import { NetworkError } from '../../../../shared/errors'
import { rowsToClaims } from '../../../claims'
import type { User, UserCreateInput, UserUpdateInput } from '../../domain/user'

// Wire/table shape (snake_case), identical in Sheets payloads and Postgres columns.
export interface UserRow extends AuditRow {
  id: string
  email: string
  active: unknown
  role_ids?: unknown
  claims?: unknown
}

// Sheets may hand booleans back as text; accept both, case-insensitive.
function toBoolean(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true')
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new NetworkError()
  return value as string[]
}

// Rejects malformed backend data instead of letting `undefined` leak into the UI.
export function rowToUser(row: UserRow): User {
  if (!row || typeof row.id !== 'string' || typeof row.email !== 'string') throw new NetworkError()
  return {
    id: row.id,
    email: row.email,
    active: toBoolean(row.active),
    roleIds: toStringArray(row.role_ids ?? []),
    claims: rowsToClaims(row.claims ?? []),
    ...rowToAudit(row),
  }
}

export function rowsToUsers(data: { items?: unknown } | null | undefined): User[] {
  if (!data || !Array.isArray(data.items)) throw new NetworkError()
  return (data.items as UserRow[]).map(rowToUser)
}

export function userCreateToRow(input: UserCreateInput) {
  return { email: input.email, active: input.active, role_ids: input.roleIds }
}

export function userUpdateToRow(input: UserUpdateInput) {
  return { email: input.email, active: input.active }
}
