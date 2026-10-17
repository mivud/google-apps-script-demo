// Routes of the expense app live here so pages never build URLs by hand.
export const EXPENSE_BASE = '/expense'
export const EXPENSE_METHODS_PATH = `${EXPENSE_BASE}/payment-methods`
export const EXPENSE_TEMPLATES_PATH = `${EXPENSE_BASE}/fixed-expenses`

export type ExpenseSection = 'month' | 'methods' | 'templates'

// Unknown paths fall back to the month list.
export function parseExpenseSection(path: string): ExpenseSection {
  const trimmed = path.replace(/\/+$/, '')
  if (trimmed === EXPENSE_METHODS_PATH) return 'methods'
  if (trimmed === EXPENSE_TEMPLATES_PATH) return 'templates'
  return 'month'
}
