import type { SupabaseClient } from '@supabase/supabase-js'
import { toSupabaseIdentityError } from '../../../../../shared/api/identity-errors'
import { NotFoundError, ValidationError } from '../../../../../shared/errors'
import { claimToRow, sortClaims, type Claim } from '../../../../claims'
import type { RoleRepository } from '../../../application/role-repository'
import type { Role, RoleInput } from '../../../domain/role'
import { roleInputToRow, rowToRole, type RoleRow } from '../role-rows'

const ROLE_SELECT = '*, role_claims(key,value)'

type RoleWithClaims = RoleRow & { role_claims?: unknown }

function toRole(row: RoleWithClaims): Role {
  const role = rowToRole({ ...row, claims: row.role_claims })
  return { ...role, claims: sortClaims(role.claims) }
}

// Admin writes go through RLS; the anon key is the only credential in the browser.
export class RoleSupabaseRepository implements RoleRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listRoles(): Promise<Role[]> {
    const { data, error } = await this.client.from('roles').select(ROLE_SELECT).order('name')
    if (error) throw toSupabaseIdentityError(error)
    return (data as RoleWithClaims[]).map(toRole)
  }

  async getRole(id: string): Promise<Role> {
    const { data, error } = await this.client.from('roles').select(ROLE_SELECT).eq('id', id).maybeSingle()
    if (error) throw toSupabaseIdentityError(error)
    if (!data) throw new NotFoundError()
    return toRole(data as RoleWithClaims)
  }

  async createRole(input: RoleInput): Promise<Role> {
    const { data, error } = await this.client.from('roles').insert(roleInputToRow(input)).select(ROLE_SELECT).single()
    if (error) throw toSupabaseIdentityError(error, 'role_name_duplicate')
    return toRole(data as RoleWithClaims)
  }

  // The last_modified filter is the optimistic-concurrency check: zero rows means stale or missing.
  async updateRole(id: string, input: RoleInput, expectedLastModified: string): Promise<Role> {
    const { data, error } = await this.client
      .from('roles')
      .update(roleInputToRow(input))
      .eq('id', id)
      .eq('last_modified', expectedLastModified)
      .select(ROLE_SELECT)
      .maybeSingle()
    if (error) throw toSupabaseIdentityError(error, 'role_name_duplicate')
    if (data) return toRole(data as RoleWithClaims)
    await this.getRole(id)
    throw new ValidationError(undefined, 'conflict')
  }

  async removeRole(id: string): Promise<void> {
    const { data, error } = await this.client.from('roles').delete().eq('id', id).select('id')
    if (error) throw toSupabaseIdentityError(error)
    if (!data || data.length === 0) throw new NotFoundError()
  }

  async addRoleClaim(id: string, claim: Claim): Promise<Role> {
    const { error } = await this.client.from('role_claims').insert({ role_id: id, ...claimToRow(claim) })
    if (error) throw toSupabaseIdentityError(error, 'claim_duplicate')
    return this.getRole(id)
  }

  async removeRoleClaim(id: string, claim: Claim): Promise<Role> {
    const { error } = await this.client
      .from('role_claims')
      .delete()
      .eq('role_id', id)
      .eq('key', claim.key)
      .eq('value', claim.value)
    if (error) throw toSupabaseIdentityError(error)
    return this.getRole(id)
  }
}
