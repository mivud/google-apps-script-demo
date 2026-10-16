import { createDeviceManagementDataService, type DataService, type DataServiceConfig } from '../modules/device-management'
import { ConfigError, type AppEnv, type DbProvider } from './env'

function requireValue(value: string, name: string): string {
  if (!value) throw new ConfigError(`${name} is required for this provider`)
  return value
}

// App code is the only place reading env; the module turns this config into an adapter.
const configs: Record<DbProvider, (env: AppEnv) => DataServiceConfig> = {
  sheets: (env) => ({
    provider: 'sheets',
    apiUrl: requireValue(env.sheetsApiUrl, 'VITE_SHEETS_API_URL'),
    token: requireValue(env.sheetsApiToken, 'VITE_SHEETS_API_TOKEN'),
  }),
  supabase: (env) => ({
    provider: 'supabase',
    url: requireValue(env.supabaseUrl, 'VITE_SUPABASE_URL'),
    anonKey: requireValue(env.supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY'),
  }),
}

export function createDataService(env: AppEnv): DataService {
  return createDeviceManagementDataService(configs[env.provider](env))
}
