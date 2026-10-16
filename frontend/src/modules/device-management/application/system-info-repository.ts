export interface SystemInfoRepository {
  // Version of the backend behind the provider, or null when the provider has none (e.g. Supabase).
  getBackendVersion(): Promise<string | null>
}
