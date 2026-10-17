import type { Claim } from '../../claims'
import type { User, UserCreateInput, UserUpdateInput } from '../domain/user'

export interface UserRepository {
  listUsers(): Promise<User[]>
  getUser(id: string): Promise<User>
  createUser(input: UserCreateInput): Promise<User>
  // A stale expectedLastModified fails with ValidationError code 'conflict'.
  updateUser(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User>
  removeUser(id: string): Promise<void>
  assignUserRole(userId: string, roleId: string): Promise<User>
  unassignUserRole(userId: string, roleId: string): Promise<User>
  addUserClaim(userId: string, claim: Claim): Promise<User>
  removeUserClaim(userId: string, claim: Claim): Promise<User>
}
