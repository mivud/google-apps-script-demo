import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// The composition root creates one client and passes it to auth and data adapters, which then share its session.
// persistSession is off so tokens stay in memory and never reach web storage.
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false, detectSessionInUrl: false } })
}
