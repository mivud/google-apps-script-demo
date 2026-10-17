// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleRedirectClient } from './google-redirect-client'
import { PENDING_TTL_MS, savePending } from './redirect-pending-store'

const location = (hash: string) => ({ hash, pathname: '/app/auth/callback' })

function client(navigate = vi.fn()) {
  return new GoogleRedirectClient('cid', 'https://x.test/app/auth/callback', navigate)
}

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('GoogleRedirectClient.consumeCallback', () => {
  it('returns the token and the raw nonce when state matches', () => {
    savePending('st', 'raw')
    const history = { replaceState: vi.fn() }
    expect(client().consumeCallback(location('#id_token=tok&state=st'), history)).toEqual({ status: 'ok', idToken: 'tok', nonce: 'raw' })
  })

  it('strips the fragment before reading anything', () => {
    const history = { replaceState: vi.fn() }
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      expect(history.replaceState).toHaveBeenCalledWith(null, '', '/app/auth/callback')
      return null
    })
    client().consumeCallback(location('#id_token=tok&state=st'), history)
    expect(getItem).toHaveBeenCalled()
  })

  it('reports a state mismatch and consumes the pending entry', () => {
    savePending('st', 'raw')
    const history = { replaceState: vi.fn() }
    expect(client().consumeCallback(location('#id_token=t&state=other'), history)).toEqual({ status: 'error', code: 'state_mismatch' })
    expect(client().consumeCallback(location('#id_token=t&state=st'), history)).toEqual({ status: 'error', code: 'state_mismatch' })
  })

  it('reports an expired attempt', () => {
    vi.useFakeTimers()
    savePending('st', 'raw')
    vi.advanceTimersByTime(PENDING_TTL_MS + 1)
    expect(client().consumeCallback(location('#id_token=t&state=st'), { replaceState: vi.fn() })).toEqual({ status: 'error', code: 'expired' })
  })

  it('maps a Google error to a generic provider_error', () => {
    expect(client().consumeCallback(location('#error=access_denied'), { replaceState: vi.fn() })).toEqual({ status: 'error', code: 'provider_error' })
  })

  it('does nothing without a fragment and never writes localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(client().consumeCallback(location(''), { replaceState: vi.fn() })).toEqual({ status: 'none' })
    expect(setItem).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
  })
})

describe('GoogleRedirectClient.begin', () => {
  it('stores state and navigates to Google', async () => {
    const navigate = vi.fn()
    await client(navigate).begin()
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate.mock.calls[0][0]).toContain('https://accounts.google.com/')
    expect(window.sessionStorage.length).toBe(1)
  })

  it('does not redirect when sessionStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const navigate = vi.fn()
    await expect(client(navigate).begin()).rejects.toThrow()
    expect(navigate).not.toHaveBeenCalled()
  })
})
