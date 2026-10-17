import { ValidationError } from '../../../shared/errors'
import type { PaymentMethodRepository } from '../application/payment-method-repository'
import type { NewPaymentMethod, PaymentMethod, PaymentMethodInput } from '../domain/payment-method'
import { findOrThrow, type InMemoryExpenseTrackingStore } from './in-memory-store'

// Test double mirroring the backend rules: duplicate names, in use, conflict.
export class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private readonly store: InMemoryExpenseTrackingStore

  constructor(store: InMemoryExpenseTrackingStore) {
    this.store = store
  }

  async list(): Promise<PaymentMethod[]> {
    return this.store.paymentMethods.map((method) => ({ ...method }))
  }

  async create(input: NewPaymentMethod): Promise<PaymentMethod> {
    if (this.store.paymentMethods.some((method) => method.id === input.id)) throw new ValidationError(undefined, 'payment_method_id_taken')
    this.assertNameFree(input.name)
    const method: PaymentMethod = { ...input, ...this.store.newAudit() }
    this.store.paymentMethods.push(method)
    return { ...method }
  }

  async update(id: string, patch: Partial<PaymentMethodInput>, expectedLastModified: string): Promise<PaymentMethod> {
    const method = findOrThrow(this.store.paymentMethods, id)
    if (method.lastModified !== expectedLastModified) throw new ValidationError(undefined, 'conflict')
    if (patch.name !== undefined && patch.name.toLowerCase() !== method.name.toLowerCase()) this.assertNameFree(patch.name)
    Object.assign(method, patch)
    this.store.touch(method)
    return { ...method }
  }

  async remove(id: string): Promise<void> {
    const method = findOrThrow(this.store.paymentMethods, id)
    const inUse = this.store.expenses.some((e) => e.paymentMethodId === id) || this.store.templates.some((t) => t.paymentMethodId === id)
    if (inUse) throw new ValidationError(undefined, 'payment_method_in_use')
    this.store.paymentMethods.splice(this.store.paymentMethods.indexOf(method), 1)
  }

  private assertNameFree(name: string): void {
    if (this.store.paymentMethods.some((method) => method.name.toLowerCase() === name.toLowerCase())) {
      throw new ValidationError(undefined, 'payment_method_name_taken')
    }
  }
}
