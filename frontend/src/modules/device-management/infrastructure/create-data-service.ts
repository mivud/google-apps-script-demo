import type { SupabaseClient } from '@supabase/supabase-js'
import type { DataService } from '../application/data-service'
import { SheetsAdapter } from './persistence/googlesheet/sheets-adapter'
import { SupabaseAdapter } from './persistence/supabase/supabase-adapter'

export type DataServiceConfig =
  | { provider: 'sheets'; apiUrl: string; getIdToken: () => string | null; refreshIdToken?: () => Promise<string | null> }
  | { provider: 'supabase'; client: SupabaseClient }

// The only place that maps a provider choice to its adapter; the app layer just passes validated config.
export function createDeviceManagementDataService(config: DataServiceConfig): DataService {
  switch (config.provider) {
    case 'sheets':
      return new SheetsAdapter({
        apiUrl: config.apiUrl,
        getIdToken: config.getIdToken,
        refreshIdToken: config.refreshIdToken,
      })
    case 'supabase':
      // Shared client from the composition root: it carries the session the auth module established.
      return new SupabaseAdapter(config.client)
  }
}
