import type { FirebaseCaller } from '../../../../../shared/api/firebase-caller'
import { ascending, sortRows } from '../../../../../shared/api/firebase-row-order'
import type { PaymentMethodRepository } from '../../../application/payment-method-repository'
import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../../../domain/payment-method'
import { paymentMethodPatchToRow, rowToPaymentMethod, type PaymentMethodRow } from '../payment-method-rows'
import { EXPENSE_COLLECTIONS, PAYMENT_METHOD_ACTIONS } from './firebase-api-actions'

export class PaymentMethodFirebaseRepository implements PaymentMethodRepository {
  private readonly caller: FirebaseCaller

  constructor(caller: FirebaseCaller) {
    this.caller = caller
  }

  async list(): Promise<PaymentMethod[]> {
    const rows = await this.caller.rows(EXPENSE_COLLECTIONS.paymentMethods)
    return sortRows(rows, ascending('name'), ascending('id')).map((row) => rowToPaymentMethod(row as unknown as PaymentMethodRow))
  }

  async create(input: NewPaymentMethod): Promise<PaymentMethod> {
    return rowToPaymentMethod(await this.caller.call<PaymentMethodRow>(PAYMENT_METHOD_ACTIONS.create, { id: input.id, ...paymentMethodPatchToRow(input) }))
  }

  async update(id: string, patch: Partial<PaymentMethodInput>, expectedLastModified: string): Promise<PaymentMethod> {
    const payload = { id, ...paymentMethodPatchToRow(patch), expected_last_modified: expectedLastModified }
    return rowToPaymentMethod(await this.caller.call<PaymentMethodRow>(PAYMENT_METHOD_ACTIONS.update, payload))
  }

  async remove(id: string): Promise<void> {
    await this.caller.call<unknown>(PAYMENT_METHOD_ACTIONS.remove, { id })
  }
}
