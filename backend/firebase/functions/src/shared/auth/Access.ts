export interface ClaimRef {
  readonly key: string;
  readonly value: string;
}

// Access document of one user, same shape as the Supabase `current_identity` result.
export interface Access {
  readonly email: string;
  readonly role: 'super' | '';
  readonly roles: readonly string[];
  readonly claims: readonly ClaimRef[];
}

export const SUPER_ROLE = 'super';
export const PERMISSION_KEY = 'permission';

export const Permission = {
  IdentityRead: 'identity.read',
  IdentityWrite: 'identity.write',
  DeviceRead: 'device.mgt.read',
  DeviceWrite: 'device.mgt.write',
  ExpenseRead: 'expense.read',
  ExpenseWrite: 'expense.write',
} as const;
export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly PermissionValue[] = Object.values(Permission);

// Only the super role bypasses; everyone else needs the exact (permission, value) claim.
export function hasPermission(access: Access, permission: PermissionValue): boolean {
  return access.role === SUPER_ROLE
    || access.claims.some((claim) => claim.key === PERMISSION_KEY && claim.value === permission);
}
