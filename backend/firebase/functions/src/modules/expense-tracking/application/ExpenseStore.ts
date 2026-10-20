import type { RequestContext } from '../../../shared/context/RequestContext';
import type { Expense, StoredExpense } from '../domain/Expense';
import type { FixedExpenseTemplate, StoredFixedExpenseTemplate } from '../domain/FixedExpenseTemplate';
import type { PaymentMethod, StoredPaymentMethod } from '../domain/PaymentMethod';

// Ports of the expense-tracking aggregates.
export interface PaymentMethodRepository {
  get(id: string): Promise<StoredPaymentMethod | null>;
  list(): Promise<StoredPaymentMethod[]>;
  isReferenced(id: string): Promise<boolean>;
  save(method: PaymentMethod): Promise<StoredPaymentMethod>;
  remove(id: string): void;
}

export interface TemplateRepository {
  get(id: string): Promise<StoredFixedExpenseTemplate | null>;
  listActive(): Promise<StoredFixedExpenseTemplate[]>;
  save(template: FixedExpenseTemplate): Promise<StoredFixedExpenseTemplate>;
  remove(id: string): void;
}

export interface ExpenseRepository {
  get(id: string): Promise<StoredExpense | null>;
  ofTemplate(templateId: string): Promise<StoredExpense[]>;
  save(expense: Expense): Promise<StoredExpense>;
  remove(id: string): void;
}

export interface ExpenseTx {
  paymentMethods: PaymentMethodRepository;
  templates: TemplateRepository;
  expenses: ExpenseRepository;
}

export interface ExpenseStore {
  run<T>(request: RequestContext, work: (tx: ExpenseTx) => Promise<T>): Promise<T>;
}
