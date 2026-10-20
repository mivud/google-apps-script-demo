import type { SupabaseClient } from '@supabase/supabase-js'
import type { FirebaseHandle } from '../firebase/firebase-client'

// What a module factory needs to reach its data; the composition root builds it once from the validated env.
export type ProviderConfig =
  | { provider: 'sheets'; apiUrl: string; getIdToken: () => string | null; refreshIdToken?: () => Promise<string | null> }
  | { provider: 'supabase'; client: SupabaseClient }
  | { provider: 'firebase'; handle: FirebaseHandle }
