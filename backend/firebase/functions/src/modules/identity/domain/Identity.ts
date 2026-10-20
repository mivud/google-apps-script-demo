import type { ClaimRef } from '../../../shared/auth/Access';
import type { IdentityAudit } from '../../../shared/audit/AuditStyle';
import { validation } from '../../../shared/errors/DomainError';
import { hasControlChars, requireText } from '../../../shared/validation/Values';

// Entities carry no audit fields; stored rows add them (see Stored*).
export interface User { id: string; email: string; active: boolean }
export interface Role { id: string; name: string; description: string }
export type Claim = ClaimRef;
export interface UserRole { user_id: string; role_id: string }
export interface RoleClaim extends ClaimRef { role_id: string }
export interface UserClaim extends ClaimRef { user_id: string }

export type StoredUser = User & IdentityAudit;
export type StoredRole = Role & IdentityAudit;

export const Limits = {
  maxRowsPerCollection: 1000,
  maxRolesPerUser: 20,
  maxClaimsPerOwner: 100,
  emailMaxLength: 254,
  roleDescriptionMaxLength: 200,
  claimValueMaxLength: 200,
} as const;

const EMAIL_PATTERN = /^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/;
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/;
const CLAIM_KEY_PATTERN = /^[a-z][a-z0-9_.:-]{0,63}$/;

// Email is the allowlist key: trimmed, lowercase. "/" is refused because the email is also a Firestore document id.
export function parseEmail(value: unknown): string {
  const email = requireText(value, 'user_email_invalid').toLowerCase();
  if (email.length > Limits.emailMaxLength || hasControlChars(email) || !EMAIL_PATTERN.test(email)) {
    throw validation('user_email_invalid');
  }
  return email;
}

export function parseRoleName(value: unknown): string {
  const name = requireText(value, 'role_name_invalid');
  if (!ROLE_NAME_PATTERN.test(name)) throw validation('role_name_invalid');
  return name;
}

export function parseRoleDescription(value: unknown): string {
  if (value === undefined || value === null) return '';
  const description = requireText(value, 'role_description_invalid');
  if (description.length > Limits.roleDescriptionMaxLength) throw validation('role_description_invalid');
  return description;
}

export function parseClaim(key: unknown, value: unknown): Claim {
  if (typeof key !== 'string' || !CLAIM_KEY_PATTERN.test(key.trim())) throw validation('claim_key_invalid');
  if (typeof value !== 'string') throw validation('claim_value_invalid');
  const text = value.trim();
  if (text.length < 1 || text.length > Limits.claimValueMaxLength || hasControlChars(text)) {
    throw validation('claim_value_invalid');
  }
  return { key: key.trim(), value: text };
}

export const sameClaim = (a: ClaimRef, b: ClaimRef): boolean => a.key === b.key && a.value === b.value;

// Plain code-point compare (C collation in Postgres).
export const byKeyThenValue = (a: ClaimRef, b: ClaimRef): number =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
