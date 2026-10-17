import type { SupabaseClient } from '@supabase/supabase-js'
import { createAuthService, type AuthConfig, type AuthRuntime } from '../modules/access-control'
import { requireValue } from './data-service-factory'
import type { AppEnv } from './env'

function toAuthConfig(env: AppEnv, supabase: SupabaseClient | null): AuthConfig {
  const googleClientId = requireValue(env.googleClientId, 'VITE_GOOGLE_CLIENT_ID')
  if (env.provider === 'sheets') {
    return { provider: 'sheets', googleClientId, identityApiUrl: requireValue(env.identityApiUrl, 'VITE_IDENTITY_API_URL') }
  }
  if (!supabase) throw new Error('Supabase client is required for this provider')
  return { provider: 'supabase', googleClientId, client: supabase }
}

export function buildAuth(env: AppEnv, supabase: SupabaseClient | null): AuthRuntime {
  return createAuthService(toAuthConfig(env, supabase))
}
