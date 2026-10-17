import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthError, ForbiddenError, NetworkError } from '../errors'
import { postToAppsScript, toSharedApiError } from './apps-script-api'

afterEach(() => vi.unstubAllGlobals())

describe('postToAppsScript', () => {
  it('posts JSON as text/plain with a timeout signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data: 1 }) })
    vi.stubGlobal('fetch', fetchMock)
    const result = await postToAppsScript('https://example.test/api', { action: 'a', idToken: 't' })
    expect(result).toEqual({ ok: true, data: 1 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://example.test/api')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toContain('text/plain')
    expect(JSON.parse(init.body as string)).toEqual({ action: 'a', idToken: 't' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('maps HTTP errors, network failures and timeouts to a generic NetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(postToAppsScript('u', {})).rejects.toBeInstanceOf(NetworkError)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('secret detail', 'TimeoutError')))
    const error = await postToAppsScript('u', {}).catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(NetworkError)
    expect((error as Error).message).not.toContain('secret')
  })
})

describe('toSharedApiError', () => {
  it('maps shared codes', () => {
    const failure = (code: string) => ({ ok: false as const, error: { code, message: 'm' } })
    expect(toSharedApiError(failure('UNAUTHORIZED'))).toBeInstanceOf(AuthError)
    expect(toSharedApiError(failure('FORBIDDEN'))).toBeInstanceOf(ForbiddenError)
    expect(toSharedApiError(failure('OTHER'))).toBeInstanceOf(NetworkError)
  })
})
