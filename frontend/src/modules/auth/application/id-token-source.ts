// The raw nonce belongs to the credential: providers check its hash against the token's nonce claim.
export type CredentialHandler = (idToken: string, nonce: string) => Promise<void>

// Port: where Google ID tokens come from (Google Identity Services in the browser).
export interface IdTokenSource {
  // Tries a silent sign-in; a credential arrives through the handler set with onCredential.
  start(): void
  // Asks for a fresh token without user interaction; resolves null when that is not possible.
  requestToken(): Promise<string | null>
  // The returned promise settles once the session is stored, so requestToken callers see it.
  onCredential(handler: CredentialHandler): void
  // Stops silent re-login and refresh timers.
  signOut(): void
}
