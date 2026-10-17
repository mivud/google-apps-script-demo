import { NotFoundError, ValidationError } from '../../../shared/errors'
import { sameClaim, sortClaims, type Claim } from '../../claims'
import type { UserRepository } from '../application/user-repository'
import { MAX_ROLES_PER_USER, type User, type UserCreateInput, type UserUpdateInput } from '../domain/user'

// Test double mirroring the backend rules: duplicate email, limits, unknown claims, conflict.
export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = []
  // Claims that exist in the claims catalog; adding anything else fails with claim_unknown.
  readonly knownClaims: Claim[] = []
  private counter = 0
  private clock = 0

  async listUsers(): Promise<User[]> {
    return this.users.map((user) => this.copy(user))
  }

  async getUser(id: string): Promise<User> {
    return this.copy(this.find(id))
  }

  async createUser(input: UserCreateInput): Promise<User> {
    this.assertEmailFree(input.email)
    const stamp = this.nextStamp()
    const user: User = {
      id: `user-${++this.counter}`,
      email: input.email,
      active: input.active,
      roleIds: [...input.roleIds],
      claims: [],
      created: stamp,
      createdBy: 'test',
      lastModified: stamp,
      lastModifiedBy: 'test',
    }
    this.users.push(user)
    return this.copy(user)
  }

  async updateUser(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User> {
    const user = this.find(id)
    if (user.lastModified !== expectedLastModified) throw new ValidationError(undefined, 'conflict')
    if (user.email !== input.email) this.assertEmailFree(input.email)
    Object.assign(user, input, { lastModified: this.nextStamp(), lastModifiedBy: 'test' })
    return this.copy(user)
  }

  async removeUser(id: string): Promise<void> {
    this.users.splice(this.users.indexOf(this.find(id)), 1)
  }

  async assignUserRole(userId: string, roleId: string): Promise<User> {
    const user = this.find(userId)
    if (!user.roleIds.includes(roleId)) {
      if (user.roleIds.length >= MAX_ROLES_PER_USER) throw new ValidationError(undefined, 'limit_exceeded')
      user.roleIds.push(roleId)
    }
    return this.copy(user)
  }

  async unassignUserRole(userId: string, roleId: string): Promise<User> {
    const user = this.find(userId)
    user.roleIds = user.roleIds.filter((id) => id !== roleId)
    return this.copy(user)
  }

  async addUserClaim(userId: string, claim: Claim): Promise<User> {
    const user = this.find(userId)
    if (!this.knownClaims.some((known) => sameClaim(known, claim))) throw new ValidationError(undefined, 'claim_unknown')
    if (!user.claims.some((existing) => sameClaim(existing, claim))) user.claims.push({ ...claim })
    return this.copy(user)
  }

  async removeUserClaim(userId: string, claim: Claim): Promise<User> {
    const user = this.find(userId)
    user.claims = user.claims.filter((existing) => !sameClaim(existing, claim))
    return this.copy(user)
  }

  private find(id: string): User {
    const user = this.users.find((candidate) => candidate.id === id)
    if (!user) throw new NotFoundError()
    return user
  }

  private assertEmailFree(email: string): void {
    if (this.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      throw new ValidationError(undefined, 'user_email_duplicate')
    }
  }

  // Monotonic fake timestamps so every write changes last_modified.
  private nextStamp(): string {
    return `2026-01-01T00:00:${String(++this.clock).padStart(2, '0')}.000+00:00`
  }

  private copy(user: User): User {
    return { ...user, roleIds: [...user.roleIds], claims: sortClaims(user.claims) }
  }
}
