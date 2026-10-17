// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoogleIdentityClient } from './google-identity-client'
import { loadGis } from './gis-loader'
import type { GisAccountsId, GisCredentialResponse, GisIdConfiguration, GisPromptNotification } from './gis-types'

vi.mock('./gis-loader', () => ({ loadGis: vi.fn() }))
vi.mock('./nonce', () => ({ createNonce: async () => ({ raw: 'raw-nonce', hashed: 'hashed-nonce' }) }))

const FUTURE_TOKEN = `h.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.s`

function notification(overrides: Partial<Record<keyof GisPromptNotification, unknown>>): GisPromptNotification {
  return {
    isNotDisplayed: () => false,
    isSkippedMoment: () => false,
    isDismissedMoment: () => false,
    getDismissedReason: () => '',
    ...overrides,
  } as GisPromptNotification
}

function fakeGis() {
  const state: { config?: GisIdConfiguration; notify?: (n: GisPromptNotification) => void } = {}
  const gis: GisAccountsId = {
    initialize: (config) => { state.config = config },
    prompt: (listener) => { state.notify = listener },
    renderButton: () => undefined,
    disableAutoSelect: () => undefined,
    cancel: () => undefined,
  }
  vi.mocked(loadGis).mockResolvedValue(gis)
  return state
}

const credential = (state: ReturnType<typeof fakeGis>, response: GisCredentialResponse) => state.config!.callback(response)

describe('GoogleIdentityClient', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.mocked(loadGis).mockReset()
  })

  it('reports load_error when the Google script cannot load', async () => {
    vi.mocked(loadGis).mockRejectedValue(new Error('offline'))
    const client = new GoogleIdentityClient('client')
    expect(await client.requestToken()).toBeNull()
    expect(client.lastFailure()).toBe('load_error')
  })

  it('reports unavailable when Google will not show the prompt', async () => {
    const state = fakeGis()
    const client = new GoogleIdentityClient('client')
    const token = client.requestToken()
    await vi.waitFor(() => expect(state.notify).toBeDefined())
    state.notify!(notification({ isSkippedMoment: () => true }))
    expect(await token).toBeNull()
    expect(client.lastFailure()).toBe('unavailable')
  })

  it('does not treat a returned credential as a dismissed prompt', async () => {
    const state = fakeGis()
    const client = new GoogleIdentityClient('client')
    const handler = vi.fn().mockResolvedValue(undefined)
    client.onCredential(handler)
    const token = client.requestToken()
    await vi.waitFor(() => expect(state.notify).toBeDefined())
    state.notify!(notification({ isDismissedMoment: () => true, getDismissedReason: () => 'credential_returned' }))
    credential(state, { credential: FUTURE_TOKEN })
    expect(await token).toBe(FUTURE_TOKEN)
    expect(handler).toHaveBeenCalledWith(FUTURE_TOKEN, 'raw-nonce')
    expect(client.lastFailure()).toBeNull()
    client.signOut()
  })

  it('reports unavailable when the user dismisses the prompt', async () => {
    const state = fakeGis()
    const client = new GoogleIdentityClient('client')
    const token = client.requestToken()
    await vi.waitFor(() => expect(state.notify).toBeDefined())
    state.notify!(notification({ isDismissedMoment: () => true, getDismissedReason: () => 'cancel_called' }))
    expect(await token).toBeNull()
    expect(client.lastFailure()).toBe('unavailable')
  })

  it('reports timeout when Google never answers', async () => {
    vi.useFakeTimers()
    fakeGis()
    const client = new GoogleIdentityClient('client')
    const token = client.requestToken()
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await token).toBeNull()
    expect(client.lastFailure()).toBe('timeout')
  })

  it('clears the failure on sign-out', async () => {
    vi.mocked(loadGis).mockRejectedValue(new Error('offline'))
    const client = new GoogleIdentityClient('client')
    await client.requestToken()
    client.signOut()
    expect(client.lastFailure()).toBeNull()
  })
})
