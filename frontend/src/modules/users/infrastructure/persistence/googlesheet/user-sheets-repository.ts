import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import { claimToRow, type Claim } from '../../../../claims'
import type { UserRepository } from '../../../application/user-repository'
import type { User, UserCreateInput, UserUpdateInput } from '../../../domain/user'
import { rowsToUsers, rowToUser, userCreateToRow, userUpdateToRow, type UserRow } from '../user-rows'
import { USER_ACTIONS } from './api-actions'

export class UserSheetsRepository implements UserRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async listUsers(): Promise<User[]> {
    return rowsToUsers(await this.caller.call<{ items: unknown }>(USER_ACTIONS.list, {}))
  }

  getUser(id: string): Promise<User> {
    return this.callForUser(USER_ACTIONS.get, { id })
  }

  createUser(input: UserCreateInput): Promise<User> {
    return this.callForUser(USER_ACTIONS.create, userCreateToRow(input))
  }

  updateUser(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User> {
    return this.callForUser(USER_ACTIONS.update, {
      id,
      ...userUpdateToRow(input),
      expected_last_modified: expectedLastModified,
    })
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

  private async callForUser(action: string, payload: unknown): Promise<User> {
    return rowToUser(await this.caller.call<UserRow>(action, payload))
  }
}
