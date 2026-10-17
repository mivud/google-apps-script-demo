import type { SheetsCaller } from '../../../../../shared/api/sheets-caller'
import type { PaymentMethodRepository } from '../../../application/payment-method-repository'
import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../../../domain/payment-method'
import { paymentMethodPatchToRow, rowsToPaymentMethods, rowToPaymentMethod, type PaymentMethodRow } from '../payment-method-rows'
import { PAYMENT_METHOD_ACTIONS } from './api-actions'

export class PaymentMethodSheetsRepository implements PaymentMethodRepository {
  private readonly caller: SheetsCaller

  constructor(caller: SheetsCaller) {
    this.caller = caller
  }

  async list(): Promise<PaymentMethod[]> {
    return rowsToPaymentMethods(await this.caller.call<{ items: unknown }>(PAYMENT_METHOD_ACTIONS.list, {}))
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
