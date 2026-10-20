// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import type { Expense } from '../../domain/expense'
import { PaymentStatusCell } from './payment-status-cell'

setupDomTests()

const base: Expense = { id: 'a', description: 'Rent', amount: 1, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: true, templateId: 't', paidAt: null, created: '', createdBy: '', lastModified: '', lastModifiedBy: '' }

describe('PaymentStatusCell', () => {
  it('shows a dash for a non-fixed expense', () => {
    renderApp(<PaymentStatusCell expense={{ ...base, isFixed: false }} alert="overdue" />)
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.queryByText('Overdue')).toBeNull()
  })

  it('shows Paid even when an alert is passed', () => {
    renderApp(<PaymentStatusCell expense={{ ...base, paidAt: '2026-05-09T00:00:00Z' }} alert="overdue" />)
    expect(screen.getByText('Paid')).toBeTruthy()
  })

  it('shows Unpaid, Due soon and Overdue by alert', () => {
    const { rerender } = renderApp(<PaymentStatusCell expense={base} alert="none" />)
    expect(screen.getByText('Unpaid')).toBeTruthy()
    rerender(<PaymentStatusCell expense={base} alert="due-soon" />)
    expect(screen.getByText('Due soon')).toBeTruthy()
    rerender(<PaymentStatusCell expense={base} alert="overdue" />)
    expect(screen.getByText('Overdue')).toBeTruthy()
  })
})
