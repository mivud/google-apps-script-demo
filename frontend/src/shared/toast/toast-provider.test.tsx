// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../testing/render-app'
import { useToast, type ToastTone } from '.'

setupDomTests()

function Trigger({ message, tone }: { message: string; tone: ToastTone }) {
  const toast = useToast()
  return <button type="button" onClick={() => toast.show(message, tone)}>show {message}</button>
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('ToastProvider', () => {
  it('announces a success toast as a status and an error toast as an alert', () => {
    renderApp(<><Trigger message="saved" tone="success" /><Trigger message="broken" tone="error" /></>)
    fireEvent.click(screen.getByText('show saved'))
    fireEvent.click(screen.getByText('show broken'))
    expect(screen.getByRole('status').textContent).toContain('saved')
    expect(screen.getByRole('alert').textContent).toContain('broken')
  })

  it('removes a toast after the display time', () => {
    renderApp(<Trigger message="gone soon" tone="success" />)
    fireEvent.click(screen.getByText('show gone soon'))
    expect(screen.queryByRole('status')).not.toBeNull()
    act(() => { vi.advanceTimersByTime(4000) })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('closes a toast with its dismiss button', () => {
    renderApp(<Trigger message="close me" tone="error" />)
    fireEvent.click(screen.getByText('show close me'))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps at most three toasts, dropping the oldest', () => {
    renderApp(<>{['a', 'b', 'c', 'd'].map((m) => <Trigger key={m} message={m} tone="success" />)}</>)
    for (const m of ['a', 'b', 'c', 'd']) fireEvent.click(screen.getByText(`show ${m}`))
    const shown = screen.getAllByRole('status').map((el) => el.textContent?.replace('×', ''))
    expect(shown).toEqual(['b', 'c', 'd'])
  })
})

describe('useToast', () => {
  it('throws outside a ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Probe() {
      useToast()
      return null
    }
    expect(() => render(<Probe />)).toThrow('useToast must be used inside ToastProvider')
    spy.mockRestore()
  })
})
