import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirebaseHandle } from '../shared/firebase/firebase-client'
import { createDeviceManagementDataService, type DataService } from '../modules/device-management'
import { ConfigError, type AppEnv } from './env'

export interface TokenAccess {
  getIdToken: () => string | null
  refreshIdToken: () => Promise<string | null>
}

export function requireValue(value: string, name: string): string {
  if (!value) throw new ConfigError(`${name} is required for this provider`)
  return value
}

// App code is the only place reading env; the module turns this config into an adapter.
export function createDataService(env: AppEnv, tokens: TokenAccess, supabase: SupabaseClient | null, firebase: FirebaseHandle | null): DataService {
  if (env.provider === 'sheets') {
    return createDeviceManagementDataService({
      provider: 'sheets',
      apiUrl: requireValue(env.sheetsApiUrl, 'VITE_SHEETS_API_URL'),
      getIdToken: tokens.getIdToken,
      refreshIdToken: tokens.refreshIdToken,
    })
  }
  if (env.provider === 'firebase') {
    if (!firebase) throw new Error('Firebase handle is required for this provider')
    return createDeviceManagementDataService({ provider: 'firebase', handle: firebase })
  }
  if (!supabase) throw new Error('Supabase client is required for this provider')
  return createDeviceManagementDataService({ provider: 'supabase', client: supabase })
}
