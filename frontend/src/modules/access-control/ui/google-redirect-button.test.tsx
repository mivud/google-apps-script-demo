// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp, setupDomTests } from '../../../shared/testing/render-app'
import type { RedirectLogin } from '../application/redirect-token-source'
import { RedirectLoginContext } from './auth-context'
import { GoogleRedirectButton } from './google-redirect-button'

setupDomTests()

function renderButton(begin: RedirectLogin['begin'], emphasized = false) {
  const redirectLogin: RedirectLogin = { begin, consumeCallback: () => ({ status: 'none' }), clear: () => undefined }
  return renderApp(
    <RedirectLoginContext.Provider value={redirectLogin}>
      <GoogleRedirectButton emphasized={emphasized} />
    </RedirectLoginContext.Provider>,
  )
}

const button = () => screen.getByRole('button') as HTMLButtonElement

describe('GoogleRedirectButton', () => {
  it('is visible and calls begin() on click', () => {
    const begin = vi.fn().mockResolvedValue(undefined)
    renderButton(begin)
    fireEvent.click(button())
    expect(begin).toHaveBeenCalledOnce()
  })

  it('is disabled while the redirect starts', async () => {
    let finish: () => void = () => undefined
    renderButton(() => new Promise<void>((resolve) => (finish = resolve)))
    fireEvent.click(button())
    await waitFor(() => expect(button().disabled).toBe(true))
    finish()
    await waitFor(() => expect(button().disabled).toBe(false))
  })

  it('shows a generic error when begin() fails', async () => {
    renderButton(() => Promise.reject(new Error('no storage')))
    fireEvent.click(button())
    expect(await screen.findByText(/could not be completed/i)).toBeTruthy()
  })

  it('shows the hint when emphasized', () => {
    renderButton(() => Promise.resolve(), true)
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
