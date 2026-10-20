import type { Firestore } from 'firebase-admin/firestore';
import { IDENTITY_AUDIT, type IdentityAudit } from '../../../../shared/audit/AuditStyle';
import type { RequestContext } from '../../../../shared/context/RequestContext';
import { AuditedCollection } from '../../../../shared/persistence/firestore/AuditedCollection';
import { runInTransaction, type TxContext } from '../../../../shared/persistence/firestore/TxContext';
import type {
  ExpenseRepository, ExpenseStore, ExpenseTx, PaymentMethodRepository, TemplateRepository,
} from '../../application/ExpenseStore';
import type { Expense } from '../../domain/Expense';
import type { FixedExpenseTemplate } from '../../domain/FixedExpenseTemplate';
import type { PaymentMethod } from '../../domain/PaymentMethod';

export const ExpenseCollections = {
  paymentMethods: 'payment_methods',
  templates: 'fixed_expense_templates',
  expenses: 'expenses',
} as const;

const collection = <T extends { id: string }>(ctx: TxContext, name: string) =>
  new AuditedCollection<T, IdentityAudit>(ctx, name, IDENTITY_AUDIT, (row) => row.id);

function paymentMethodRepository(ctx: TxContext): PaymentMethodRepository {
  const methods = collection<PaymentMethod>(ctx, ExpenseCollections.paymentMethods);
  const templates = collection<FixedExpenseTemplate>(ctx, ExpenseCollections.templates);
  const expenses = collection<Expense>(ctx, ExpenseCollections.expenses);
  return {
    get: (id) => methods.get(id),
    list: () => methods.find(),
    isReferenced: async (id) =>
      (await expenses.find([['payment_method_id', id]], 1)).length
        + (await templates.find([['payment_method_id', id]], 1)).length > 0,
    save: (method) => methods.save(method),
    remove: (id) => methods.remove(id),
  };
}

function templateRepository(ctx: TxContext): TemplateRepository {
  const templates = collection<FixedExpenseTemplate>(ctx, ExpenseCollections.templates);
  return {
    get: (id) => templates.get(id),
    listActive: () => templates.find([['active', true]]),
    save: (template) => templates.save(template),
    remove: (id) => templates.remove(id),
  };
}

function expenseRepository(ctx: TxContext): ExpenseRepository {
  const expenses = collection<Expense>(ctx, ExpenseCollections.expenses);
  return {
    get: (id) => expenses.get(id),
    ofTemplate: (templateId) => expenses.find([['template_id', templateId]]),
    save: (expense) => expenses.save(expense),
    remove: (id) => expenses.remove(id),
  };
}

export class FirestoreExpenseStore implements ExpenseStore {
  constructor(private readonly db: Firestore) {}

  run<T>(request: RequestContext, work: (tx: ExpenseTx) => Promise<T>): Promise<T> {
    return runInTransaction(this.db, request, (ctx) => work({
      paymentMethods: paymentMethodRepository(ctx),
      templates: templateRepository(ctx),
      expenses: expenseRepository(ctx),
    }));
  }
}
