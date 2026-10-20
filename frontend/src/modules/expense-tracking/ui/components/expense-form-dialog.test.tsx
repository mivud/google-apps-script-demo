// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import type { Expense } from '../../domain/expense'
import type { PaymentMethod } from '../../domain/payment-method'
import { ExpenseFormDialog } from './expense-form-dialog'

setupDomTests()

const methods: PaymentMethod[] = [{ id: 'cash', name: 'Cash', active: true, statementClosingDay: null, color: null, created: '', createdBy: '', lastModified: '', lastModifiedBy: '' }]
const expense: Expense = { id: 'a', description: 'Rent', amount: 1000, paymentMethodId: 'cash', spentOn: '2026-05-10', statementMonth: '2026-05', isFixed: true, templateId: 't', paidAt: null, created: '', createdBy: '', lastModified: '', lastModifiedBy: '' }

function open(initial: Expense | undefined, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  renderApp(<ExpenseFormDialog initial={initial} methods={methods} defaultMonth="2026-05" today="2026-05-10" onSubmit={onSubmit} onClose={() => {}} />)
  return onSubmit
}

describe('ExpenseFormDialog paid checkbox', () => {
  it('is hidden when creating and for a non-fixed expense', () => {
    open(undefined)
    expect(screen.queryByRole('checkbox', { name: 'Paid' })).toBeNull()
  })

  it('is hidden for a non-fixed expense', () => {
    open({ ...expense, isFixed: false, templateId: null })
    expect(screen.queryByRole('checkbox', { name: 'Paid' })).toBeNull()
  })

  it('is shown for a fixed expense, reflects paidAt and is submitted', async () => {
    const onSubmit = open(expense)
    const checkbox = screen.getByRole('checkbox', { name: 'Paid' }) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ description: 'Rent', amount: 1000, paymentMethodId: 'cash' })
    expect(onSubmit.mock.calls[0][1]).toBe(true)
  })

  it('starts checked when the expense is already paid', () => {
    open({ ...expense, paidAt: '2026-05-09T00:00:00Z' })
    expect((screen.getByRole('checkbox', { name: 'Paid' }) as HTMLInputElement).checked).toBe(true)
  })
})
