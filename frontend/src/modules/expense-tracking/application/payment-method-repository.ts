import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../domain/payment-method'

export interface PaymentMethodRepository {
  list(): Promise<PaymentMethod[]>
  // Fails with 'payment_method_id_taken' or 'payment_method_name_taken' on duplicates.
  create(input: NewPaymentMethod): Promise<PaymentMethod>
  // A stale expectedLastModified fails with ValidationError code 'conflict'.
  update(id: string, patch: Partial<PaymentMethodInput>, expectedLastModified: string): Promise<PaymentMethod>
  // Fails with ValidationError code 'payment_method_in_use' while expenses or templates reference it.
  remove(id: string): Promise<void>
}
