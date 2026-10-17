import { postToAppsScript, toSharedApiError } from '../../../../../shared/api/apps-script-api'
import type { SessionProvider } from '../../../application/session-provider'
import { parseEffectiveAccess } from '../../../domain/effective-access'
import type { Identity } from '../../../domain/session'

const SESSION_GET_ACTION = 'auth.session.get'

export class SheetsSessionAdapter implements SessionProvider {
  private readonly identityApiUrl: string

  constructor(identityApiUrl: string) {
    this.identityApiUrl = identityApiUrl
  }

  // The raw nonce lets the backend check sha256(nonce) against the token's nonce claim.
  async establish(idToken: string, nonce: string): Promise<Identity> {
    const body = await postToAppsScript<Record<string, unknown>>(this.identityApiUrl, {
      action: SESSION_GET_ACTION,
      idToken,
      payload: { nonce },
    })
    if (!body.ok) throw toSharedApiError(body)
    return parseEffectiveAccess(body.data)
  }

  // The Apps Script side keeps no session; every request carries the token.
  async clear(): Promise<void> {}
}
