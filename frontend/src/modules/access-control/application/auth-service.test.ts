import { describe, expect, it, vi } from 'vitest'
import { AuthError, ForbiddenError, NetworkError } from '../../../shared/errors'
import type { Identity } from '../domain/session'
import { AuthService } from './auth-service'
import type { IdTokenSource } from './id-token-source'
import type { SessionProvider } from './session-provider'
import { SessionStore } from './session-store'

function tokenExpiringAt(expSeconds: number): string {
  return `h.${btoa(JSON.stringify({ exp: expSeconds }))}.s`
}
const FUTURE_TOKEN = tokenExpiringAt(Math.floor(Date.now() / 1000) + 3600)
const IDENTITY: Identity = { email: 'a@b.c', role: 'admin', roles: ['admin'], claims: [] }

function setup() {
  const sessions = { establish: vi.fn().mockResolvedValue(IDENTITY), clear: vi.fn().mockResolvedValue(undefined) }
  const tokens = {
    start: vi.fn(),
    requestToken: vi.fn().mockResolvedValue(null),
    onCredential: vi.fn(),
    signOut: vi.fn(),
  }
  const store = new SessionStore()
  const auth = new AuthService(sessions satisfies SessionProvider, tokens satisfies IdTokenSource, store)
  return { auth, sessions, tokens, store }
}

describe('AuthService', () => {
  it('signIn stores the session with token and expiry and passes the nonce', async () => {
    const { auth, sessions } = setup()
    const session = await auth.signIn(FUTURE_TOKEN, 'nonce')
    expect(sessions.establish).toHaveBeenCalledWith(FUTURE_TOKEN, 'nonce')
    expect(session).toMatchObject({ ...IDENTITY, idToken: FUTURE_TOKEN })
    expect(session.expiresAt).toBeGreaterThan(Date.now())
    expect(auth.getIdToken()).toBe(FUTURE_TOKEN)
    expect(auth.getRole()).toBe('admin')
    expect(auth.attempts.get()).toEqual({ status: 'idle' })
  })

  it('signIn marks the attempt pending while waiting', async () => {
    const { auth, sessions } = setup()
    let release!: (identity: Identity) => void
    sessions.establish.mockReturnValue(new Promise<Identity>((resolve) => { release = resolve }))
    const running = auth.signIn(FUTURE_TOKEN, 'n')
    expect(auth.attempts.get()).toEqual({ status: 'pending' })
    release(IDENTITY)
    await running
  })

  it('signIn failure without a session records the error and keeps the user signed out', async () => {
    const { auth, sessions } = setup()
    sessions.establish.mockRejectedValue(new ForbiddenError())
    await expect(auth.signIn(FUTURE_TOKEN, 'n')).rejects.toBeInstanceOf(ForbiddenError)
    expect(auth.current()).toBeNull()
    expect(auth.attempts.get()).toMatchObject({ status: 'failed' })
  })

  it('a rejection by the backend ends a valid session', async () => {
    const { auth, sessions } = setup()
    await auth.signIn(FUTURE_TOKEN, 'n')
    sessions.establish.mockRejectedValue(new AuthError())
    await expect(auth.signIn('other', 'n')).rejects.toBeInstanceOf(AuthError)
    expect(auth.current()).toBeNull()
    expect(auth.attempts.get().status).toBe('failed')
  })

  it('a transient failure keeps a still valid session and clears the attempt', async () => {
    const { auth, sessions } = setup()
    await auth.signIn(FUTURE_TOKEN, 'n')
    sessions.establish.mockRejectedValue(new NetworkError())
    await expect(auth.signIn('other', 'n')).rejects.toBeInstanceOf(NetworkError)
    expect(auth.current()).not.toBeNull()
    expect(auth.attempts.get()).toEqual({ status: 'idle' })
  })

  it('a transient failure with an expired session signs out', async () => {
    const { auth, sessions } = setup()
    await auth.signIn(tokenExpiringAt(1), 'n')
    sessions.establish.mockRejectedValue(new NetworkError())
    await expect(auth.signIn('other', 'n')).rejects.toBeInstanceOf(NetworkError)
    expect(auth.current()).toBeNull()
    expect(auth.attempts.get().status).toBe('failed')
  })

  it('signOut stops token timers, clears the store and the provider session', async () => {
    const { auth, sessions, tokens } = setup()
    await auth.signIn(FUTURE_TOKEN, 'n')
    await auth.signOut()
    expect(tokens.signOut).toHaveBeenCalled()
    expect(sessions.clear).toHaveBeenCalled()
    expect(auth.current()).toBeNull()
    expect(auth.getIdToken()).toBeNull()
    expect(auth.getRole()).toBeNull()
  })

  it('refreshIdToken returns the stored token after a credential arrives', async () => {
    const { auth, tokens } = setup()
    tokens.requestToken.mockImplementation(async () => {
      await auth.signIn(FUTURE_TOKEN, 'n')
      return FUTURE_TOKEN
    })
    expect(await auth.refreshIdToken()).toBe(FUTURE_TOKEN)
  })

  it('refreshIdToken without a token signs an existing session out', async () => {
    const { auth, tokens } = setup()
    await auth.signIn(FUTURE_TOKEN, 'n')
    tokens.requestToken.mockResolvedValue(null)
    expect(await auth.refreshIdToken()).toBeNull()
    expect(auth.current()).toBeNull()
    expect(tokens.signOut).toHaveBeenCalled()
  })

  it('refreshIdToken without a token and without a session does nothing', async () => {
    const { auth, tokens } = setup()
    expect(await auth.refreshIdToken()).toBeNull()
    expect(tokens.signOut).not.toHaveBeenCalled()
  })

  it('refreshIdToken returns null when the token was not accepted', async () => {
    const { auth, tokens } = setup()
    tokens.requestToken.mockResolvedValue('rejected-token')
    expect(await auth.refreshIdToken()).toBeNull()
  })

  it('notifies subscribers and starts silent sign-in', async () => {
    const { auth, tokens } = setup()
    const listener = vi.fn()
    auth.subscribe(listener)
    auth.startSilentSignIn()
    await auth.signIn(FUTURE_TOKEN, 'n')
    expect(tokens.start).toHaveBeenCalled()
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.c' }))
  })
})
