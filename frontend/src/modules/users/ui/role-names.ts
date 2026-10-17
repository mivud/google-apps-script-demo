import type { Role } from '../../roles'

// Unknown ids (role deleted meanwhile) are skipped rather than shown as raw UUIDs.
export function roleNamesFor(roleIds: readonly string[], roles: readonly Role[]): string[] {
  const byId = new Map(roles.map((role) => [role.id, role.name]))
  return roleIds.flatMap((id) => byId.get(id) ?? []).sort()
}
