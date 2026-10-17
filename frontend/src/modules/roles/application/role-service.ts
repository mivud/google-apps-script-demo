import { validateClaim, type Claim } from '../../claims'
import { validateRoleInput, type Role, type RoleInput } from '../domain/role'
import type { RoleRepository } from './role-repository'

// Validates input at the boundary, then delegates; business rules that need data (in use, protected) live in the backend.
export class RoleService {
  private readonly repository: RoleRepository

  constructor(repository: RoleRepository) {
    this.repository = repository
  }

  list(): Promise<Role[]> {
    return this.repository.listRoles()
  }

  get(id: string): Promise<Role> {
    return this.repository.getRole(id)
  }

  // async so validation errors surface as rejected promises, not sync throws.
  async create(input: RoleInput): Promise<Role> {
    return this.repository.createRole(validateRoleInput(input))
  }

  async update(id: string, input: RoleInput, expectedLastModified: string): Promise<Role> {
    return this.repository.updateRole(id, validateRoleInput(input), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.repository.removeRole(id)
  }

  async addClaim(id: string, claim: Claim): Promise<Role> {
    return this.repository.addRoleClaim(id, validateClaim(claim))
  }

  async removeClaim(id: string, claim: Claim): Promise<Role> {
    return this.repository.removeRoleClaim(id, validateClaim(claim))
  }
}
