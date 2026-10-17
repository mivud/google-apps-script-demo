import { describe, expect, it } from 'vitest'
import { readIdTokenExpiry } from './id-token'

function tokenWith(claims: unknown): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `header.${payload}.signature`
}

describe('readIdTokenExpiry', () => {
  it('returns exp in milliseconds', () => {
    expect(readIdTokenExpiry(tokenWith({ exp: 1_700_000_000 }))).toBe(1_700_000_000_000)
  })

  it('decodes base64url payloads', () => {
    expect(readIdTokenExpiry(tokenWith({ exp: 5, name: '???>>>' }))).toBe(5000)
  })

  it('returns null for missing or non-numeric exp', () => {
    expect(readIdTokenExpiry(tokenWith({}))).toBeNull()
    expect(readIdTokenExpiry(tokenWith({ exp: '123' }))).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(readIdTokenExpiry('')).toBeNull()
    expect(readIdTokenExpiry('no-dots')).toBeNull()
    expect(readIdTokenExpiry('a.!!!.c')).toBeNull()
    expect(readIdTokenExpiry('a.bm90LWpzb24.c')).toBeNull()
  })
})
