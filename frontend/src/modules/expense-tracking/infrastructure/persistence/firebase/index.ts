import { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import type { FirebaseHandle } from '../../../../../shared/firebase/firebase-client'
import type { ExpenseTrackingRepositories } from '../../../application/expense-tracking-repositories'
import { toExpenseTrackingError } from '../expense-tracking-errors'
import { ExpenseFirebaseRepository } from './expense-firebase-repository'
import { FixedExpenseTemplateFirebaseRepository } from './fixed-expense-template-firebase-repository'
import { PaymentMethodFirebaseRepository } from './payment-method-firebase-repository'

export function createExpenseTrackingFirebaseRepositories(handle: FirebaseHandle): ExpenseTrackingRepositories {
  const caller = new FirebaseCaller(handle, toExpenseTrackingError)
  return {
    expenses: new ExpenseFirebaseRepository(caller),
    paymentMethods: new PaymentMethodFirebaseRepository(caller),
    templates: new FixedExpenseTemplateFirebaseRepository(caller),
  }
}
