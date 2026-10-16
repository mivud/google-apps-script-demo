import { AuthError, ForbiddenError, NetworkError } from '../errors'

export interface ApiSuccess<T> {
  ok: true
  data: T
}
export interface ApiFailure {
  ok: false
  error: { code: string; message: string }
}
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

// Apps Script cold starts can take tens of seconds; past this the UI shows an error with retry instead of spinning forever.
const REQUEST_TIMEOUT_MS = 45_000

// Messages are fixed on purpose: server or browser error text must not reach the UI.
export async function postToAppsScript<T>(apiUrl: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    // text/plain keeps this a "simple" request; Apps Script cannot answer CORS preflights.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new NetworkError()
    return (await response.json()) as ApiResponse<T>
  } catch (error) {
    throw error instanceof NetworkError ? error : new NetworkError()
  }
}

// Codes every Apps Script endpoint shares; callers handle their own codes first.
export function toSharedApiError(failure: ApiFailure): Error {
  switch (failure.error.code) {
    case 'UNAUTHORIZED':
      return new AuthError()
    case 'FORBIDDEN':
      return new ForbiddenError()
    default:
      return new NetworkError()
  }
}
