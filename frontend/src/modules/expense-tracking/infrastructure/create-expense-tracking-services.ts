import type { ProviderConfig } from '../../../shared/api/provider-config'
import { SheetsCaller } from '../../../shared/api/sheets-caller'
import type { ExpenseTrackingRepositories } from '../application/expense-tracking-repositories'
import { ExpenseService } from '../application/expense-service'
import { FixedExpenseTemplateService } from '../application/fixed-expense-template-service'
import { PaymentMethodService } from '../application/payment-method-service'
import { toExpenseTrackingError } from './persistence/expense-tracking-errors'
import { ExpenseSheetsRepository } from './persistence/googlesheet/expense-sheets-repository'
import { FixedExpenseTemplateSheetsRepository } from './persistence/googlesheet/fixed-expense-template-sheets-repository'
import { PaymentMethodSheetsRepository } from './persistence/googlesheet/payment-method-sheets-repository'
import { createExpenseTrackingSupabaseRepositories } from './persistence/supabase'

export interface ExpenseTrackingServices {
  expenses: ExpenseService
  paymentMethods: PaymentMethodService
  templates: FixedExpenseTemplateService
}

function createRepositories(config: ProviderConfig): ExpenseTrackingRepositories {
  switch (config.provider) {
    case 'sheets': {
      const caller = new SheetsCaller(config, toExpenseTrackingError)
      return {
        expenses: new ExpenseSheetsRepository(caller),
        paymentMethods: new PaymentMethodSheetsRepository(caller),
        templates: new FixedExpenseTemplateSheetsRepository(caller),
      }
    }
    case 'supabase':
      return createExpenseTrackingSupabaseRepositories(config.client)
  }
}

// The only place that maps a provider choice to its expense-tracking adapters.
export function createExpenseTrackingServices(config: ProviderConfig): ExpenseTrackingServices {
  const repositories = createRepositories(config)
  return {
    expenses: new ExpenseService(repositories.expenses),
    paymentMethods: new PaymentMethodService(repositories.paymentMethods),
    templates: new FixedExpenseTemplateService(repositories.templates),
  }
}
