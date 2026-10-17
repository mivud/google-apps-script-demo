import type { SupabaseClient } from '@supabase/supabase-js'
import { toSupabaseIdentityError } from '../../../../../shared/api/identity-errors'
import { NotFoundError, ValidationError } from '../../../../../shared/errors'
import { claimToRow, sortClaims, type Claim } from '../../../../claims'
import type { UserRepository } from '../../../application/user-repository'
import type { User, UserCreateInput, UserUpdateInput } from '../../../domain/user'
import { rowToUser, userUpdateToRow, type UserRow } from '../user-rows'

const USER_SELECT = '*, user_roles(role_id), user_claims(key,value)'
const UNIQUE_VIOLATION = '23505'

type UserWithRelations = Omit<UserRow, 'role_ids' | 'claims'> & {
  user_roles?: { role_id: string }[]
  user_claims?: unknown
}

function toUser(row: UserWithRelations): User {
  const user = rowToUser({ ...row, role_ids: (row.user_roles ?? []).map((link) => link.role_id), claims: row.user_claims })
  return { ...user, claims: sortClaims(user.claims) }
}

// Admin writes go through RLS; the anon key is the only credential in the browser.
export class UserSupabaseRepository implements UserRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listUsers(): Promise<User[]> {
    const { data, error } = await this.client.from('users').select(USER_SELECT).order('email')
    if (error) throw toSupabaseIdentityError(error)
    return (data as UserWithRelations[]).map(toUser)
  }

  async getUser(id: string): Promise<User> {
    const { data, error } = await this.client.from('users').select(USER_SELECT).eq('id', id).maybeSingle()
    if (error) throw toSupabaseIdentityError(error)
    if (!data) throw new NotFoundError()
    return toUser(data as UserWithRelations)
  }

  async createUser(input: UserCreateInput): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .insert({ email: input.email, active: input.active })
      .select('id')
      .single()
    if (error) throw toSupabaseIdentityError(error, 'user_email_duplicate')
    const id = (data as { id: string }).id
    for (const roleId of input.roleIds) await this.insertUserRole(id, roleId)
    return this.getUser(id)
  }

  // The last_modified filter is the optimistic-concurrency check: zero rows means stale or missing.
  async updateUser(id: string, input: UserUpdateInput, expectedLastModified: string): Promise<User> {
    const { data, error } = await this.client
      .from('users')
      .update(userUpdateToRow(input))
      .eq('id', id)
      .eq('last_modified', expectedLastModified)
      .select('id')
      .maybeSingle()
    if (error) throw toSupabaseIdentityError(error, 'user_email_duplicate')
    if (!data) {
      await this.getUser(id)
      throw new ValidationError(undefined, 'conflict')
    }
    return this.getUser(id)
  }

  async removeUser(id: string): Promise<void> {
    const { data, error } = await this.client.from('users').delete().eq('id', id).select('id')
    if (error) throw toSupabaseIdentityError(error)
    if (!data || data.length === 0) throw new NotFoundError()
  }

  async assignUserRole(userId: string, roleId: string): Promise<User> {
    await this.insertUserRole(userId, roleId)
    return this.getUser(userId)
  }

  async unassignUserRole(userId: string, roleId: string): Promise<User> {
    const { error } = await this.client.from('user_roles').delete().eq('user_id', userId).eq('role_id', roleId)
    if (error) throw toSupabaseIdentityError(error)
    return this.getUser(userId)
  }

  async addUserClaim(userId: string, claim: Claim): Promise<User> {
    const { error } = await this.client.from('user_claims').insert({ user_id: userId, ...claimToRow(claim) })
    if (error) throw toSupabaseIdentityError(error, 'claim_duplicate')
    return this.getUser(userId)
  }

  async removeUserClaim(userId: string, claim: Claim): Promise<User> {
    const { error } = await this.client
      .from('user_claims')
      .delete()
      .eq('user_id', userId)
      .eq('key', claim.key)
      .eq('value', claim.value)
    if (error) throw toSupabaseIdentityError(error)
    return this.getUser(userId)
  }

  // Assigning a role the user already has is a no-op, matching the Sheets backend.
  private async insertUserRole(userId: string, roleId: string): Promise<void> {
    const { error } = await this.client.from('user_roles').insert({ user_id: userId, role_id: roleId })
    if (error && error.code !== UNIQUE_VIOLATION) throw toSupabaseIdentityError(error)
  }
}
