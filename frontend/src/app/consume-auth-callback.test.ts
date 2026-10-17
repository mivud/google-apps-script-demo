import { describe, expect, it, vi } from 'vitest'
import type { CallbackResult, AuthRuntime } from '../modules/access-control'
import { consumeAuthCallback } from './consume-auth-callback'

const BASE = '/app/'

function setup(pathname: string, result: CallbackResult) {
  const attempts = { set: vi.fn() }
  const signIn = vi.fn().mockResolvedValue(undefined)
  const runtime = {
    auth: { signIn, attempts },
    redirectLogin: { consumeCallback: vi.fn().mockReturnValue(result) },
  } as unknown as AuthRuntime
  const win = { location: { pathname, hash: '#x' }, history: { replaceState: vi.fn() } } as unknown as Window
  return { runtime, win, signIn, attempts }
}

describe('consumeAuthCallback', () => {
  it('does nothing outside the callback path', async () => {
    const { runtime, win, signIn } = setup('/app/devices', { status: 'none' })
    await consumeAuthCallback(runtime, win, BASE)
    expect(runtime.redirectLogin.consumeCallback).not.toHaveBeenCalled()
    expect(signIn).not.toHaveBeenCalled()
    expect(win.history.replaceState).not.toHaveBeenCalled()
  })

  it('signs in and returns to the app root on success', async () => {
    const { runtime, win, signIn } = setup('/app/auth/callback', { status: 'ok', idToken: 'tok', nonce: 'raw' })
    await consumeAuthCallback(runtime, win, BASE)
    expect(signIn).toHaveBeenCalledWith('tok', 'raw')
    expect(win.history.replaceState).toHaveBeenCalledWith(null, '', BASE)
  })

  it('records a generic failure without signing in', async () => {
    const { runtime, win, signIn, attempts } = setup('/app/auth/callback', { status: 'error', code: 'state_mismatch' })
    await consumeAuthCallback(runtime, win, BASE)
    expect(signIn).not.toHaveBeenCalled()
    expect(attempts.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    expect(win.history.replaceState).toHaveBeenCalledWith(null, '', BASE)
  })
})
