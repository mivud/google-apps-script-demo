import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { ClaimRepository } from '../../../application/claim-repository'
import type { Claim } from '../../../domain/claim'
import { claimToRow, rowsToClaims, rowToClaim, type ClaimRow } from '../claim-rows'

// Callable API action names, namespaced as <module>.<entity>.<action>.
const CLAIM_ACTIONS = {
  create: 'claims.claim.create',
  remove: 'claims.claim.delete',
} as const
const CLAIMS_COLLECTION = 'claims'

// Reads hit Firestore under its security rules; writes go through the API callable only.
export class ClaimFirebaseRepository implements ClaimRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async listClaims(): Promise<Claim[]> {
    const rows = await this.caller.rows(CLAIMS_COLLECTION)
    return rowsToClaims(sortRows(rows, ascending('key'), ascending('value')))
  }

  async createClaim(claim: Claim): Promise<Claim> {
    return rowToClaim(await this.caller.call<ClaimRow>(CLAIM_ACTIONS.create, claimToRow(claim)))
  }

  async removeClaim(claim: Claim): Promise<void> {
    await this.caller.call<unknown>(CLAIM_ACTIONS.remove, claimToRow(claim))
  }
}
