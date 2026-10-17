const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

export interface AuthorizationRequest {
  clientId: string
  redirectUri: string
  state: string
  nonceHashed: string
}

// id_token only (implicit flow): no access token or code is requested, so nothing but the identity ever returns.
export function buildAuthorizationUrl(request: AuthorizationRequest): string {
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.searchParams.set('client_id', request.clientId)
  url.searchParams.set('redirect_uri', request.redirectUri)
  url.searchParams.set('response_type', 'id_token')
  url.searchParams.set('response_mode', 'fragment')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('nonce', request.nonceHashed)
  url.searchParams.set('state', request.state)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}
