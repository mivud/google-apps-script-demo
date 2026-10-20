import type { ClaimRef } from '../../../shared/auth/Access';
import type { RequestContext } from '../../../shared/context/RequestContext';
import { rule, validation } from '../../../shared/errors/DomainError';
import { Limits, parseClaim } from '../domain/Identity';
import type { IdentityStore } from './IdentityStore';

// Claims are immutable: create or delete only.
export class ClaimCommands {
  constructor(private readonly store: IdentityStore) {}

  create(request: RequestContext, key: unknown, value: unknown): Promise<ClaimRef> {
    const claim = parseClaim(key, value);
    return this.store.run(request, async (tx) => {
      if (await tx.claims.get(claim)) throw validation('claim_duplicate');
      if ((await tx.claims.count()) >= Limits.maxRowsPerCollection) throw rule('limit_exceeded');
      await tx.claims.save(claim);
      return claim;
    });
  }

  remove(request: RequestContext, key: unknown, value: unknown): Promise<Record<string, never>> {
    const claim = parseClaim(key, value);
    return this.store.run(request, async (tx) => {
      if (await tx.assignments.isClaimHeld(claim)) throw rule('claim_in_use');
      tx.claims.remove(claim);
      return {};
    });
  }
}
