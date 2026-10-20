import type { Firestore } from 'firebase-admin/firestore';
import type { RequestContext } from '../../../../shared/context/RequestContext';
import { IDENTITY_AUDIT, type IdentityAudit } from '../../../../shared/audit/AuditStyle';
import { sha256Hex } from '../../../../shared/id/DeterministicId';
import { AuditedCollection } from '../../../../shared/persistence/firestore/AuditedCollection';
import { runInTransaction, type TxContext } from '../../../../shared/persistence/firestore/TxContext';
import type {
  AccessIndexRepository, AssignmentRepository, ClaimRepository, IdentityStore, IdentityTx,
  RoleRepository, UserRepository,
} from '../../application/IdentityStore';
import type { Claim, Role, RoleClaim, User, UserClaim, UserRole } from '../../domain/Identity';

export const IdentityCollections = {
  users: 'users',
  roles: 'roles',
  claims: 'claims',
  userRoles: 'user_roles',
  roleClaims: 'role_claims',
  userClaims: 'user_claims',
  accessIndex: 'access_index',
} as const;

// Claims have a composite natural key, so their document id is a hash of it.
const claimId = (claim: Claim): string => sha256Hex(`${claim.key}\n${claim.value}`);
const collection = <T extends object>(ctx: TxContext, name: string, idOf: (row: T) => string) =>
  new AuditedCollection<T, IdentityAudit>(ctx, name, IDENTITY_AUDIT, idOf);
const toClaim = ({ key, value }: Claim): Claim => ({ key, value });

function userRepository(ctx: TxContext): UserRepository {
  const users = collection<User>(ctx, IdentityCollections.users, (row) => row.id);
  return {
    get: (id) => users.get(id),
    findByEmail: async (email) => (await users.find([['email', email]], 1))[0] ?? null,
    count: async () => (await users.find()).length,
    save: (user) => users.save(user),
    remove: (id) => users.remove(id),
  };
}

function roleRepository(ctx: TxContext): RoleRepository {
  const roles = collection<Role>(ctx, IdentityCollections.roles, (row) => row.id);
  return {
    get: (id) => roles.get(id),
    list: () => roles.find(),
    save: (role) => roles.save(role),
    remove: (id) => roles.remove(id),
  };
}

function claimRepository(ctx: TxContext): ClaimRepository {
  const claims = collection<Claim>(ctx, IdentityCollections.claims, claimId);
  return {
    get: async (claim) => {
      const stored = await claims.get(claimId(claim));
      return stored ? toClaim(stored) : null;
    },
    count: async () => (await claims.find()).length,
    save: async (claim) => { await claims.save(toClaim(claim)); },
    remove: (claim) => claims.remove(claimId(claim)),
  };
}

function assignmentRepository(ctx: TxContext): AssignmentRepository {
  const userRoles = collection<UserRole>(ctx, IdentityCollections.userRoles, (r) => `${r.user_id}_${r.role_id}`);
  const roleClaims = collection<RoleClaim>(ctx, IdentityCollections.roleClaims, (r) => `${r.role_id}_${claimId(r)}`);
  const userClaims = collection<UserClaim>(ctx, IdentityCollections.userClaims, (r) => `${r.user_id}_${claimId(r)}`);
  return {
    rolesOfUser: (userId) => userRoles.find([['user_id', userId]]),
    usersOfRole: (roleId) => userRoles.find([['role_id', roleId]]),
    assignRole: async (userId, roleId) => { await userRoles.save({ user_id: userId, role_id: roleId }); },
    unassignRole: (userId, roleId) => userRoles.remove(`${userId}_${roleId}`),
    roleClaims: (roleId) => roleClaims.find([['role_id', roleId]]),
    userClaims: (userId) => userClaims.find([['user_id', userId]]),
    addRoleClaim: async (roleId, claim) => { await roleClaims.save({ role_id: roleId, ...toClaim(claim) }); },
    removeRoleClaim: (roleId, claim) => roleClaims.remove(`${roleId}_${claimId(claim)}`),
    addUserClaim: async (userId, claim) => { await userClaims.save({ user_id: userId, ...toClaim(claim) }); },
    removeUserClaim: (userId, claim) => userClaims.remove(`${userId}_${claimId(claim)}`),
    isClaimHeld: async (claim) => {
      const filters = [['key', claim.key], ['value', claim.value]] as const;
      return (await roleClaims.find(filters, 1)).length + (await userClaims.find(filters, 1)).length > 0;
    },
  };
}

function accessIndexRepository(ctx: TxContext): AccessIndexRepository {
  return {
    put: (email, entry) => ctx.set(IdentityCollections.accessIndex, email, entry),
    remove: (email) => ctx.remove(IdentityCollections.accessIndex, email),
  };
}

export class FirestoreIdentityStore implements IdentityStore {
  constructor(private readonly db: Firestore) {}

  run<T>(request: RequestContext, work: (tx: IdentityTx) => Promise<T>): Promise<T> {
    return runInTransaction(this.db, request, (ctx) => work({
      users: userRepository(ctx),
      roles: roleRepository(ctx),
      claims: claimRepository(ctx),
      assignments: assignmentRepository(ctx),
      accessIndex: accessIndexRepository(ctx),
    }));
  }
}
