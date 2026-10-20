// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../../../../shared/testing/render-app'
import { PendingField } from './pending-field'

setupDomTests()

describe('PendingField', () => {
  it('gives writers a button with only the label', () => {
    const onFill = vi.fn()
    renderApp(<PendingField label="Amount needed" canWrite onFill={onFill} />)
    const button = screen.getByRole('button', { name: 'Amount needed' })
    expect(button.textContent).toBe('Amount needed')
    fireEvent.click(button)
    expect(onFill).toHaveBeenCalledOnce()
  })

  it('gives read-only users a plain badge without a dash', () => {
    const { container } = renderApp(<PendingField label="Amount needed" canWrite={false} onFill={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toBe('Amount needed')
    expect(container.textContent).not.toContain('—')
  })
})
