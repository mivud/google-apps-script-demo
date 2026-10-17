import { NotFoundError, ValidationError } from '../../../shared/errors'
import { sameClaim, sortClaims, type Claim } from '../../claims'
import type { RoleRepository } from '../application/role-repository'
import { isBuiltInRoleName, type Role, type RoleInput } from '../domain/role'

// Test double mirroring the backend rules: duplicates, protected roles, unknown claims, role in use, conflict.
export class InMemoryRoleRepository implements RoleRepository {
  readonly roles: Role[] = []
  // Claims that exist in the claims catalog; adding anything else fails with claim_unknown.
  readonly knownClaims: Claim[] = []
  // Role ids tests mark as assigned to users.
  readonly assignedRoleIds = new Set<string>()
  private counter = 0
  private clock = 0

  async listRoles(): Promise<Role[]> {
    return this.roles.map((role) => this.copy(role))
  }

  async getRole(id: string): Promise<Role> {
    return this.copy(this.find(id))
  }

  async createRole(input: RoleInput): Promise<Role> {
    this.assertNameFree(input.name)
    const stamp = this.nextStamp()
    const role: Role = {
      id: `role-${++this.counter}`,
      ...input,
      claims: [],
      created: stamp,
      createdBy: 'test',
      lastModified: stamp,
      lastModifiedBy: 'test',
    }
    this.roles.push(role)
    return this.copy(role)
  }

  async updateRole(id: string, input: RoleInput, expectedLastModified: string): Promise<Role> {
    const role = this.find(id)
    if (role.lastModified !== expectedLastModified) throw new ValidationError(undefined, 'conflict')
    if (role.name !== input.name) {
      if (isBuiltInRoleName(role.name)) throw new ValidationError(undefined, 'role_protected')
      this.assertNameFree(input.name)
    }
    Object.assign(role, input, { lastModified: this.nextStamp(), lastModifiedBy: 'test' })
    return this.copy(role)
  }

  async removeRole(id: string): Promise<void> {
    const role = this.find(id)
    if (isBuiltInRoleName(role.name)) throw new ValidationError(undefined, 'role_protected')
    if (this.assignedRoleIds.has(id)) throw new ValidationError(undefined, 'role_in_use')
    this.roles.splice(this.roles.indexOf(role), 1)
  }

  async addRoleClaim(id: string, claim: Claim): Promise<Role> {
    const role = this.find(id)
    if (!this.knownClaims.some((known) => sameClaim(known, claim))) throw new ValidationError(undefined, 'claim_unknown')
    if (!role.claims.some((existing) => sameClaim(existing, claim))) role.claims.push({ ...claim })
    return this.copy(role)
  }

  async removeRoleClaim(id: string, claim: Claim): Promise<Role> {
    const role = this.find(id)
    role.claims = role.claims.filter((existing) => !sameClaim(existing, claim))
    return this.copy(role)
  }

  private find(id: string): Role {
    const role = this.roles.find((candidate) => candidate.id === id)
    if (!role) throw new NotFoundError()
    return role
  }

  private assertNameFree(name: string): void {
    if (this.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError(undefined, 'role_name_duplicate')
    }
  }

  // Monotonic fake timestamps so every write changes last_modified.
  private nextStamp(): string {
    return `2026-01-01T00:00:${String(++this.clock).padStart(2, '0')}.000+00:00`
  }

  private copy(role: Role): Role {
    return { ...role, claims: sortClaims(role.claims) }
  }
}
