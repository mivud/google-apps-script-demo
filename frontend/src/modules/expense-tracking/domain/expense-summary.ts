import type { Expense } from './expense'

export interface PaymentMethodTotal {
  // null is the visible bucket for amounts without a payment method.
  paymentMethodId: string | null
  total: number
  // Expenses with an amount in this bucket.
  count: number
}

export interface ExpenseSummary {
  total: number
  fixedTotal: number
  variableTotal: number
  byPaymentMethod: PaymentMethodTotal[]
  // Expenses without an amount yet; they are excluded from every total.
  pendingCount: number
  // Expenses without a payment method; their amounts still count, in the null bucket.
  unassignedCount: number
}

// Pure replacement of the sheet summary cells; ordered by total descending, then id, so the cards stay stable.
export function summarizeExpenses(expenses: readonly Expense[]): ExpenseSummary {
  let fixedTotal = 0
  let variableTotal = 0
  let pendingCount = 0
  let unassignedCount = 0
  const perPaymentMethod = new Map<string | null, { total: number; count: number }>()
  for (const expense of expenses) {
    const amount = expense.amount
    if (expense.paymentMethodId === null) unassignedCount += 1
    if (amount === null) {
      pendingCount += 1
      continue
    }
    if (expense.isFixed) fixedTotal += amount
    else variableTotal += amount
    const bucket = perPaymentMethod.get(expense.paymentMethodId) ?? { total: 0, count: 0 }
    perPaymentMethod.set(expense.paymentMethodId, { total: bucket.total + amount, count: bucket.count + 1 })
  }
  const byPaymentMethod = [...perPaymentMethod].map(([paymentMethodId, bucket]) => ({ paymentMethodId, ...bucket }))
  byPaymentMethod.sort((a, b) => b.total - a.total || (a.paymentMethodId ?? '').localeCompare(b.paymentMethodId ?? ''))
  return { total: fixedTotal + variableTotal, fixedTotal, variableTotal, byPaymentMethod, pendingCount, unassignedCount }
}
