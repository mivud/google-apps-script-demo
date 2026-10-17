import type { ExpenseTrackingRepositories } from '../application/expense-tracking-repositories'
import { InMemoryExpenseRepository } from './in-memory-expense-repository'
import { InMemoryFixedExpenseTemplateRepository } from './in-memory-fixed-expense-template-repository'
import { InMemoryPaymentMethodRepository } from './in-memory-payment-method-repository'
import { InMemoryExpenseTrackingStore } from './in-memory-store'

export function createInMemoryRepositories(store = new InMemoryExpenseTrackingStore()): ExpenseTrackingRepositories & { store: InMemoryExpenseTrackingStore } {
  return {
    store,
    expenses: new InMemoryExpenseRepository(store),
    paymentMethods: new InMemoryPaymentMethodRepository(store),
    templates: new InMemoryFixedExpenseTemplateRepository(store),
  }
}
