import { SUPER_ROLE } from '../../../shared/auth/Access';
import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound, rule, validation } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { assertNotStale } from '../../../shared/validation/OptimisticLock';
import { Limits, parseClaim, parseRoleDescription, parseRoleName, type StoredRole } from '../domain/Identity';
import type { AccessIndexService } from './AccessService';
import type { IdentityStore, IdentityTx } from './IdentityStore';
import { roleView, type RoleView } from './IdentityViews';

export interface CreateRoleInput { name: unknown; description: unknown }
export interface UpdateRoleInput extends CreateRoleInput { id: string; expectedLastModified: unknown }
export interface RoleClaimInput { roleId: string; key: unknown; value: unknown }

async function requireRole(tx: IdentityTx, id: string): Promise<StoredRole> {
  const role = await tx.roles.get(id);
  if (!role) throw notFound();
  return role;
}

async function assertNameFree(tx: IdentityTx, name: string, exceptId: string): Promise<void> {
  const taken = (await tx.roles.list()).some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
  if (taken) throw validation('role_name_duplicate');
}

export class RoleCommands {
  constructor(
    private readonly store: IdentityStore,
    private readonly ids: IdGenerator,
    private readonly index: AccessIndexService,
  ) {}

  async create(request: RequestContext, input: CreateRoleInput): Promise<RoleView> {
    const name = parseRoleName(input.name);
    const description = parseRoleDescription(input.description);
    const id = await this.store.run(request, async (tx) => {
      const roles = await tx.roles.list();
      if (roles.length >= Limits.maxRowsPerCollection) throw rule('limit_exceeded');
      await assertNameFree(tx, name, '');
      return (await tx.roles.save({ id: this.ids.next(), name, description })).id;
    });
    return this.reload(request, id);
  }

  async update(request: RequestContext, input: UpdateRoleInput): Promise<RoleView> {
    await this.store.run(request, async (tx) => {
      const role = await requireRole(tx, input.id);
      assertNotStale(role.last_modified, input.expectedLastModified);
      const name = parseRoleName(input.name);
      const description = parseRoleDescription(input.description);
      if (role.name === SUPER_ROLE && name !== role.name) throw rule('role_protected');
      await assertNameFree(tx, name, role.id);
      await tx.roles.save({ id: role.id, name, description });
    });
    await this.index.refreshRoleHolders(input.id);
    return this.reload(request, input.id);
  }

  async remove(request: RequestContext, id: string): Promise<Record<string, never>> {
    await this.store.run(request, async (tx) => {
      const role = await requireRole(tx, id);
      if (role.name === SUPER_ROLE) throw rule('role_protected');
      if ((await tx.assignments.usersOfRole(id)).length > 0) throw rule('role_in_use');
      for (const claim of await tx.assignments.roleClaims(id)) tx.assignments.removeRoleClaim(id, claim);
      tx.roles.remove(id);
    });
    return {};
  }

  async addClaim(request: RequestContext, input: RoleClaimInput): Promise<RoleView> {
    const claim = parseClaim(input.key, input.value);
    await this.store.run(request, async (tx) => {
      const role = await requireRole(tx, input.roleId);
      if (!(await tx.claims.get(claim))) throw validation('claim_unknown');
      const own = await tx.assignments.roleClaims(input.roleId);
      if (own.some((c) => c.key === claim.key && c.value === claim.value)) throw validation('claim_duplicate');
      if (own.length >= Limits.maxClaimsPerOwner) throw rule('limit_exceeded');
      await tx.assignments.addRoleClaim(input.roleId, claim);
      await tx.roles.save(role);
    });
    await this.index.refreshRoleHolders(input.roleId);
    return this.reload(request, input.roleId);
  }

  async removeClaim(request: RequestContext, input: RoleClaimInput): Promise<RoleView> {
    const claim = parseClaim(input.key, input.value);
    await this.store.run(request, async (tx) => {
      const role = await requireRole(tx, input.roleId);
      tx.assignments.removeRoleClaim(input.roleId, claim);
      await tx.roles.save(role);
    });
    await this.index.refreshRoleHolders(input.roleId);
    return this.reload(request, input.roleId);
  }

  private reload(request: RequestContext, id: string): Promise<RoleView> {
    return this.store.run(request, async (tx) => roleView(tx, await requireRole(tx, id)));
  }
}
