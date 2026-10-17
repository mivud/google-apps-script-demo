import { ValidationError } from '../../../shared/errors'
import type { FixedExpenseTemplateRepository } from '../application/fixed-expense-template-repository'
import type { FixedExpenseTemplate, FixedExpenseTemplateInput, FixedExpenseTemplatePatch } from '../domain/fixed-expense-template'
import { findOrThrow, type InMemoryExpenseTrackingStore } from './in-memory-store'

// Test double mirroring the backend rules: unknown payment method, total months below added, conflict.
export class InMemoryFixedExpenseTemplateRepository implements FixedExpenseTemplateRepository {
  private readonly store: InMemoryExpenseTrackingStore

  constructor(store: InMemoryExpenseTrackingStore) {
    this.store = store
  }

  async list(): Promise<FixedExpenseTemplate[]> {
    return this.store.templates.map((template) => ({ ...template }))
  }

  async create(input: FixedExpenseTemplateInput): Promise<FixedExpenseTemplate> {
    if (input.paymentMethodId !== null) this.assertMethodExists(input.paymentMethodId)
    const template: FixedExpenseTemplate = { id: this.store.nextId('template'), ...input, monthsAdded: 0, ...this.store.newAudit() }
    this.store.templates.push(template)
    return { ...template }
  }

  async update(id: string, patch: FixedExpenseTemplatePatch, expectedLastModified: string): Promise<FixedExpenseTemplate> {
    const template = findOrThrow(this.store.templates, id)
    if (template.lastModified !== expectedLastModified) throw new ValidationError(undefined, 'conflict')
    if (patch.paymentMethodId) this.assertMethodExists(patch.paymentMethodId)
    if (patch.totalMonths !== undefined && patch.totalMonths !== null && patch.totalMonths < template.monthsAdded) {
      throw new ValidationError(undefined, 'total_months_below_added')
    }
    Object.assign(template, patch)
    this.store.touch(template)
    return { ...template }
  }

  async remove(id: string): Promise<void> {
    const template = findOrThrow(this.store.templates, id)
    this.store.templates.splice(this.store.templates.indexOf(template), 1)
  }

  private assertMethodExists(paymentMethodId: string): void {
    if (!this.store.paymentMethods.some((method) => method.id === paymentMethodId)) {
      throw new ValidationError(undefined, 'payment_method_not_found')
    }
  }
}
