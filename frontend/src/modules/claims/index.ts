// Public API of the claims module; other code imports only from here.
export type { Claim } from './domain/claim'
export { compareClaims, hasClaim, sameClaim, sortClaims, validateClaim } from './domain/claim'
export type { ClaimRepository } from './application/claim-repository'
export { ClaimService } from './application/claim-service'
export { claimToRow, rowsToClaims, rowToClaim, type ClaimRow } from './infrastructure/persistence/claim-rows'
export { ClaimAssignment } from './ui/components/claim-assignment'
export { createClaimService } from './infrastructure/create-claim-service'
export type { ProviderConfig } from '../../shared/api/provider-config'
