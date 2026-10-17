import type { Claim } from '../../claims'
import type { Role, RoleInput } from '../domain/role'

export interface RoleRepository {
  listRoles(): Promise<Role[]>
  getRole(id: string): Promise<Role>
  createRole(input: RoleInput): Promise<Role>
  // A stale expectedLastModified fails with ValidationError code 'conflict'.
  updateRole(id: string, input: RoleInput, expectedLastModified: string): Promise<Role>
  removeRole(id: string): Promise<void>
  addRoleClaim(id: string, claim: Claim): Promise<Role>
  removeRoleClaim(id: string, claim: Claim): Promise<Role>
}
