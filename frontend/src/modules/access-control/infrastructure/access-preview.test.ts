import { afterEach, describe, expect, it, vi } from 'vitest'
import { NetworkError } from '../../../shared/errors'
import { createAccessPreviewService } from './create-access-preview-service'
import { SupabaseSessionAdapter } from './persistence/supabase/supabase-session-adapter'

afterEach(() => vi.unstubAllGlobals())

const sheetsConfig = { provider: 'sheets' as const, apiUrl: 'https://api.test', getIdToken: () => 'tok' }

describe('AccessPreviewService on Sheets', () => {
  it('posts the user id and parses the effective access, including an empty role', async () => {
    const data = { email: 'a@b.c', role: '', roles: ['custom'], claims: [{ key: 'a', value: '1' }] }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, data }) })
    vi.stubGlobal('fetch', fetchMock)
    const access = await createAccessPreviewService(sheetsConfig).preview('u-1')
    expect(access).toEqual(data)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      action: 'access-control.access.preview',
      idToken: 'tok',
      payload: { user_id: 'u-1' },
    })
  })

  it('maps FORBIDDEN and NOT_FOUND', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: { code: 'FORBIDDEN', message: 'x' } }) }))
    await expect(createAccessPreviewService(sheetsConfig).preview('u')).rejects.toMatchObject({ code: 'forbidden' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: { code: 'NOT_FOUND', message: 'x' } }) }))
    await expect(createAccessPreviewService(sheetsConfig).preview('u')).rejects.toMatchObject({ code: 'not_found' })
  })
})

function fakeSupabase(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const signOut = vi.fn().mockResolvedValue({})
  const client = {
    rpc,
    auth: { signOut, signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { email: 'a@b.c' } }, error: null }) },
  }
  return { client: client as never, rpc, signOut }
}

describe('SupabaseSessionAdapter', () => {
  it('reads the identity through the current_identity rpc', async () => {
    const data = { email: 'a@b.c', role: 'viewer', roles: ['viewer'], claims: [{ key: 'k', value: 'v' }] }
    const { client, rpc } = fakeSupabase({ data, error: null })
    expect(await new SupabaseSessionAdapter(client).establish('t', 'n')).toEqual(data)
    expect(rpc).toHaveBeenCalledWith('current_identity')
  })

  it('refuses and signs out when the rpc returns no identity', async () => {
    const { client, signOut } = fakeSupabase({ data: null, error: null })
    await expect(new SupabaseSessionAdapter(client).establish('t', 'n')).rejects.toMatchObject({ code: 'forbidden' })
    expect(signOut).toHaveBeenCalled()
  })

  it('signs out and fails generically when the rpc errors', async () => {
    const { client, signOut } = fakeSupabase({ data: null, error: { message: 'secret' } })
    await expect(new SupabaseSessionAdapter(client).establish('t', 'n')).rejects.toBeInstanceOf(NetworkError)
    expect(signOut).toHaveBeenCalled()
  })
})
