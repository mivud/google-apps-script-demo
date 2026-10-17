export type CallbackErrorCode = 'state_mismatch' | 'provider_error' | 'expired' | 'malformed'

export type CallbackResult =
  | { status: 'none' }
  | { status: 'ok'; idToken: string; nonce: string }
  | { status: 'error'; code: CallbackErrorCode }

// Carries only a stable code so the UI can pick a generic message; never provider text.
export class RedirectLoginError extends Error {
  readonly code: CallbackErrorCode | 'unavailable'

  constructor(code: CallbackErrorCode | 'unavailable') {
    super('Redirect sign-in failed')
    this.name = 'RedirectLoginError'
    this.code = code
  }
}
