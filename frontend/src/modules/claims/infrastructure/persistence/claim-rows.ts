import { NetworkError } from '../../../../shared/errors'
import type { Claim } from '../../domain/claim'

// Wire/table shape; identical in Sheets payloads and Postgres columns.
export interface ClaimRow {
  key: string
  value: string
}

export function rowToClaim(row: ClaimRow): Claim {
  return { key: row.key, value: row.value }
}

export function claimToRow(claim: Claim): ClaimRow {
  return { key: claim.key, value: claim.value }
}

// Rejects malformed backend data instead of letting `undefined` leak into the UI.
export function rowsToClaims(rows: unknown): Claim[] {
  if (!Array.isArray(rows)) throw new NetworkError()
  return rows.map((row: unknown) => {
    const { key, value } = (row ?? {}) as Partial<ClaimRow>
    if (typeof key !== 'string' || typeof value !== 'string') throw new NetworkError()
    return { key, value }
  })
}
