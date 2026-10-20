import { SUPER_ROLE, type Access, type ClaimRef } from '../../../shared/auth/Access';
import { byKeyThenValue, sameClaim } from './Identity';

function distinct(claims: readonly ClaimRef[]): ClaimRef[] {
  return claims.filter((claim, index) => claims.findIndex((other) => sameClaim(other, claim)) === index);
}

// Additive merge of role claims and own claims. A role claim is dropped only when the user owns the exact
// same (key, value). Sorted by key, then value.
export function mergeClaims(roleClaims: readonly ClaimRef[], ownClaims: readonly ClaimRef[]): ClaimRef[] {
  const own = distinct(ownClaims);
  const fromRoles = distinct(roleClaims).filter((claim) => !own.some((owned) => sameClaim(owned, claim)));
  return [...fromRoles, ...own].sort(byKeyThenValue).map(({ key, value }) => ({ key, value }));
}

export function computeAccess(
  email: string,
  roleNames: readonly string[],
  roleClaims: readonly ClaimRef[],
  ownClaims: readonly ClaimRef[],
): Access {
  const roles = [...roleNames].sort();
  return {
    email,
    role: roles.includes(SUPER_ROLE) ? SUPER_ROLE : '',
    roles,
    claims: mergeClaims(roleClaims, ownClaims),
  };
}
