import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { assertNotStale } from '../../../shared/validation/OptimisticLock';
import { parseUuid } from '../../../shared/validation/Values';
import { assertExpenseInvariants, buildExpenseDraft, type Expense, type StoredExpense } from '../domain/Expense';
import { resolveStatementMonth } from '../domain/StatementMonth';
import type { ExpenseStore, ExpenseTx } from './ExpenseStore';
import { assertPaymentMethodExists } from './TemplateCommands';

type Input = Record<string, unknown>;

const knownId = (value: unknown): string => {
  try {
    return parseUuid(value, 'not_found');
  } catch {
    throw notFound();
  }
};

async function requireExpense(tx: ExpenseTx, rawId: unknown): Promise<StoredExpense> {
  const expense = await tx.expenses.get(knownId(rawId));
  if (!expense) throw notFound();
  return expense;
}

export class ExpenseCommands {
  constructor(private readonly store: ExpenseStore, private readonly ids: IdGenerator) {}

  create(request: RequestContext, input: Input): Promise<StoredExpense> {
    const draft = buildExpenseDraft(null, input);
    return this.store.run(request, async (tx) => {
      await assertPaymentMethodExists(tx, draft.paymentMethodId);
      const closingDay = draft.paymentMethodId
        ? (await tx.paymentMethods.get(draft.paymentMethodId))?.statement_closing_day ?? null
        : null;
      const expense: Expense = {
        id: this.ids.next(),
        description: draft.description,
        amount: draft.amount,
        payment_method_id: draft.paymentMethodId,
        spent_on: draft.spentOn,
        statement_month: draft.statementMonth ?? resolveStatementMonth(draft.spentOn, closingDay),
        is_fixed: draft.isFixed,
        template_id: null,
        paid_at: null,
      };
      assertExpenseInvariants(expense, null);
      return tx.expenses.save(expense);
    });
  }

  // Updates never recompute statement_month unless the patch carries one.
  update(request: RequestContext, input: Input): Promise<StoredExpense> {
    return this.store.run(request, async (tx) => {
      const current = await requireExpense(tx, input.id);
      assertNotStale(current.last_modified, input.expected_last_modified);
      const draft = buildExpenseDraft(current, input);
      await assertPaymentMethodExists(tx, draft.paymentMethodId);
      const expense: Expense = {
        ...current,
        description: draft.description,
        amount: draft.amount,
        payment_method_id: draft.paymentMethodId,
        spent_on: draft.spentOn,
        statement_month: draft.statementMonth ?? current.statement_month,
        is_fixed: draft.isFixed,
      };
      assertExpenseInvariants(expense, current);
      return tx.expenses.save(expense);
    });
  }

  remove(request: RequestContext, rawId: unknown): Promise<Record<string, never>> {
    return this.store.run(request, async (tx) => {
      tx.expenses.remove((await requireExpense(tx, rawId)).id);
      return {};
    });
  }

  // Paid time is server-owned: set to now, or cleared. Only fixed expenses can be paid.
  setPaid(request: RequestContext, rawId: unknown, paid: boolean): Promise<StoredExpense> {
    return this.store.run(request, async (tx) => {
      const current = await requireExpense(tx, rawId);
      const expense: Expense = { ...current, paid_at: paid ? request.nowIso : null };
      assertExpenseInvariants(expense, current);
      return tx.expenses.save(expense);
    });
  }
}
