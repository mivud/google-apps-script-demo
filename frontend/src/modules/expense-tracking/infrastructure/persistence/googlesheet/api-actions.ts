// Apps Script action names, namespaced as <module>.<entity>.<action>.
export const EXPENSE_ACTIONS = {
  list: 'expense-tracking.expense.list',
  create: 'expense-tracking.expense.create',
  update: 'expense-tracking.expense.update',
  remove: 'expense-tracking.expense.delete',
  generateFixed: 'expense-tracking.expense.generateFixed',
} as const

export const PAYMENT_METHOD_ACTIONS = {
  list: 'expense-tracking.paymentMethod.list',
  create: 'expense-tracking.paymentMethod.create',
  update: 'expense-tracking.paymentMethod.update',
  remove: 'expense-tracking.paymentMethod.delete',
} as const

export const FIXED_TEMPLATE_ACTIONS = {
  list: 'expense-tracking.fixedTemplate.list',
  create: 'expense-tracking.fixedTemplate.create',
  update: 'expense-tracking.fixedTemplate.update',
  remove: 'expense-tracking.fixedTemplate.delete',
} as const
