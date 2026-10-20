import { Permission } from '../../../shared/auth/Access';
import type { ActionDefinition } from '../../../shared/dispatch/ActionRouter';
import type { AccessService } from '../application/AccessService';
import type { ClaimCommands } from '../application/ClaimCommands';
import type { RoleCommands } from '../application/RoleCommands';
import type { UserCommands } from '../application/UserCommands';

export interface IdentityEndpointDeps {
  users: UserCommands;
  roles: RoleCommands;
  claims: ClaimCommands;
  access: AccessService;
}

const write = Permission.IdentityWrite;

// Request <-> use case input only; errors are translated once, in the router/HTTPS layer.
export function identityActions(deps: IdentityEndpointDeps): ActionDefinition[] {
  const { users, roles, claims, access } = deps;
  return [
    { action: 'access-control.identity.current', permission: null, handler: async (c) => c.access },
    {
      action: 'access-control.access.preview',
      permission: Permission.IdentityRead,
      handler: (c) => access.preview(c.payload.requiredString('user_id')),
    },

    { action: 'claims.claim.create', permission: write,
      handler: (c) => claims.create(c.request, c.payload.raw('key'), c.payload.raw('value')) },
    { action: 'claims.claim.delete', permission: write,
      handler: (c) => claims.remove(c.request, c.payload.raw('key'), c.payload.raw('value')) },

    { action: 'roles.role.create', permission: write,
      handler: (c) => roles.create(c.request, { name: c.payload.raw('name'), description: c.payload.raw('description') }) },
    { action: 'roles.role.update', permission: write,
      handler: (c) => roles.update(c.request, {
        id: c.payload.requiredString('id'),
        name: c.payload.raw('name'),
        description: c.payload.raw('description'),
        expectedLastModified: c.payload.raw('expected_last_modified'),
      }) },
    { action: 'roles.role.delete', permission: write,
      handler: (c) => roles.remove(c.request, c.payload.requiredString('id')) },
    { action: 'roles.roleClaim.add', permission: write,
      handler: (c) => roles.addClaim(c.request, roleClaim(c.payload)) },
    { action: 'roles.roleClaim.remove', permission: write,
      handler: (c) => roles.removeClaim(c.request, roleClaim(c.payload)) },

    { action: 'users.user.create', permission: write,
      handler: (c) => users.create(c.request, {
        email: c.payload.raw('email'),
        active: c.payload.optionalBoolean('active'),
        roleIds: c.payload.stringArray('role_ids'),
      }) },
    { action: 'users.user.update', permission: write,
      handler: (c) => users.update(c.request, {
        id: c.payload.requiredString('id'),
        email: c.payload.raw('email'),
        active: c.payload.optionalBoolean('active'),
        expectedLastModified: c.payload.raw('expected_last_modified'),
      }) },
    { action: 'users.user.delete', permission: write,
      handler: (c) => users.remove(c.request, c.payload.requiredString('id')) },
    { action: 'users.userRole.assign', permission: write,
      handler: (c) => users.assignRole(c.request, c.payload.requiredString('user_id'), c.payload.requiredString('role_id')) },
    { action: 'users.userRole.unassign', permission: write,
      handler: (c) => users.unassignRole(c.request, c.payload.requiredString('user_id'), c.payload.requiredString('role_id')) },
    { action: 'users.userClaim.add', permission: write,
      handler: (c) => users.addClaim(c.request, userClaim(c.payload)) },
    { action: 'users.userClaim.remove', permission: write,
      handler: (c) => users.removeClaim(c.request, userClaim(c.payload)) },
  ];
}

type Payload = Parameters<ActionDefinition['handler']>[0]['payload'];

const roleClaim = (p: Payload) => ({ roleId: p.requiredString('role_id'), key: p.raw('key'), value: p.raw('value') });
const userClaim = (p: Payload) => ({ userId: p.requiredString('user_id'), key: p.raw('key'), value: p.raw('value') });
