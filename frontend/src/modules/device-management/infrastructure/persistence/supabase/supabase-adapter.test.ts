import { createClient } from '@supabase/supabase-js'
import { describe } from 'vitest'
import { runDataServiceContract } from '../contract/data-service.contract'
import { SupabaseAdapter } from './supabase-adapter'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hits a real project, so it only runs when credentials are provided explicitly.
if (url && anonKey) {
  runDataServiceContract('SupabaseAdapter', () => new SupabaseAdapter(createClient(url, anonKey)))
} else {
  describe.skip('DataService contract: SupabaseAdapter (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)', () => {})
}
