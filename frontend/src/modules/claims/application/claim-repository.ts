import type { Claim } from '../domain/claim'

export interface ClaimRepository {
  listClaims(): Promise<Claim[]>
  createClaim(claim: Claim): Promise<Claim>
  removeClaim(claim: Claim): Promise<void>
}
