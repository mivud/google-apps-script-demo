import { createExpenseTrackingServices, type ExpenseTrackingServices } from '../../modules/expense-tracking'
import type { ProviderConfig } from '../../shared/api/provider-config'
import type { AppDeps } from '../app-deps'
import { requireValue } from '../data-service-factory'

// Expense data lives behind its own Apps Script web app, so the sheets provider uses VITE_EXPENSE_API_URL.
function buildProviderConfig({ auth, env, supabase }: AppDeps): ProviderConfig {
  if (env.provider === 'sheets') {
    return {
      provider: 'sheets',
      apiUrl: requireValue(env.expenseApiUrl, 'VITE_EXPENSE_API_URL'),
      getIdToken: () => auth.getIdToken(),
      // refreshIdToken ends the session itself when no token comes back, so the gate returns to the login page.
      refreshIdToken: () => auth.refreshIdToken(),
    }
  }
  if (!supabase) throw new Error('Supabase client is required for this provider')
  return { provider: 'supabase', client: supabase }
}

export function buildExpenseServices(deps: AppDeps): ExpenseTrackingServices {
  return createExpenseTrackingServices(buildProviderConfig(deps))
}
