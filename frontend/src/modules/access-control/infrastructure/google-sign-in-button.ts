import type { RenderSignInButton } from '../ui/auth-context'
import type { GoogleIdentityClient } from './google-identity-client'

// Same width as .btn-google (15rem) so both sign-in buttons line up; Google draws this one, so it cannot be styled with CSS.
const BUTTON_WIDTH_PX = 240

// DOM rendering lives here, not in the application layer.
export function createSignInButtonRenderer(identity: GoogleIdentityClient): RenderSignInButton {
  return (container) => {
    void identity
      .ready()
      .then((gis) => gis.renderButton(container, { type: 'standard', size: 'large', theme: 'outline', text: 'signin_with', width: BUTTON_WIDTH_PX }))
      .catch(() => undefined)
  }
}
