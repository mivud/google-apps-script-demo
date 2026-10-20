import { documentId, where } from 'firebase/firestore'
import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, sortRows } from '../../../../../shared/api/firebase-row-order'
import { NotFoundError } from '../../../../../shared/errors'
import { claimToRow, sortClaims, type Claim } from '../../../../claims'
import type { UserRepository } from '../../../application/user-repository'
import type { User, UserCreateInput, UserUpdateInput } from '../../../domain/user'
import { rowToUser, userCreateToRow, userUpdateToRow, type UserRow } from '../user-rows'

// Callable API action names, namespaced as <module>.<entity>.<action>.
const USER_ACTIONS = {
  create: 'users.user.create',
  update: 'users.user.update',
  remove: 'users.user.delete',
  assignRole: 'users.userRole.assign',
  unassignRole: 'users.userRole.unassign',
  addClaim: 'users.userClaim.add',
  removeClaim: 'users.userClaim.remove',
} as const
const USERS_COLLECTION = 'users'
const USER_ROLES_COLLECTION = 'user_roles'
const USER_CLAIMS_COLLECTION = 'user_claims'

type Row = Record<string, unknown>

function toUser(row: Row, roleLinks: Row[], claims: Row[]): User {
  const roleIds = roleLinks.map((link) => link.role_id)
  const user = rowToUser({ ...(row as unknown as UserRow), role_ids: roleIds, claims })
  return { ...user, claims: sortClaims(user.claims) }
}

// Reads hit Firestore under its security rules; writes go through the API callable only.
export class UserFirebaseRepository implements UserRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async listUsers(): Promise<User[]> {
    const [users, roleLinks, claims] = await Promise.all([
      this.caller.rows(USERS_COLLECTION),
      this.caller.rows(USER_ROLES_COLLECTION),
      this.caller.rows(USER_CLAIMS_COLLECTION),
    ])
    return sortRows(users, ascending('email'), ascending('id')).map((row) =>
      toUser(row, roleLinks.filter((link) => link.user_id === row.id), claims.filter((claim) => claim.user_id === row.id)),
    )
  }

  async getUser(id: string): Promise<User> {
    const [users, roleLinks, claims] = await Promise.all([
      this.caller.rows(USERS_COLLECTION, where(documentId(), '==', id)),
      this.caller.rows(USER_ROLES_COLLECTION, where('user_id', '==', id)),
      this.caller.rows(USER_CLAIMS_COLLECTION, where('user_id', '==', id)),
    ])
    if (users.length === 0) throw new NotFoundError()
    return toUser(users[0], roleLinks, claims)
  }

  createUser(input: UserCreateInput): Promise<User> {
    return this.callForUser(USER_ACTIONS.create, userCreateToRow(input))
  }

  updateUser(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User> {
    return this.callForUser(USER_ACTIONS.update, { id, ...userUpdateToRow(input), expected_last_modified: expectedLastModified })
  }

  async removeUser(id: string): Promise<void> {
    await this.caller.call<unknown>(USER_ACTIONS.remove, { id })
  }

  assignUserRole(userId: string, roleId: string): Promise<User> {
    return this.callForUser(USER_ACTIONS.assignRole, { user_id: userId, role_id: roleId })
  }

  unassignUserRole(userId: string, roleId: string): Promise<User> {
    return this.callForUser(USER_ACTIONS.unassignRole, { user_id: userId, role_id: roleId })
  }

  addUserClaim(userId: string, claim: Claim): Promise<User> {
    return this.callForUser(USER_ACTIONS.addClaim, { user_id: userId, ...claimToRow(claim) })
  }

  removeUserClaim(userId: string, claim: Claim): Promise<User> {
    return this.callForUser(USER_ACTIONS.removeClaim, { user_id: userId, ...claimToRow(claim) })
  }

  private async callForUser(action: string, payload: object): Promise<User> {
    return rowToUser(await this.caller.call<UserRow>(action, payload))
  }
}
