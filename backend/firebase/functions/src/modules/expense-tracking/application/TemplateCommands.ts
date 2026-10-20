import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound, rule, validation } from '../../../shared/errors/DomainError';
import type { IdGenerator } from '../../../shared/id/IdGenerator';
import { assertNotStale } from '../../../shared/validation/OptimisticLock';
import { buildTemplate, type StoredFixedExpenseTemplate } from '../domain/FixedExpenseTemplate';
import { parseUuid } from '../../../shared/validation/Values';
import type { ExpenseStore, ExpenseTx } from './ExpenseStore';

type Input = Record<string, unknown>;

export async function assertPaymentMethodExists(tx: ExpenseTx, id: string | null): Promise<void> {
  if (id === null) return;
  // Shape check first: the id is a Firestore document id and must never contain a path separator.
  const wellFormed = /^[a-z0-9_-]{1,40}$/.test(id);
  if (!wellFormed || !(await tx.paymentMethods.get(id))) throw validation('payment_method_not_found');
}

const knownId = (value: unknown): string => {
  try {
    return parseUuid(value, 'not_found');
  } catch {
    throw notFound();
  }
};

export class TemplateCommands {
  constructor(private readonly store: ExpenseStore, private readonly ids: IdGenerator) {}

  create(request: RequestContext, input: Input): Promise<StoredFixedExpenseTemplate> {
    const template = buildTemplate(this.ids.next(), null, input);
    return this.store.run(request, async (tx) => {
      await assertPaymentMethodExists(tx, template.payment_method_id);
      return tx.templates.save(template);
    });
  }

  update(request: RequestContext, input: Input): Promise<StoredFixedExpenseTemplate> {
    return this.store.run(request, async (tx) => {
      const current = await tx.templates.get(knownId(input.id));
      if (!current) throw notFound();
      assertNotStale(current.last_modified, input.expected_last_modified);
      const template = buildTemplate(current.id, current, input);
      await assertPaymentMethodExists(tx, template.payment_method_id);
      return tx.templates.save(template);
    });
  }

  // Mirrors ON DELETE SET NULL for generated expenses, unless that would leave a pending row without its template.
  remove(request: RequestContext, rawId: unknown): Promise<Record<string, never>> {
    return this.store.run(request, async (tx) => {
      const current = await tx.templates.get(knownId(rawId));
      if (!current) throw notFound();
      const generated = await tx.expenses.ofTemplate(current.id);
      if (generated.some((e) => e.amount === null || e.payment_method_id === null)) {
        throw rule('template_has_pending_expenses');
      }
      for (const expense of generated) await tx.expenses.save({ ...expense, template_id: null });
      tx.templates.remove(current.id);
      return {};
    });
  }
}
