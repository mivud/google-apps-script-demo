import type { ClaimRef } from '../../../shared/auth/Access';
import type { StoredRole, StoredUser } from '../domain/Identity';
import type { IdentityTx } from './IdentityStore';

export type UserView = StoredUser & { role_ids: string[]; claims: ClaimRef[] };
export type RoleView = StoredRole & { claims: ClaimRef[] };

const toRef = ({ key, value }: ClaimRef): ClaimRef => ({ key, value });

// Response shapes of the Apps Script identity API (users carry role_ids and own claims, roles carry claims).
export async function userView(tx: IdentityTx, user: StoredUser): Promise<UserView> {
  const roles = await tx.assignments.rolesOfUser(user.id);
  const claims = await tx.assignments.userClaims(user.id);
  return { ...user, role_ids: roles.map((link) => link.role_id).sort(), claims: claims.map(toRef) };
}

export async function roleView(tx: IdentityTx, role: StoredRole): Promise<RoleView> {
  const claims = await tx.assignments.roleClaims(role.id);
  return { ...role, claims: claims.map(toRef) };
}
