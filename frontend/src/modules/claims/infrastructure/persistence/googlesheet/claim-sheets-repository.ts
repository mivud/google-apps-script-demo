import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import type { ClaimRepository } from '../../../application/claim-repository'
import type { Claim } from '../../../domain/claim'
import { claimToRow, rowsToClaims, rowToClaim, type ClaimRow } from '../claim-rows'
import { CLAIM_ACTIONS } from './api-actions'

export class ClaimSheetsRepository implements ClaimRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async listClaims(): Promise<Claim[]> {
    const data = await this.caller.call<{ items: unknown }>(CLAIM_ACTIONS.list, {})
    return rowsToClaims(data?.items)
  }

  async createClaim(claim: Claim): Promise<Claim> {
    return rowToClaim(await this.caller.call<ClaimRow>(CLAIM_ACTIONS.create, claimToRow(claim)))
  }

  async removeClaim(claim: Claim): Promise<void> {
    await this.caller.call<unknown>(CLAIM_ACTIONS.remove, claimToRow(claim))
  }
}
