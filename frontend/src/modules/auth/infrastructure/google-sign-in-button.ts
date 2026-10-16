import type { RenderSignInButton } from '../ui/auth-context'
import type { GoogleIdentityClient } from './google-identity-client'

// DOM rendering lives here, not in the application layer.
export function createSignInButtonRenderer(identity: GoogleIdentityClient): RenderSignInButton {
  return (container) => {
    void identity
      .ready()
      .then((gis) => gis.renderButton(container, { type: 'standard', size: 'large', theme: 'outline', text: 'signin_with' }))
      .catch(() => undefined)
  }
}
