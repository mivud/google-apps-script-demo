import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../domain/payment-method'
import { validateNewPaymentMethod, validatePaymentMethodPatch } from '../domain/payment-method'
import type { PaymentMethodRepository } from './payment-method-repository'

// The backend owns duplicate-name and in-use checks (payment_method_id_taken, payment_method_name_taken, payment_method_in_use).
export class PaymentMethodService {
  private readonly repository: PaymentMethodRepository

  constructor(repository: PaymentMethodRepository) {
    this.repository = repository
  }

  list(): Promise<PaymentMethod[]> {
    return this.repository.list()
  }

  async create(input: NewPaymentMethod): Promise<PaymentMethod> {
    return this.repository.create(validateNewPaymentMethod(input))
  }

  async update(id: string, patch: Partial<PaymentMethodInput>, expectedLastModified: string): Promise<PaymentMethod> {
    return this.repository.update(id, validatePaymentMethodPatch(patch), expectedLastModified)
  }

  remove(id: string): Promise<void> {
    return this.repository.remove(id)
  }
}
