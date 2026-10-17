import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpenseTrackingRepositories } from '../../../application/expense-tracking-repositories'
import { ExpenseSupabaseRepository } from './expense-supabase-repository'
import { FixedExpenseTemplateSupabaseRepository } from './fixed-expense-template-supabase-repository'
import { PaymentMethodSupabaseRepository } from './payment-method-supabase-repository'

export function createExpenseTrackingSupabaseRepositories(client: SupabaseClient): ExpenseTrackingRepositories {
  return {
    expenses: new ExpenseSupabaseRepository(client),
    paymentMethods: new PaymentMethodSupabaseRepository(client),
    templates: new FixedExpenseTemplateSupabaseRepository(client),
  }
}
