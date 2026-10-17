import { describe, expect, it } from 'vitest'
import { createNonce } from './nonce'

describe('createNonce', () => {
  it('returns a 32-char hex raw value and its SHA-256 hex hash', async () => {
    const { raw, hashed } = await createNonce()
    expect(raw).toMatch(/^[0-9a-f]{32}$/)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const expected = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
    expect(hashed).toBe(expected)
  })

  it('is different every time', async () => {
    expect((await createNonce()).raw).not.toBe((await createNonce()).raw)
  })
})
