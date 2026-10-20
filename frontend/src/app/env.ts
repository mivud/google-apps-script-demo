export const DB_PROVIDERS = ['sheets', 'supabase', 'firebase'] as const
export type DbProvider = (typeof DB_PROVIDERS)[number]

export interface AppEnv {
  provider: DbProvider
  sheetsApiUrl: string
  // Apps Script web app that verifies Google sign-in (auth.session.get); ignored by the supabase provider.
  identityApiUrl: string
  // Apps Script web app of the expense module; ignored by the supabase provider.
  expenseApiUrl: string
  googleClientId: string
  supabaseUrl: string
  supabaseAnonKey: string
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseProjectId: string
  firebaseAppId: string
  firebaseFunctionsRegion: string
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
    identityApiUrl: raw.VITE_IDENTITY_API_URL ?? '',
    expenseApiUrl: raw.VITE_EXPENSE_API_URL ?? '',
    googleClientId: raw.VITE_GOOGLE_CLIENT_ID ?? '',
    supabaseUrl: raw.VITE_SUPABASE_URL ?? '',
    supabaseAnonKey: raw.VITE_SUPABASE_ANON_KEY ?? '',
    firebaseApiKey: raw.VITE_FIREBASE_API_KEY ?? '',
    firebaseAuthDomain: raw.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    firebaseProjectId: raw.VITE_FIREBASE_PROJECT_ID ?? '',
    firebaseAppId: raw.VITE_FIREBASE_APP_ID ?? '',
    firebaseFunctionsRegion: raw.VITE_FIREBASE_FUNCTIONS_REGION ?? '',
  }
}
