import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthError, ForbiddenError, NetworkError } from '../../../shared/errors'
import { SheetsSessionAdapter } from './persistence/googlesheet/sheets-session-adapter'

afterEach(() => vi.unstubAllGlobals())

function stubResponse(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('SheetsSessionAdapter', () => {
  it('sends the token and the raw nonce, and returns the identity with roles and claims', async () => {
    const claims = [{ key: 'device.write', value: 'true' }]
    const fetchMock = stubResponse({ ok: true, data: { email: 'a@b.c', role: 'admin', roles: ['admin'], claims } })
    const identity = await new SheetsSessionAdapter('https://identity.test').establish('tok', 'raw-nonce')
    expect(identity).toEqual({ email: 'a@b.c', role: 'admin', roles: ['admin'], claims })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://identity.test')
    expect(JSON.parse(init.body as string)).toEqual({
      action: 'auth.session.get',
      idToken: 'tok',
      payload: { nonce: 'raw-nonce' },
    })
  })

  it('defaults roles and claims to empty for an older backend', async () => {
    stubResponse({ ok: true, data: { email: 'a@b.c', role: 'viewer' } })
    const identity = await new SheetsSessionAdapter('u').establish('t', 'n')
    expect(identity).toEqual({ email: 'a@b.c', role: 'viewer', roles: [], claims: [] })
  })

  it('maps UNAUTHORIZED and FORBIDDEN', async () => {
    stubResponse({ ok: false, error: { code: 'UNAUTHORIZED', message: 'x' } })
    await expect(new SheetsSessionAdapter('u').establish('t', 'n')).rejects.toBeInstanceOf(AuthError)
    stubResponse({ ok: false, error: { code: 'FORBIDDEN', message: 'x' } })
    await expect(new SheetsSessionAdapter('u').establish('t', 'n')).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects malformed identity data', async () => {
    const malformed = [
      { email: 'a@b.c', role: 'root' },
      { email: 'a@b.c', role: '' },
      { email: 'a@b.c', role: 'admin', roles: 'admin' },
      { email: 'a@b.c', role: 'admin', roles: [1] },
      { email: 'a@b.c', role: 'admin', claims: [{ key: 'a' }] },
    ]
    for (const data of malformed) {
      stubResponse({ ok: true, data })
      await expect(new SheetsSessionAdapter('u').establish('t', 'n')).rejects.toBeInstanceOf(NetworkError)
    }
    stubResponse({ ok: true })
    await expect(new SheetsSessionAdapter('u').establish('t', 'n')).rejects.toBeInstanceOf(NetworkError)
  })
})
