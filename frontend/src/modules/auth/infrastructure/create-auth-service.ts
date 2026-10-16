import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthService } from '../application/auth-service'
import type { SessionProvider } from '../application/session-provider'
import { SessionStore } from '../application/session-store'
import type { RenderSignInButton } from '../ui/auth-context'
import { GoogleIdentityClient } from './google-identity-client'
import { createSignInButtonRenderer } from './google-sign-in-button'
import { SheetsSessionAdapter } from './persistence/googlesheet/sheets-session-adapter'
import { SupabaseSessionAdapter } from './persistence/supabase/supabase-session-adapter'

export type AuthConfig = { googleClientId: string } & (
  | { provider: 'sheets'; identityApiUrl: string }
  | { provider: 'supabase'; client: SupabaseClient }
)

export interface AuthRuntime {
  auth: AuthService
  renderSignInButton: RenderSignInButton
}

function createSessionProvider(config: AuthConfig): SessionProvider {
  switch (config.provider) {
    case 'sheets':
      return new SheetsSessionAdapter(config.identityApiUrl)
    case 'supabase':
      return new SupabaseSessionAdapter(config.client)
  }
}

// The only place that maps a provider choice to its session adapter.
export function createAuthService(config: AuthConfig): AuthRuntime {
  const identity = new GoogleIdentityClient(config.googleClientId)
  const auth = new AuthService(createSessionProvider(config), identity, new SessionStore())
  identity.onCredential(async (idToken, nonce) => {
    await auth.signIn(idToken, nonce)
  })
  return { auth, renderSignInButton: createSignInButtonRenderer(identity) }
}
