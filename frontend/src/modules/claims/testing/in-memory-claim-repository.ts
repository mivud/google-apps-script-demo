import { ValidationError } from '../../../shared/errors'
import type { ClaimRepository } from '../application/claim-repository'
import { sameClaim, type Claim } from '../domain/claim'

// Test double with the same error semantics as the providers.
export class InMemoryClaimRepository implements ClaimRepository {
  readonly claims: Claim[] = []
  // Set by tests to simulate claims referenced by a role or user.
  readonly inUse: Claim[] = []

  async listClaims(): Promise<Claim[]> {
    return this.claims.map((claim) => ({ ...claim }))
  }

  async createClaim(claim: Claim): Promise<Claim> {
    if (this.claims.some((existing) => sameClaim(existing, claim))) {
      throw new ValidationError(undefined, 'claim_duplicate')
    }
    this.claims.push({ ...claim })
    return { ...claim }
  }

  async removeClaim(claim: Claim): Promise<void> {
    if (this.inUse.some((used) => sameClaim(used, claim))) throw new ValidationError(undefined, 'claim_in_use')
    const index = this.claims.findIndex((existing) => sameClaim(existing, claim))
    if (index >= 0) this.claims.splice(index, 1)
  }
}
