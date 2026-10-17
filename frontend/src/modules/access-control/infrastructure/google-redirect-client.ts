import type { RedirectLogin } from '../application/redirect-token-source'
import type { CallbackResult } from '../domain/redirect-callback'
import { constantTimeEquals } from './constant-time-equals'
import { createNonce, createState } from './nonce'
import { parseCallbackFragment } from './redirect-callback-parser'
import { clearPending, savePending, takePending } from './redirect-pending-store'
import { buildAuthorizationUrl } from './redirect-request'

type Navigate = (url: string) => void

export class GoogleRedirectClient implements RedirectLogin {
  private readonly clientId: string
  private readonly redirectUri: string
  private readonly navigate: Navigate

  constructor(clientId: string, redirectUri: string, navigate: Navigate = (url) => window.location.assign(url)) {
    this.clientId = clientId
    this.redirectUri = redirectUri
    this.navigate = navigate
  }

  async begin(): Promise<void> {
    const nonce = await createNonce()
    const state = createState()
    // Throws before any redirect when storage is unavailable: the callback could not be verified.
    savePending(state, nonce.raw)
    this.navigate(
      buildAuthorizationUrl({ clientId: this.clientId, redirectUri: this.redirectUri, state, nonceHashed: nonce.hashed }),
    )
  }

  consumeCallback(location: Pick<Location, 'hash' | 'pathname'>, history: Pick<History, 'replaceState'>): CallbackResult {
    // First, synchronously: the id_token must not stay in the address bar or history entry.
    const hash = location.hash
    history.replaceState(null, '', location.pathname)
    if (!hash) return { status: 'none' }

    const pending = takePending()
    const fragment = parseCallbackFragment(hash)
    if (!fragment) return { status: 'error', code: 'malformed' }
    if (fragment.error) return { status: 'error', code: 'provider_error' }
    if (!pending || !fragment.state || !constantTimeEquals(fragment.state, pending.state)) {
      return { status: 'error', code: 'state_mismatch' }
    }
    if (pending.expiresAt <= Date.now()) return { status: 'error', code: 'expired' }
    if (!fragment.idToken) return { status: 'error', code: 'malformed' }
    return { status: 'ok', idToken: fragment.idToken, nonce: pending.rawNonce }
  }

  clear(): void {
    clearPending()
  }
}
