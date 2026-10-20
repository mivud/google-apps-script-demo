import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound, rule, validation } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { assertNotStale } from '../../../shared/validation/OptimisticLock';
import { Limits, parseClaim, parseEmail, type StoredUser } from '../domain/Identity';
import type { AccessIndexService } from './AccessService';
import { SUPER_ROLE } from '../../../shared/auth/Access';
import type { IdentityStore, IdentityTx } from './IdentityStore';
import { guardSuperEmailChange, guardSuperRemoval } from './LockoutGuard';
import { userView, type UserView } from './IdentityViews';

export interface CreateUserInput { email: unknown; active?: boolean; roleIds: string[] }
export interface UpdateUserInput { id: string; email: unknown; active?: boolean; expectedLastModified: unknown }
export interface UserClaimInput { userId: string; key: unknown; value: unknown }

async function requireUser(tx: IdentityTx, id: string): Promise<StoredUser> {
  const user = await tx.users.get(id);
  if (!user) throw notFound();
  return user;
}

async function assignRoleChecked(tx: IdentityTx, userId: string, roleId: string): Promise<void> {
  if (!(await tx.roles.get(roleId))) throw notFound();
  const current = await tx.assignments.rolesOfUser(userId);
  if (current.some((link) => link.role_id === roleId)) return;
  if (current.length >= Limits.maxRolesPerUser) throw rule('limit_exceeded');
  await tx.assignments.assignRole(userId, roleId);
}

// One transaction per command: lockout checks, uniqueness and limits are decided on data locked by it.
export class UserCommands {
  constructor(
    private readonly store: IdentityStore,
    private readonly ids: IdGenerator,
    private readonly index: AccessIndexService,
  ) {}

  async create(request: RequestContext, input: CreateUserInput): Promise<UserView> {
    const email = parseEmail(input.email);
    const userId = await this.store.run(request, async (tx) => {
      if (await tx.users.findByEmail(email)) throw validation('user_email_duplicate');
      if ((await tx.users.count()) >= Limits.maxRowsPerCollection) throw rule('limit_exceeded');
      const user = await tx.users.save({ id: this.ids.next(), email, active: input.active ?? true });
      for (const roleId of new Set(input.roleIds)) await assignRoleChecked(tx, user.id, roleId);
      return user.id;
    });
    await this.index.refreshUsers([userId]);
    return this.reload(request, userId);
  }

  async update(request: RequestContext, input: UpdateUserInput): Promise<UserView> {
    const previousEmail = await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, input.id);
      assertNotStale(user.last_modified, input.expectedLastModified);
      const email = parseEmail(input.email);
      const active = input.active ?? user.active;
      const emailChanged = email !== user.email;
      if (emailChanged && (await tx.users.findByEmail(email))) throw validation('user_email_duplicate');
      if (user.active && !active) await guardSuperRemoval(tx, user, request.actor);
      else if (emailChanged) await guardSuperEmailChange(tx, user, request.actor);
      await tx.users.save({ id: user.id, email, active });
      return emailChanged ? user.email : null;
    });
    await this.index.refreshUsers([input.id], previousEmail ? [previousEmail] : []);
    return this.reload(request, input.id);
  }

  async remove(request: RequestContext, id: string): Promise<Record<string, never>> {
    const email = await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, id);
      await guardSuperRemoval(tx, user, request.actor);
      for (const link of await tx.assignments.rolesOfUser(id)) tx.assignments.unassignRole(id, link.role_id);
      for (const claim of await tx.assignments.userClaims(id)) tx.assignments.removeUserClaim(id, claim);
      tx.users.remove(id);
      return user.email;
    });
    await this.index.refreshUsers([], [email]);
    return {};
  }

  async assignRole(request: RequestContext, userId: string, roleId: string): Promise<UserView> {
    await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, userId);
      await assignRoleChecked(tx, userId, roleId);
      await tx.users.save(user);
    });
    await this.index.refreshUsers([userId]);
    return this.reload(request, userId);
  }

  async unassignRole(request: RequestContext, userId: string, roleId: string): Promise<UserView> {
    await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, userId);
      const role = await tx.roles.get(roleId);
      const assigned = (await tx.assignments.rolesOfUser(userId)).some((link) => link.role_id === roleId);
      if (assigned && role?.name === SUPER_ROLE) await guardSuperRemoval(tx, user, request.actor);
      tx.assignments.unassignRole(userId, roleId);
      await tx.users.save(user);
    });
    await this.index.refreshUsers([userId]);
    return this.reload(request, userId);
  }

  async addClaim(request: RequestContext, input: UserClaimInput): Promise<UserView> {
    const claim = parseClaim(input.key, input.value);
    await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, input.userId);
      if (!(await tx.claims.get(claim))) throw validation('claim_unknown');
      const own = await tx.assignments.userClaims(input.userId);
      if (own.some((c) => c.key === claim.key && c.value === claim.value)) throw validation('claim_duplicate');
      if (own.length >= Limits.maxClaimsPerOwner) throw rule('limit_exceeded');
      await tx.assignments.addUserClaim(input.userId, claim);
      await tx.users.save(user);
    });
    await this.index.refreshUsers([input.userId]);
    return this.reload(request, input.userId);
  }

  async removeClaim(request: RequestContext, input: UserClaimInput): Promise<UserView> {
    const claim = parseClaim(input.key, input.value);
    await this.store.run(request, async (tx) => {
      const user = await requireUser(tx, input.userId);
      tx.assignments.removeUserClaim(input.userId, claim);
      await tx.users.save(user);
    });
    await this.index.refreshUsers([input.userId]);
    return this.reload(request, input.userId);
  }

  private reload(request: RequestContext, id: string): Promise<UserView> {
    return this.store.run(request, async (tx) => userView(tx, await requireUser(tx, id)));
  }
}
