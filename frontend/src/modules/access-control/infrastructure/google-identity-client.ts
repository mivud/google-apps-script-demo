import { readIdTokenExpiry } from '../domain/id-token'
import type { CredentialHandler, IdTokenSource } from '../application/id-token-source'
import { loadGis } from './gis-loader'
import type { GisAccountsId, GisCredentialResponse } from './gis-types'
import { createNonce } from './nonce'

const REFRESH_LEAD_MS = 5 * 60 * 1000
const MIN_REFRESH_DELAY_MS = 10 * 1000
const REQUEST_TIMEOUT_MS = 15 * 1000

type PendingRequest = (idToken: string | null) => void

export class GoogleIdentityClient implements IdTokenSource {
  private readonly clientId: string
  private handler: CredentialHandler | null = null
  private pending: PendingRequest[] = []
  private refreshTimer: ReturnType<typeof setTimeout> | undefined
  private initialized: Promise<GisAccountsId> | null = null

  constructor(clientId: string) {
    this.clientId = clientId
  }

  onCredential(handler: CredentialHandler): void {
    this.handler = handler
  }

  start(): void {
    void this.prompt().catch(() => this.settle(null))
  }

  requestToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => this.settle(null), REQUEST_TIMEOUT_MS)
      this.pending.push((idToken) => {
        clearTimeout(timeout)
        resolve(idToken)
      })
      void this.prompt().catch(() => this.settle(null))
    })
  }

  signOut(): void {
    clearTimeout(this.refreshTimer)
    this.settle(null)
    window.google?.accounts.id.disableAutoSelect()
  }

  // Shared by the prompt and the sign-in button so they always use the same nonce.
  ready(): Promise<GisAccountsId> {
    this.initialized ??= this.initialize().catch((error) => {
      this.initialized = null
      throw error
    })
    return this.initialized
  }

  private async prompt(): Promise<void> {
    const gis = await this.ready()
    gis.prompt((notification) => {
      const unavailable = notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()
      if (unavailable) this.settle(null)
    })
  }

  // One nonce per initialize, captured by its own callback, so concurrent calls cannot overwrite it.
  private async initialize(): Promise<GisAccountsId> {
    const gis = await loadGis()
    const nonce = await createNonce()
    gis.initialize({
      client_id: this.clientId,
      callback: (response) => void this.handleCredential(response, nonce.raw),
      nonce: nonce.hashed,
      auto_select: true,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
    })
    return gis
  }

  private async handleCredential(response: GisCredentialResponse, rawNonce: string): Promise<void> {
    // A credential consumes its nonce; the next prompt gets a fresh one so a captured token cannot be replayed.
    this.initialized = null
    const idToken = response.credential
    if (!idToken || !this.handler) return this.settle(null)
    try {
      await this.handler(idToken, rawNonce)
      this.scheduleRefresh(idToken)
      this.settle(idToken)
    } catch {
      this.settle(null)
    }
  }

  private scheduleRefresh(idToken: string): void {
    clearTimeout(this.refreshTimer)
    const expiresAt = readIdTokenExpiry(idToken)
    if (expiresAt === null) return
    const delay = Math.max(expiresAt - REFRESH_LEAD_MS - Date.now(), MIN_REFRESH_DELAY_MS)
    this.refreshTimer = setTimeout(() => void this.requestToken(), delay)
  }

  private settle(idToken: string | null): void {
    const waiting = this.pending
    this.pending = []
    waiting.forEach((resolve) => resolve(idToken))
  }
}
