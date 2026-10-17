import { rowToAudit, type AuditRow } from '../../../../shared/audit'
import { NetworkError } from '../../../../shared/errors'
import { rowsToClaims, type Claim } from '../../../claims'
import type { Role, RoleInput } from '../../domain/role'

// Wire/table shape (snake_case), identical in Sheets payloads and Postgres columns.
export interface RoleRow extends AuditRow {
  id: string
  name: string
  description: string
  claims?: unknown
}

export function roleInputToRow(input: RoleInput): RoleInput {
  return { name: input.name, description: input.description }
}

// Rejects malformed backend data instead of letting `undefined` leak into the UI.
export function rowToRole(row: RoleRow): Role {
  if (!row || typeof row.id !== 'string' || typeof row.name !== 'string') throw new NetworkError()
  const claims: Claim[] = rowsToClaims(row.claims ?? [])
  return { id: row.id, name: row.name, description: row.description ?? '', claims, ...rowToAudit(row) }
}

export function rowsToRoles(data: { items?: unknown } | null | undefined): Role[] {
  if (!data || !Array.isArray(data.items)) throw new NetworkError()
  return (data.items as RoleRow[]).map(rowToRole)
}
