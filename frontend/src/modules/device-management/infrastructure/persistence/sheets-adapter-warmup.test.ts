import { afterEach, describe, expect, it, vi } from 'vitest'
import { SheetsAdapter } from './googlesheet/sheets-adapter'

afterEach(() => vi.unstubAllGlobals())

// Named apart from the googlesheet folder on purpose: tests there are contract tests against a real backend.
function stubBackend(respond: (body: { action: string; idToken: string | null }) => unknown) {
  const resolvers: Array<() => void> = []
  const bodies: Array<{ action: string; idToken: string | null }> = []
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { action: string; idToken: string | null }
    bodies.push(body)
    return new Promise((resolve) => {
      resolvers.push(() => resolve({ ok: true, json: async () => respond(body) }))
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, bodies, answerNext: () => resolvers.shift()?.() }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('SheetsAdapter warmup gate', () => {
  it('sends the first request alone and the rest after it answers', async () => {
    const backend = stubBackend(() => ({ ok: true, data: [] }))
    const adapter = new SheetsAdapter({ apiUrl: 'https://api.test', getIdToken: () => 'tok' })
    const calls = [adapter.listCategories(), adapter.listCategories(), adapter.listCategories()]
    await flush()
    expect(backend.fetchMock).toHaveBeenCalledTimes(1)
    backend.answerNext()
    await flush()
    expect(backend.fetchMock).toHaveBeenCalledTimes(3)
    backend.answerNext()
    backend.answerNext()
    await Promise.all(calls)
    expect(backend.bodies.every((body) => body.idToken === 'tok')).toBe(true)
  })

  it('does not hold the others back when the first request fails', async () => {
    const backend = stubBackend((body) =>
      body.action === 'device-management.category.list'
        ? { ok: false, error: { code: 'INTERNAL', message: 'x' } }
        : { ok: true, data: [] },
    )
    const adapter = new SheetsAdapter({ apiUrl: 'https://api.test', getIdToken: () => 'tok' })
    const first = adapter.listCategories().catch((error: unknown) => error)
    const second = adapter.listCategories().catch((error: unknown) => error)
    await flush()
    expect(backend.fetchMock).toHaveBeenCalledTimes(1)
    backend.answerNext()
    await flush()
    expect(backend.fetchMock).toHaveBeenCalledTimes(2)
    backend.answerNext()
    expect(await first).toBeInstanceOf(Error)
    expect(await second).toBeInstanceOf(Error)
  })

  it('retries once with the refreshed token after UNAUTHORIZED', async () => {
    const sentTokens: Array<string | null> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const { idToken } = JSON.parse(init.body as string) as { idToken: string | null }
        sentTokens.push(idToken)
        const body = idToken === 'fresh' ? { ok: true, data: [] } : { ok: false, error: { code: 'UNAUTHORIZED', message: 'x' } }
        return { ok: true, json: async () => body }
      }),
    )
    const adapter = new SheetsAdapter({
      apiUrl: 'https://api.test',
      getIdToken: () => 'old',
      refreshIdToken: async () => 'fresh',
    })
    expect(await adapter.listCategories()).toEqual([])
    expect(sentTokens).toEqual(['old', 'fresh'])
  })
})
