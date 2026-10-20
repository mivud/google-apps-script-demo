import { Permission } from '../../../shared/auth/Access';
import type { ActionDefinition } from '../../../shared/dispatch/ActionRouter';
import type { ExpenseCommands } from '../application/ExpenseCommands';
import type { GenerateFixedExpenses } from '../application/GenerateFixedExpenses';
import type { PaymentMethodCommands } from '../application/PaymentMethodCommands';
import type { TemplateCommands } from '../application/TemplateCommands';

export interface ExpenseEndpointDeps {
  expenses: ExpenseCommands;
  paymentMethods: PaymentMethodCommands;
  templates: TemplateCommands;
  generateFixed: GenerateFixedExpenses;
}

const write = Permission.ExpenseWrite;

// Same action names and payloads as the Apps Script expense API; lists are read directly from Firestore.
export function expenseActions(deps: ExpenseEndpointDeps): ActionDefinition[] {
  const { expenses, paymentMethods, templates, generateFixed } = deps;
  return [
    { action: 'expense-tracking.expense.create', permission: write,
      handler: (c) => expenses.create(c.request, c.payload.data) },
    { action: 'expense-tracking.expense.update', permission: write,
      handler: (c) => expenses.update(c.request, c.payload.data) },
    { action: 'expense-tracking.expense.delete', permission: write,
      handler: (c) => expenses.remove(c.request, c.payload.raw('id')) },
    { action: 'expense-tracking.expense.markPaid', permission: write,
      handler: (c) => expenses.setPaid(c.request, c.payload.raw('id'), true) },
    { action: 'expense-tracking.expense.markUnpaid', permission: write,
      handler: (c) => expenses.setPaid(c.request, c.payload.raw('id'), false) },
    { action: 'expense-tracking.expense.generate-fixed', permission: write,
      handler: (c) => generateFixed.execute(c.request, c.payload.raw('statement_month')) },

    { action: 'expense-tracking.paymentMethod.create', permission: write,
      handler: (c) => paymentMethods.create(c.request, c.payload.data) },
    { action: 'expense-tracking.paymentMethod.update', permission: write,
      handler: (c) => paymentMethods.update(c.request, c.payload.data) },
    { action: 'expense-tracking.paymentMethod.delete', permission: write,
      handler: (c) => paymentMethods.remove(c.request, c.payload.raw('id')) },

    { action: 'expense-tracking.fixedTemplate.create', permission: write,
      handler: (c) => templates.create(c.request, c.payload.data) },
    { action: 'expense-tracking.fixedTemplate.update', permission: write,
      handler: (c) => templates.update(c.request, c.payload.data) },
    { action: 'expense-tracking.fixedTemplate.delete', permission: write,
      handler: (c) => templates.remove(c.request, c.payload.raw('id')) },
  ];
}
