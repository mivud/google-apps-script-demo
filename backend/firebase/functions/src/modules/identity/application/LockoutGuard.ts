import { SUPER_ROLE } from '../../../shared/auth/Access';
import {
  assertSuperEmailChangeAllowed,
  assertSuperRemovable,
  type LockoutFacts,
} from '../domain/SuperLockout';
import type { StoredUser } from '../domain/Identity';
import type { IdentityTx } from './IdentityStore';

async function gatherFacts(tx: IdentityTx, user: StoredUser, callerEmail: string): Promise<LockoutFacts> {
  const superRole = (await tx.roles.list()).find((role) => role.name === SUPER_ROLE);
  const holders = superRole ? await tx.assignments.usersOfRole(superRole.id) : [];
  const users = await Promise.all(holders.map((link) => tx.users.get(link.user_id)));
  const activeSupers = users.flatMap((candidate) => (candidate && candidate.active ? [candidate] : []));
  return {
    target: { email: user.email, isActiveSuper: user.active && activeSupers.some((s) => s.id === user.id) },
    activeSuperCount: activeSupers.length,
    callerEmail,
  };
}

// Running both reads and checks inside one transaction replaces the Postgres advisory lock: the super holders
// read here are locked until commit, so two concurrent removals cannot both pass the count check.
export async function guardSuperRemoval(tx: IdentityTx, user: StoredUser, callerEmail: string): Promise<void> {
  assertSuperRemovable(await gatherFacts(tx, user, callerEmail));
}

export async function guardSuperEmailChange(tx: IdentityTx, user: StoredUser, callerEmail: string): Promise<void> {
  assertSuperEmailChangeAllowed(await gatherFacts(tx, user, callerEmail));
}
