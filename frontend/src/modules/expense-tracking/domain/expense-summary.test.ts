import { describe, expect, it } from 'vitest'
import type { Expense } from './expense'
import { summarizeExpenses } from './expense-summary'

const make = (over: Partial<Expense>): Expense => ({ id: 'x', description: 'd', amount: 100, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: false, templateId: null, created: '', createdBy: '', lastModified: '', lastModifiedBy: '', ...over })

describe('summarizeExpenses', () => {
  it('returns zeros for no expenses', () => {
    expect(summarizeExpenses([])).toEqual({ total: 0, fixedTotal: 0, variableTotal: 0, byPaymentMethod: [], pendingCount: 0, unassignedCount: 0 })
  })

  it('splits fixed and variable totals', () => {
    const summary = summarizeExpenses([make({ amount: 100, isFixed: true }), make({ amount: 40 }), make({ amount: 60 })])
    expect(summary).toMatchObject({ total: 200, fixedTotal: 100, variableTotal: 100 })
  })

  it('excludes pending amounts but counts them', () => {
    const summary = summarizeExpenses([make({ amount: null }), make({ amount: 10 })])
    expect(summary).toMatchObject({ total: 10, pendingCount: 1 })
    expect(summary.byPaymentMethod).toEqual([{ paymentMethodId: 'cash', total: 10, count: 1 }])
  })

  it('keeps unassigned amounts in the null bucket', () => {
    const summary = summarizeExpenses([make({ paymentMethodId: null, amount: 70 }), make({ paymentMethodId: null, amount: null })])
    expect(summary.unassignedCount).toBe(2)
    expect(summary.byPaymentMethod).toEqual([{ paymentMethodId: null, total: 70, count: 1 }])
  })

  it('orders buckets by total descending, then id', () => {
    const summary = summarizeExpenses([make({ paymentMethodId: 'b', amount: 5 }), make({ paymentMethodId: 'a', amount: 5 }), make({ paymentMethodId: 'c', amount: 9 })])
    expect(summary.byPaymentMethod.map((bucket) => bucket.paymentMethodId)).toEqual(['c', 'a', 'b'])
  })
})
