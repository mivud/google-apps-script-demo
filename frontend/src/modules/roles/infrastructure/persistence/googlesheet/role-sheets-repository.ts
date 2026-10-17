import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import { claimToRow, type Claim } from '../../../../claims'
import type { RoleRepository } from '../../../application/role-repository'
import type { Role, RoleInput } from '../../../domain/role'
import { roleInputToRow, rowsToRoles, rowToRole, type RoleRow } from '../role-rows'
import { ROLE_ACTIONS } from './api-actions'

export class RoleSheetsRepository implements RoleRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async listRoles(): Promise<Role[]> {
    return rowsToRoles(await this.caller.call<{ items: unknown }>(ROLE_ACTIONS.list, {}))
  }

  async getRole(id: string): Promise<Role> {
    return rowToRole(await this.caller.call<RoleRow>(ROLE_ACTIONS.get, { id }))
  }

  async createRole(input: RoleInput): Promise<Role> {
    return rowToRole(await this.caller.call<RoleRow>(ROLE_ACTIONS.create, roleInputToRow(input)))
  }

  async updateRole(id: string, input: RoleInput, expectedLastModified: string): Promise<Role> {
    const payload = { id, ...roleInputToRow(input), expected_last_modified: expectedLastModified }
    return rowToRole(await this.caller.call<RoleRow>(ROLE_ACTIONS.update, payload))
  }

  async removeRole(id: string): Promise<void> {
    await this.caller.call<unknown>(ROLE_ACTIONS.remove, { id })
  }

  async addRoleClaim(id: string, claim: Claim): Promise<Role> {
    return rowToRole(await this.caller.call<RoleRow>(ROLE_ACTIONS.addClaim, { role_id: id, ...claimToRow(claim) }))
  }

  async removeRoleClaim(id: string, claim: Claim): Promise<Role> {
    return rowToRole(await this.caller.call<RoleRow>(ROLE_ACTIONS.removeClaim, { role_id: id, ...claimToRow(claim) }))
  }
}
