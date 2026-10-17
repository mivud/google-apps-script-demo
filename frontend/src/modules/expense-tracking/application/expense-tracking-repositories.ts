import type { ExpenseRepository } from './expense-repository'
import type { FixedExpenseTemplateRepository } from './fixed-expense-template-repository'
import type { PaymentMethodRepository } from './payment-method-repository'

// One repository per aggregate; each provider adapter returns this bundle.
export interface ExpenseTrackingRepositories {
  expenses: ExpenseRepository
  paymentMethods: PaymentMethodRepository
  templates: FixedExpenseTemplateRepository
}
