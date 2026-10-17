import type { Audit } from '../../../shared/audit'
import { NotFoundError } from '../../../shared/errors'
import type { Expense } from '../domain/expense'
import type { FixedExpenseTemplate } from '../domain/fixed-expense-template'
import type { PaymentMethod } from '../domain/payment-method'

// Shared state of the in-memory repositories so cross-aggregate rules (payment method in use, generate) can be mirrored.
export class InMemoryExpenseTrackingStore {
  readonly expenses: Expense[] = []
  readonly paymentMethods: PaymentMethod[] = []
  readonly templates: FixedExpenseTemplate[] = []
  private counter = 0
  private clock = 0

  nextId(prefix: string): string {
    return `${prefix}-${++this.counter}`
  }

  // Monotonic fake timestamps so every write changes last_modified.
  nextStamp(): string {
    return `2026-01-01T00:00:${String(++this.clock).padStart(2, '0')}.000+00:00`
  }

  newAudit(): Audit {
    const stamp = this.nextStamp()
    return { created: stamp, createdBy: 'test', lastModified: stamp, lastModifiedBy: 'test' }
  }

  touch(target: Audit): void {
    target.lastModified = this.nextStamp()
    target.lastModifiedBy = 'test'
  }
}

export function findOrThrow<T extends { id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id)
  if (!found) throw new NotFoundError()
  return found
}
