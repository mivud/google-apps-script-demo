import { documentId, where } from 'firebase/firestore'
import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, sortRows } from '../../../../../shared/api/firebase-row-order'
import { NotFoundError } from '../../../../../shared/errors'
import { claimToRow, sortClaims, type Claim } from '../../../../claims'
import type { RoleRepository } from '../../../application/role-repository'
import type { Role, RoleInput } from '../../../domain/role'
import { roleInputToRow, rowToRole, type RoleRow } from '../role-rows'

// Callable API action names, namespaced as <module>.<entity>.<action>.
const ROLE_ACTIONS = {
  create: 'roles.role.create',
  update: 'roles.role.update',
  remove: 'roles.role.delete',
  addClaim: 'roles.roleClaim.add',
  removeClaim: 'roles.roleClaim.remove',
} as const
const ROLES_COLLECTION = 'roles'
const ROLE_CLAIMS_COLLECTION = 'role_claims'

type Row = Record<string, unknown>

function toRole(row: Row, claims: Row[]): Role {
  const role = rowToRole({ ...(row as unknown as RoleRow), claims })
  return { ...role, claims: sortClaims(role.claims) }
}

// Reads hit Firestore under its security rules; writes go through the API callable only.
export class RoleFirebaseRepository implements RoleRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async listRoles(): Promise<Role[]> {
    const [roles, links] = await Promise.all([this.caller.rows(ROLES_COLLECTION), this.caller.rows(ROLE_CLAIMS_COLLECTION)])
    return sortRows(roles, ascending('name'), ascending('id')).map((row) => toRole(row, links.filter((link) => link.role_id === row.id)))
  }

  async getRole(id: string): Promise<Role> {
    const [roles, links] = await Promise.all([
      this.caller.rows(ROLES_COLLECTION, where(documentId(), '==', id)),
      this.caller.rows(ROLE_CLAIMS_COLLECTION, where('role_id', '==', id)),
    ])
    if (roles.length === 0) throw new NotFoundError()
    return toRole(roles[0], links)
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
