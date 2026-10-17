import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthError, ForbiddenError, NetworkError } from '../../../../../shared/errors'
import type { SessionProvider } from '../../../application/session-provider'
import { parseEffectiveAccess } from '../../../domain/effective-access'
import type { Identity } from '../../../domain/session'

const CURRENT_IDENTITY_RPC = 'current_identity'

export class SupabaseSessionAdapter implements SessionProvider {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async establish(idToken: string, nonce: string): Promise<Identity> {
    const { data, error } = await this.client.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce })
    if (error || !data.user?.email) throw new AuthError()
    const identity = await this.loadIdentityOrSignOut(data.user.email)
    if (!identity) {
      await this.clear()
      throw new ForbiddenError()
    }
    return identity
  }

  async clear(): Promise<void> {
    await this.client.auth.signOut()
  }

  // A failed lookup must not leave a Supabase session behind without an app session.
  private async loadIdentityOrSignOut(email: string) {
    try {
      return await this.loadIdentity(email)
    } catch (error) {
      await this.clear()
      throw error
    }
  }

  // The RPC returns null for unknown or inactive users and for callers without a valid primary role.
  private async loadIdentity(email: string): Promise<Identity | null> {
    const { data, error } = await this.client.rpc(CURRENT_IDENTITY_RPC)
    if (error) throw new NetworkError()
    if (!data) return null
    const access = parseEffectiveAccess(data)
    if (access.role === '') return null
    return { ...access, role: access.role, email: access.email || email }
  }
}
