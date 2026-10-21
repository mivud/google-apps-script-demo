// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import type { Expense } from '../../domain/expense'
import { ExpenseDetailsDialog } from './expense-details-dialog'

setupDomTests()

const expense: Expense = { id: 'a', description: 'Rent', amount: 1000, paymentMethodId: null, spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: true, templateId: 't', paidAt: null, created: '', createdBy: 'a@b.c', lastModified: '', lastModifiedBy: '' }

function renderDialog(overrides: Partial<Expense> = {}, onEdit?: () => void, onClose = () => {}) {
  return renderApp(<ExpenseDetailsDialog expense={{ ...expense, ...overrides }} methods={[]} alert="none" formatAmount={(n) => `${n} VND`} onEdit={onEdit} onClose={onClose} />)
}

describe('ExpenseDetailsDialog', () => {
  it('shows every field including the audit creator', () => {
    renderDialog()
    expect(screen.getByText('Rent')).toBeTruthy()
    expect(screen.getByText('1000 VND')).toBeTruthy()
    expect(screen.getByText('Payment method needed')).toBeTruthy()
    expect(screen.getByText('2026-05')).toBeTruthy()
    expect(screen.getByText('Unpaid')).toBeTruthy()
    expect(screen.getByText('a@b.c')).toBeTruthy()
  })

  it('hides the payment status for a variable expense', () => {
    renderDialog({ isFixed: false, templateId: null })
    expect(screen.queryByText('Unpaid')).toBeNull()
  })

  it('offers Edit only when a handler is given, and Close always', () => {
    const onClose = vi.fn()
    const { unmount } = renderDialog({}, undefined, onClose)
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    const onEdit = vi.fn()
    renderDialog({}, onEdit)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
