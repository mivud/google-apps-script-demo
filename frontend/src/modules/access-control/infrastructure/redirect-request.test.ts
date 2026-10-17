import { describe, expect, it } from 'vitest'
import { buildAuthorizationUrl } from './redirect-request'

describe('buildAuthorizationUrl', () => {
  const url = new URL(
    buildAuthorizationUrl({ clientId: 'cid', redirectUri: 'https://x.test/app/auth/callback', state: 'st', nonceHashed: 'hn' }),
  )

  it('targets Google and asks for an id_token in the fragment only', () => {
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('response_type')).toBe('id_token')
    expect(url.searchParams.get('response_mode')).toBe('fragment')
    expect(url.searchParams.get('scope')).toBe('openid email profile')
    expect(url.searchParams.get('prompt')).toBe('select_account')
  })

  it('carries the hashed nonce, state and redirect uri', () => {
    expect(url.searchParams.get('nonce')).toBe('hn')
    expect(url.searchParams.get('state')).toBe('st')
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.test/app/auth/callback')
    expect(url.searchParams.get('client_id')).toBe('cid')
  })
})
