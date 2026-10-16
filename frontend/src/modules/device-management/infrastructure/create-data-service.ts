import { createClient } from '@supabase/supabase-js'
import type { DataService } from '../application/data-service'
import { SheetsAdapter } from './persistence/googlesheet/sheets-adapter'
import { SupabaseAdapter } from './persistence/supabase/supabase-adapter'

export type DataServiceConfig =
  | { provider: 'sheets'; apiUrl: string; token: string }
  | { provider: 'supabase'; url: string; anonKey: string }

// The only place that maps a provider choice to its adapter; the app layer just passes validated config.
export function createDeviceManagementDataService(config: DataServiceConfig): DataService {
  switch (config.provider) {
    case 'sheets':
      return new SheetsAdapter({ apiUrl: config.apiUrl, token: config.token })
    case 'supabase':
      return new SupabaseAdapter(createClient(config.url, config.anonKey))
  }
}
