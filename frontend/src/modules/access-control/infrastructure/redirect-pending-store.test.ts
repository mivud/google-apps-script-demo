// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RedirectLoginError } from '../domain/redirect-callback'
import { clearPending, PENDING_TTL_MS, savePending, takePending } from './redirect-pending-store'

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('redirect pending store', () => {
  it('returns the saved values once and then nothing', () => {
    savePending('s', 'n', 1000)
    expect(takePending()).toEqual({ state: 's', rawNonce: 'n', expiresAt: 1000 + PENDING_TTL_MS })
    expect(takePending()).toBeNull()
  })

  it('clear removes the entry', () => {
    savePending('s', 'n')
    clearPending()
    expect(takePending()).toBeNull()
  })

  it('ignores a corrupted entry', () => {
    window.sessionStorage.setItem('auth.redirect.pending', '{"state":1}')
    expect(takePending()).toBeNull()
  })

  it('fails with a generic error when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => savePending('s', 'n')).toThrow(RedirectLoginError)
  })
})
