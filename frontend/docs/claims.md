# claims (frontend)

The catalog of claims (`key` + `value`) that roles and users hold. Backend counterpart: [backend/docs/claims.md](../../backend/docs/claims.md). Code: [modules/claims](../src/modules/claims).

## Public API ([index.ts](../src/modules/claims/index.ts))

- Type `Claim`; pure helpers `validateClaim`, `sameClaim`, `compareClaims`, `sortClaims` (plain string compare, same order as the backend) and `hasClaim(claims, key, value?)` (no value means any value of the key).
- `ClaimService` (`list`, `create`, `remove`) over the `ClaimRepository` port, and `createClaimService(config: ProviderConfig)`: Sheets calls `claims.claim.list/create/delete` on identity-api, Supabase uses the `claims` table.
- Row helpers `claimToRow`, `rowToClaim`, `rowsToClaims`, shared by the other identity modules.

## Rules

- Key `^[a-z][a-z0-9_.:-]{0,63}$`, value 1-200 chars without control characters; input is trimmed. Errors `claim_key_invalid`, `claim_value_invalid`, plus server codes `claim_duplicate` and `claim_in_use` (mapped by [identity-errors.ts](../src/shared/api/identity-errors.ts)).
- The list returns only key and value (no audit fields).

## UI

[ClaimsPage](../src/modules/claims/ui/pages/claims-page.tsx) at `/identity/claims` (add dialog, delete) and [claim-assignment](../src/modules/claims/ui/components/claim-assignment.tsx) used by the role and user detail pages: a checkbox list of every catalog claim (checked = assigned) with one Save button that applies only the difference (adds first, then removals). Async pattern: `useAsyncData`, `useAsyncAction`, `LoadingButton`, error state with retry.

## Limits

No paging. In-memory fake for tests: [testing](../src/modules/claims/testing/in-memory-claim-repository.ts).
