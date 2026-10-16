export const DB_PROVIDERS = ['sheets', 'supabase'] as const
export type DbProvider = (typeof DB_PROVIDERS)[number]

export interface AppEnv {
  provider: DbProvider
  sheetsApiUrl: string
  sheetsApiToken: string
  supabaseUrl: string
  supabaseAnonKey: string
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

// Takes the raw env as a parameter so parsing stays testable and independent of Vite globals.
export function readEnv(raw: Record<string, string | undefined>): AppEnv {
  const provider = raw.VITE_DB_PROVIDER
  if (!provider || !(DB_PROVIDERS as readonly string[]).includes(provider)) {
    throw new ConfigError(`VITE_DB_PROVIDER must be one of: ${DB_PROVIDERS.join(', ')}`)
  }
  return {
    provider: provider as DbProvider,
    sheetsApiUrl: raw.VITE_SHEETS_API_URL ?? '',
    sheetsApiToken: raw.VITE_SHEETS_API_TOKEN ?? '',
    supabaseUrl: raw.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: raw.VITE_SUPABASE_ANON_KEY ?? '',
  }
}
