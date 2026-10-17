import { AuthError, ForbiddenError } from '../../../shared/errors'
import { readIdTokenExpiry } from '../domain/id-token'
import type { Role } from '../domain/role'
import type { Session } from '../domain/session'
import type { IdTokenSource, SilentFailure } from './id-token-source'
import type { SessionProvider } from './session-provider'
import type { SessionStore } from './session-store'
import { SignInAttemptStore } from './sign-in-attempt-store'

export type { SignInAttempt } from './sign-in-attempt-store'

export class AuthService {
  private readonly sessions: SessionProvider
  private readonly tokens: IdTokenSource
  private readonly store: SessionStore
  readonly attempts: SignInAttemptStore
  private lastSilentFailure: SilentFailure | null = null
  private readonly onSignOut: () => void

  constructor(
    sessions: SessionProvider,
    tokens: IdTokenSource,
    store: SessionStore,
    attempts = new SignInAttemptStore(),
    onSignOut: () => void = () => {},
  ) {
    this.onSignOut = onSignOut
    this.sessions = sessions
    this.tokens = tokens
    this.store = store
    this.attempts = attempts
  }

  async signIn(idToken: string, nonce: string): Promise<Session> {
    this.attempts.set({ status: 'pending' })
    try {
      const identity = await this.sessions.establish(idToken, nonce)
      const session = { ...identity, idToken, expiresAt: readIdTokenExpiry(idToken) }
      this.store.set(session)
      this.attempts.clear()
      return session
    } catch (error) {
      this.handleSignInFailure(error)
      throw error
    }
  }

  // A transient failure (network) must not log out a still valid session; only a rejection by the backend does.
  private handleSignInFailure(error: unknown): void {
    const rejected = error instanceof AuthError || error instanceof ForbiddenError
    const stillValid = this.hasUnexpiredSession()
    if (rejected || !stillValid) this.store.set(null)
    if (stillValid && !rejected) return this.attempts.clear()
    this.attempts.set({ status: 'failed', error: error instanceof Error ? error : new Error('Sign-in failed') })
  }

  private hasUnexpiredSession(): boolean {
    const expiresAt = this.store.get()?.expiresAt
    return this.store.get() !== null && (expiresAt == null || expiresAt > Date.now())
  }

  async signOut(): Promise<void> {
    this.tokens.signOut()
    this.onSignOut()
    this.store.set(null)
    await this.sessions.clear()
  }

  current(): Session | null {
    return this.store.get()
  }

  getIdToken(): string | null {
    return this.store.get()?.idToken ?? null
  }

  getRole(): Role | null {
    return this.store.get()?.role ?? null
  }

  subscribe(listener: (session: Session | null) => void): () => void {
    return this.store.subscribe(listener)
  }

  // Silent re-login on page load (token lives in memory only).
  startSilentSignIn(): void {
    this.tokens.start()
  }

  // Used by data adapters after a token_expired answer and by the gate on load; the new token is stored through the credential handler.
  // No token means the login is gone, so end the session and let the gate show the login page.
  async refreshIdToken(): Promise<string | null> {
    const idToken = await this.tokens.requestToken()
    const fresh = idToken ? this.getIdToken() : null
    if (!fresh && this.store.get()) await this.signOut()
    return fresh
  }

  // Why the last restoreSession found no login; the login page explains it.
  silentFailure(): SilentFailure | null {
    return this.lastSilentFailure
  }

  // Page-load re-login; records why it failed so the login page can explain it.
  async restoreSession(): Promise<string | null> {
    const idToken = await this.refreshIdToken()
    this.lastSilentFailure = idToken ? null : this.tokens.lastFailure()
    return idToken
  }
}
