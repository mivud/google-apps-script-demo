import { RedirectLoginError, type AuthRuntime } from '../modules/access-control'

const CALLBACK_SEGMENT = 'auth/callback'

export function isAuthCallbackPath(win: Pick<Window, 'location'>, baseUrl: string = import.meta.env.BASE_URL): boolean {
  return win.location.pathname === baseUrl + CALLBACK_SEGMENT
}

// Runs before React so the gate never starts a silent restore while the redirect result is still being exchanged.
export async function consumeAuthCallback(
  runtime: AuthRuntime,
  win: Pick<Window, 'location' | 'history'>,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<void> {
  if (!isAuthCallbackPath(win, baseUrl)) return
  const result = runtime.redirectLogin.consumeCallback(win.location, win.history)
  try {
    if (result.status === 'ok') await runtime.auth.signIn(result.idToken, result.nonce)
    if (result.status === 'error') {
      runtime.auth.attempts.set({ status: 'failed', error: new RedirectLoginError(result.code) })
    }
  } catch {
    // signIn already recorded the failure for the login page.
  } finally {
    // Constant target: never a value taken from the URL.
    win.history.replaceState(null, '', baseUrl)
  }
}
