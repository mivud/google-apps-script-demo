import { describe, expect, it } from 'vitest'
import { parseCallbackFragment } from './redirect-callback-parser'

describe('parseCallbackFragment', () => {
  it('reads id_token and state', () => {
    expect(parseCallbackFragment('#id_token=abc&state=xyz')).toMatchObject({ idToken: 'abc', state: 'xyz' })
  })

  it('flags an error without reading its text', () => {
    const result = parseCallbackFragment('#error=access_denied&error_description=secret')
    expect(result?.error).toBe(true)
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('ignores access_token and code', () => {
    const result = parseCallbackFragment('#access_token=a&code=c&id_token=t&state=s')
    expect(result).toEqual({ idToken: 't', state: 's', error: undefined })
  })

  it('rejects duplicated parameters', () => {
    expect(parseCallbackFragment('#id_token=a&id_token=b&state=s')).toBeNull()
    expect(parseCallbackFragment('#id_token=a&state=s&state=t')).toBeNull()
  })
})
