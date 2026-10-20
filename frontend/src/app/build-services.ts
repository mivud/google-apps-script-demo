import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirebaseHandle } from '../shared/firebase/firebase-client'
import { CategoryService, EquipmentService, MaintenanceService, type Services } from '../modules/device-management'
import type { AuthService } from '../modules/access-control'
import { createDataService } from './data-service-factory'
import type { AppEnv } from './env'

// Call once at startup together with buildAuth; the data adapters read the ID token from the auth service.
export function buildServices(auth: AuthService, env: AppEnv, supabase: SupabaseClient | null, firebase: FirebaseHandle | null): Services {
  const tokens = {
    getIdToken: () => auth.getIdToken(),
    // refreshIdToken ends the session itself when no token comes back, so the gate returns to the login page.
    refreshIdToken: () => auth.refreshIdToken(),
  }
  const dataService = createDataService(env, tokens, supabase, firebase)
  const categories = new CategoryService(dataService)
  return {
    equipment: new EquipmentService(dataService, categories),
    maintenance: new MaintenanceService(dataService),
    categories,
    systemInfo: dataService,
  }
}
