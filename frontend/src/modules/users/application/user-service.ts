import { validateClaim, type Claim } from '../../claims'
import {
  validateUserCreateInput,
  validateUserUpdateInput,
  type User,
  type UserCreateInput,
  type UserUpdateInput,
} from '../domain/user'
import type { UserRepository } from './user-repository'

// Validates input at the boundary, then delegates; last-admin and self-lockout rules are enforced by the backend.
export class UserService {
  private readonly repository: UserRepository

  constructor(repository: UserRepository) {
    this.repository = repository
  }

  list(): Promise<User[]> {
    return this.repository.listUsers()
  }

  get(id: string): Promise<User> {
    return this.repository.getUser(id)
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async create(input: UserCreateInput): Promise<User> {
    return this.repository.createUser(validateUserCreateInput(input))
  }

  async update(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User> {
    return this.repository.updateUser(id, validateUserUpdateInput(input), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.repository.removeUser(id)
  }

  assignRole(userId: string, roleId: string): Promise<User> {
    return this.repository.assignUserRole(userId, roleId)
  }

  unassignRole(userId: string, roleId: string): Promise<User> {
    return this.repository.unassignUserRole(userId, roleId)
  }

  async addClaim(userId: string, claim: Claim): Promise<User> {
    return this.repository.addUserClaim(userId, validateClaim(claim))
  }

  async removeClaim(userId: string, claim: Claim): Promise<User> {
    return this.repository.removeUserClaim(userId, validateClaim(claim))
  }
}
