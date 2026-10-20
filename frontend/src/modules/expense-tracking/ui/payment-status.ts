import type { MessageKey } from '../../../shared/i18n/en'
import { isPaid, type Expense, type PaymentAlert } from '../domain/expense'

const ALERT_STATUS = { none: 'unpaid', overdue: 'overdue', 'due-soon': 'dueSoon' } as const

export type PaymentStatusKey = 'paid' | 'unpaid' | 'overdue' | 'dueSoon'

// An alert only exists for unpaid expenses, so paid wins and the alert refines the rest.
export function paymentStatusKey(expense: Pick<Expense, 'paidAt'>, alert: PaymentAlert): PaymentStatusKey {
  return isPaid(expense) ? 'paid' : ALERT_STATUS[alert]
}

export const PAYMENT_STATUS_MESSAGE: Record<PaymentStatusKey, MessageKey> = {
  paid: 'expense.payment.paid',
  unpaid: 'expense.payment.unpaid',
  overdue: 'expense.payment.overdue',
  dueSoon: 'expense.payment.dueSoon',
}
