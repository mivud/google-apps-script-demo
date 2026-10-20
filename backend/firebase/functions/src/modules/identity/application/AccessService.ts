import { PERMISSION_KEY, SUPER_ROLE, type Access } from '../../../shared/auth/Access';
import type { AccessResolver } from '../../../shared/auth/AccessResolver';
import { SYSTEM_ACTOR } from '../../../shared/context/RequestContext';
import { notFound } from '../../../shared/errors/DomainError';
import { formatUtc, type Clock } from '../../../shared/time/Clock';
import { computeAccess } from '../domain/EffectiveAccess';
import type { User } from '../domain/Identity';
import type { IdentityStore, IdentityTx } from './IdentityStore';

export async function loadAccess(tx: IdentityTx, user: User): Promise<Access> {
  const links = await tx.assignments.rolesOfUser(user.id);
  const roles = (await Promise.all(links.map((link) => tx.roles.get(link.role_id)))).flatMap((r) => (r ? [r] : []));
  const roleClaims = (await Promise.all(roles.map((role) => tx.assignments.roleClaims(role.id)))).flat();
  const ownClaims = await tx.assignments.userClaims(user.id);
  return computeAccess(user.email, roles.map((role) => role.name), roleClaims, ownClaims);
}

// Reads access straight from the source collections (never from the projection), so revocation is immediate.
export class AccessService implements AccessResolver {
  constructor(private readonly store: IdentityStore, private readonly clock: Clock) {}

  private systemRequest() {
    return { actor: SYSTEM_ACTOR, nowIso: formatUtc(this.clock.now()) };
  }

  resolve(email: string): Promise<Access | null> {
    return this.store.run(this.systemRequest(), async (tx) => {
      const user = await tx.users.findByEmail(email.toLowerCase());
      return user && user.active ? loadAccess(tx, user) : null;
    });
  }

  // Target need not be active (admin preview).
  preview(userId: string): Promise<Access> {
    return this.store.run(this.systemRequest(), async (tx) => {
      const user = await tx.users.get(userId);
      if (!user) throw notFound();
      return loadAccess(tx, user);
    });
  }
}

// Keeps the access_index projection (read by firestore.rules) in step with the source collections.
// Runs after the write transaction commits and is idempotent: a failure is safe to retry.
export class AccessIndexService {
  constructor(private readonly store: IdentityStore, private readonly clock: Clock) {}

  refreshUsers(userIds: readonly string[], removedEmails: readonly string[] = []): Promise<void> {
    const request = { actor: SYSTEM_ACTOR, nowIso: formatUtc(this.clock.now()) };
    return this.store.run(request, async (tx) => {
      removedEmails.forEach((email) => tx.accessIndex.remove(email));
      for (const id of new Set(userIds)) {
        const user = await tx.users.get(id);
        if (!user) continue;
        const access = await loadAccess(tx, user);
        tx.accessIndex.put(user.email, {
          user_id: user.id,
          active: user.active,
          is_super: access.role === SUPER_ROLE,
          permissions: access.claims.filter((c) => c.key === PERMISSION_KEY).map((c) => c.value),
        });
      }
    });
  }

  async refreshRoleHolders(roleId: string): Promise<void> {
    const request = { actor: SYSTEM_ACTOR, nowIso: formatUtc(this.clock.now()) };
    const holders = await this.store.run(request, (tx) => tx.assignments.usersOfRole(roleId));
    await this.refreshUsers(holders.map((link) => link.user_id));
  }
}
