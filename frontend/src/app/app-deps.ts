import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirebaseHandle } from '../shared/firebase/firebase-client'
import type { AuthService } from '../modules/access-control'
import type { AppEnv } from './env'

// Built once at startup; each app composes its own services from these, so unopened apps cost nothing.
export interface AppDeps {
  auth: AuthService
  env: AppEnv
  supabase: SupabaseClient | null
  firebase: FirebaseHandle | null
}
