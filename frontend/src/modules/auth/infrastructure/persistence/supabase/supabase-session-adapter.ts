import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthError, ForbiddenError, NetworkError } from '../../../../../shared/errors'
import type { SessionProvider } from '../../../application/session-provider'
import { isRole } from '../../../domain/role'
import type { Identity } from '../../../domain/session'

export class SupabaseSessionAdapter implements SessionProvider {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async establish(idToken: string, nonce: string): Promise<Identity> {
    const { data, error } = await this.client.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce })
    if (error || !data.user?.email) throw new AuthError()
    const role = await this.loadRoleOrSignOut()
    if (!role) {
      await this.clear()
      throw new ForbiddenError()
    }
    return { email: data.user.email, role }
  }

  async clear(): Promise<void> {
    await this.client.auth.signOut()
  }

  // A failed role lookup must not leave a Supabase session behind without an app session.
  private async loadRoleOrSignOut() {
    try {
      return await this.loadRole()
    } catch (error) {
      await this.clear()
      throw error
    }
  }

  // RLS exposes only the caller's own active row, so no row means "not on the allowlist".
  private async loadRole() {
    const { data, error } = await this.client.from('users').select('role').maybeSingle()
    if (error) throw new NetworkError()
    return isRole(data?.role) ? data.role : null
  }
}
