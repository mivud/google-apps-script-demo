import type { Identity } from '../domain/session'

// Port: each provider verifies the Google ID token its own way and says who the user is.
export interface SessionProvider {
  // `nonce` is the raw value whose hash is in the token. Throws AuthError (bad/expired token) or ForbiddenError (not on the allowlist).
  establish(idToken: string, nonce: string): Promise<Identity>
  clear(): Promise<void>
}
