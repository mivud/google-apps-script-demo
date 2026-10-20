// Callable API action names, namespaced as <module>.<entity>.<action>.
export const EXPENSE_ACTIONS = {
  create: 'expense-tracking.expense.create',
  update: 'expense-tracking.expense.update',
  remove: 'expense-tracking.expense.delete',
  generateFixed: 'expense-tracking.expense.generate-fixed',
  markPaid: 'expense-tracking.expense.markPaid',
  markUnpaid: 'expense-tracking.expense.markUnpaid',
} as const

export const PAYMENT_METHOD_ACTIONS = {
  create: 'expense-tracking.paymentMethod.create',
  update: 'expense-tracking.paymentMethod.update',
  remove: 'expense-tracking.paymentMethod.delete',
} as const

export const FIXED_TEMPLATE_ACTIONS = {
  create: 'expense-tracking.fixedTemplate.create',
  update: 'expense-tracking.fixedTemplate.update',
  remove: 'expense-tracking.fixedTemplate.delete',
} as const

// Firestore collections share the Postgres table names.
export const EXPENSE_COLLECTIONS = {
  expenses: 'expenses',
  paymentMethods: 'payment_methods',
  templates: 'fixed_expense_templates',
} as const
