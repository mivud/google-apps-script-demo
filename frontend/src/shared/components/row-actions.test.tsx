// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../testing/render-app'
import { RowActions } from './row-actions'

setupDomTests()

describe('RowActions', () => {
  it('names each icon button after the item', () => {
    renderApp(<RowActions itemName="a@b.c" onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getByRole('button', { name: 'Edit: a@b.c' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete: a@b.c' })).toBeTruthy()
  })

  it('calls the matching handler', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderApp(<RowActions itemName="admin" onEdit={onEdit} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit: admin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete: admin' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('shows a View button only when a view handler is given', () => {
    const onView = vi.fn()
    const { rerender } = renderApp(<RowActions itemName="x" onView={onView} />)
    fireEvent.click(screen.getByRole('button', { name: 'View: x' }))
    expect(onView).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull()
    rerender(<RowActions itemName="x" onEdit={() => {}} />)
    expect(screen.queryByRole('button', { name: /^View/ })).toBeNull()
  })

  it('omits Delete for a protected item', () => {
    renderApp(<RowActions itemName="admin" onEdit={() => {}} />)
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull()
  })

  it('disables both buttons while another action is pending', () => {
    renderApp(<RowActions itemName="x" disabled onEdit={() => {}} onDelete={() => {}} />)
    expect((screen.getByRole('button', { name: 'Edit: x' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Delete: x' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
