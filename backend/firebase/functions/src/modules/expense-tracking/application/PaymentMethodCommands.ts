import type { RequestContext } from '../../../shared/context/RequestContext';
import { notFound, rule, validation } from '../../../shared/errors/DomainError';
import { assertNotStale } from '../../../shared/validation/OptimisticLock';
import { buildPaymentMethod, parsePaymentMethodId, type StoredPaymentMethod } from '../domain/PaymentMethod';
import type { ExpenseStore, ExpenseTx } from './ExpenseStore';

type Input = Record<string, unknown>;

async function assertNameFree(tx: ExpenseTx, name: string, exceptId: string): Promise<void> {
  const taken = (await tx.paymentMethods.list()).some(
    (m) => m.id !== exceptId && m.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw validation('payment_method_name_taken');
}

export class PaymentMethodCommands {
  constructor(private readonly store: ExpenseStore) {}

  create(request: RequestContext, input: Input): Promise<StoredPaymentMethod> {
    const id = parsePaymentMethodId(input.id);
    const method = buildPaymentMethod(id, null, input);
    return this.store.run(request, async (tx) => {
      if (await tx.paymentMethods.get(id)) throw validation('payment_method_id_taken');
      await assertNameFree(tx, method.name, id);
      return tx.paymentMethods.save(method);
    });
  }

  update(request: RequestContext, input: Input): Promise<StoredPaymentMethod> {
    const id = parsePaymentMethodId(input.id);
    return this.store.run(request, async (tx) => {
      const current = await tx.paymentMethods.get(id);
      if (!current) throw notFound();
      assertNotStale(current.last_modified, input.expected_last_modified);
      const method = buildPaymentMethod(id, current, input);
      await assertNameFree(tx, method.name, id);
      return tx.paymentMethods.save(method);
    });
  }

  remove(request: RequestContext, rawId: unknown): Promise<Record<string, never>> {
    const id = parsePaymentMethodId(rawId);
    return this.store.run(request, async (tx) => {
      if (!(await tx.paymentMethods.get(id))) throw notFound();
      if (await tx.paymentMethods.isReferenced(id)) throw rule('payment_method_in_use');
      tx.paymentMethods.remove(id);
      return {};
    });
  }
}
