import { postToAppsScript, type ApiFailure, type ApiResponse } from './apps-script-api'
import { WarmupGate } from './warmup-gate'

export interface SheetsCallerConfig {
  apiUrl: string
  getIdToken: () => string | null
  // Silent re-auth used once when the backend answers UNAUTHORIZED.
  refreshIdToken?: () => Promise<string | null>
  warmup?: WarmupGate
}

// Shared transport for Apps Script adapters: warmup gate, one silent re-auth retry, provider-error mapping.
export class SheetsCaller {
  private readonly config: SheetsCallerConfig
  private readonly warmup: WarmupGate
  private readonly mapError: (failure: ApiFailure) => Error

  constructor(config: SheetsCallerConfig, mapError: (failure: ApiFailure) => Error) {
    this.config = config
    this.mapError = mapError
    this.warmup = config.warmup ?? new WarmupGate()
  }

  call<T>(action: string, payload: unknown): Promise<T> {
    return this.warmup.run(this.config.getIdToken(), () => this.send<T>(action, payload))
  }

  private async send<T>(action: string, payload: unknown): Promise<T> {
    let body = await this.post<T>(action, payload, this.config.getIdToken())
    if (!body.ok && body.error.code === 'UNAUTHORIZED' && this.config.refreshIdToken) {
      const freshToken = await this.config.refreshIdToken()
      if (freshToken) body = await this.post<T>(action, payload, freshToken)
    }
    if (body.ok) return body.data
    throw this.mapError(body)
  }

  private post<T>(action: string, payload: unknown, idToken: string | null): Promise<ApiResponse<T>> {
    return postToAppsScript<T>(this.config.apiUrl, { action, idToken, payload })
  }
}
