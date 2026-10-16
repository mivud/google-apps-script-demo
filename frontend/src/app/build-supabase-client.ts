import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '../shared/supabase/supabase-client'
import { requireValue } from './data-service-factory'
import type { AppEnv } from './env'

// Created once here and handed to auth and data adapters so they share one session explicitly.
export function buildSupabaseClient(env: AppEnv): SupabaseClient | null {
  if (env.provider !== 'supabase') return null
  return createSupabaseClient(
    requireValue(env.supabaseUrl, 'VITE_SUPABASE_URL'),
    requireValue(env.supabaseAnonKey, 'VITE_SUPABASE_ANON_KEY'),
  )
}
