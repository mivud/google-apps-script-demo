// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import type { Expense } from '../../domain/expense'
import { DescriptionWithStatus } from './description-with-status'

setupDomTests()

const base: Expense = { id: 'a', description: 'Rent', amount: 1, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: true, templateId: 't', paidAt: null, created: '', createdBy: '', lastModified: '', lastModifiedBy: '' }

describe('DescriptionWithStatus', () => {
  it('shows a green check for a paid expense, even when an alert is passed', () => {
    const { container } = renderApp(<DescriptionWithStatus expense={{ ...base, paidAt: '2026-05-09T00:00:00Z' }} alert="overdue" />)
    expect(container.querySelector('.status-icon-paid')).not.toBeNull()
    expect(screen.getByText('Paid:')).toBeTruthy()
    expect(screen.getByText(/Rent/)).toBeTruthy()
  })

  it('shows a red alert icon for due soon and overdue', () => {
    const { container, rerender } = renderApp(<DescriptionWithStatus expense={base} alert="due-soon" />)
    expect(container.querySelector('.status-icon-unpaid')).not.toBeNull()
    expect(screen.getByText('Due soon:')).toBeTruthy()
    rerender(<DescriptionWithStatus expense={base} alert="overdue" />)
    expect(container.querySelector('.status-icon-unpaid')).not.toBeNull()
    expect(screen.getByText('Overdue:')).toBeTruthy()
  })

  it('shows no icon for a plain unpaid expense but keeps the label', () => {
    const { container } = renderApp(<DescriptionWithStatus expense={base} alert="none" />)
    expect(container.querySelector('.status-icon')).toBeNull()
    expect(screen.getByText('Unpaid:')).toBeTruthy()
  })
})
