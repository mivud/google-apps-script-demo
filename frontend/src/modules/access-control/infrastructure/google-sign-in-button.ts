import type { RenderSignInButton } from '../ui/auth-context'
import type { GoogleIdentityClient } from './google-identity-client'

// Same width as the redirect button (15rem at 16px) so the two buttons line up.
const BUTTON_WIDTH_PX = 240

// Google draws the button in an iframe, so only these options can match the redirect button: a dark fill in dark mode.
function buttonTheme(): 'outline' | 'filled_black' {
  return document.documentElement.dataset.colorScheme === 'dark' ? 'filled_black' : 'outline'
}

// DOM rendering lives here, not in the application layer.
export function createSignInButtonRenderer(identity: GoogleIdentityClient): RenderSignInButton {
  return (container) => {
    void identity
      .ready()
      .then((gis) => gis.renderButton(container, { type: 'standard', size: 'large', shape: 'rectangular', width: BUTTON_WIDTH_PX, theme: buttonTheme(), text: 'signin_with' }))
      .catch(() => undefined)
  }
}
