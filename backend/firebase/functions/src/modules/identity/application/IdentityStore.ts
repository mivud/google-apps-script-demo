import type { RequestContext } from '../../../shared/context/RequestContext';
import type { Claim, Role, RoleClaim, StoredRole, StoredUser, User, UserClaim, UserRole } from '../domain/Identity';

// Ports of the identity aggregates. Implementations live in persistence/firestore; every call of one
// IdentityStore.run() shares one transaction.
export interface UserRepository {
  get(id: string): Promise<StoredUser | null>;
  findByEmail(email: string): Promise<StoredUser | null>;
  count(): Promise<number>;
  save(user: User): Promise<StoredUser>;
  remove(id: string): void;
}

export interface RoleRepository {
  get(id: string): Promise<StoredRole | null>;
  list(): Promise<StoredRole[]>;
  save(role: Role): Promise<StoredRole>;
  remove(id: string): void;
}

export interface ClaimRepository {
  get(claim: Claim): Promise<Claim | null>;
  count(): Promise<number>;
  save(claim: Claim): Promise<void>;
  remove(claim: Claim): void;
}

export interface AssignmentRepository {
  rolesOfUser(userId: string): Promise<UserRole[]>;
  usersOfRole(roleId: string): Promise<UserRole[]>;
  assignRole(userId: string, roleId: string): Promise<void>;
  unassignRole(userId: string, roleId: string): void;
  roleClaims(roleId: string): Promise<RoleClaim[]>;
  userClaims(userId: string): Promise<UserClaim[]>;
  addRoleClaim(roleId: string, claim: Claim): Promise<void>;
  removeRoleClaim(roleId: string, claim: Claim): void;
  addUserClaim(userId: string, claim: Claim): Promise<void>;
  removeUserClaim(userId: string, claim: Claim): void;
  isClaimHeld(claim: Claim): Promise<boolean>;
}

// Projection read by firestore.rules: one document per allowlisted email.
export interface AccessIndexEntry {
  user_id: string;
  active: boolean;
  is_super: boolean;
  permissions: string[];
}

export interface AccessIndexRepository {
  put(email: string, entry: AccessIndexEntry): void;
  remove(email: string): void;
}

export interface IdentityTx {
  users: UserRepository;
  roles: RoleRepository;
  claims: ClaimRepository;
  assignments: AssignmentRepository;
  accessIndex: AccessIndexRepository;
}

export interface IdentityStore {
  run<T>(request: RequestContext, work: (tx: IdentityTx) => Promise<T>): Promise<T>;
}
