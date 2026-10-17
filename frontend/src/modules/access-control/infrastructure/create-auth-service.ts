import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthService } from '../application/auth-service'
import type { RedirectLogin } from '../application/redirect-token-source'
import type { SessionProvider } from '../application/session-provider'
import { SessionStore } from '../application/session-store'
import type { RenderSignInButton } from '../ui/auth-context'
import { GoogleIdentityClient } from './google-identity-client'
import { GoogleRedirectClient } from './google-redirect-client'
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
  redirectLogin: RedirectLogin
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
  // Derived from the deployed origin and base path, so no env var can drift from the registered redirect URI.
  const redirectUri = new URL('auth/callback', window.location.origin + import.meta.env.BASE_URL).toString()
  const redirectLogin = new GoogleRedirectClient(config.googleClientId, redirectUri)
  const auth = new AuthService(createSessionProvider(config), identity, new SessionStore(), undefined, () => redirectLogin.clear())
  identity.onCredential(async (idToken, nonce) => {
    await auth.signIn(idToken, nonce)
  })
  return { auth, renderSignInButton: createSignInButtonRenderer(identity), redirectLogin }
}
