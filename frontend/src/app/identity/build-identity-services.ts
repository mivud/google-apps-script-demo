import { createAccessPreviewService } from '../../modules/access-control'
import { createClaimService } from '../../modules/claims'
import { createRoleService } from '../../modules/roles'
import { createUserService } from '../../modules/users'
import type { ProviderConfig } from '../../shared/api/provider-config'
import type { AppDeps } from '../app-deps'
import { requireValue } from '../data-service-factory'
import type { IdentityServices } from './identity-services'

// Identity data lives behind identity-api (not the device-management API), so the sheets provider uses its URL.
function buildProviderConfig({ auth, env, supabase }: AppDeps): ProviderConfig {
  if (env.provider === 'sheets') {
    return {
      provider: 'sheets',
      apiUrl: requireValue(env.identityApiUrl, 'VITE_IDENTITY_API_URL'),
      getIdToken: () => auth.getIdToken(),
      // refreshIdToken ends the session itself when no token comes back, so the gate returns to the login page.
      refreshIdToken: () => auth.refreshIdToken(),
    }
  }
  if (!supabase) throw new Error('Supabase client is required for this provider')
  return { provider: 'supabase', client: supabase }
}

export function buildIdentityServices(deps: AppDeps): IdentityServices {
  const config = buildProviderConfig(deps)
  return {
    claims: createClaimService(config),
    roles: createRoleService(config),
    users: createUserService(config),
    access: createAccessPreviewService(config),
  }
}
