import type { CallbackResult } from '../domain/redirect-callback'

// Port: the redirect-based Google sign-in, used when the One Tap prompt is unavailable.
export interface RedirectLogin {
  // Leaves the page for Google; rejects (without redirecting) when the flow cannot be started safely.
  begin(): Promise<void>
  // Reads the fragment of the callback URL once and strips it from the address bar before anything else.
  consumeCallback(location: Pick<Location, 'hash' | 'pathname'>, history: Pick<History, 'replaceState'>): CallbackResult
  // Drops any half-finished redirect (sign-out).
  clear(): void
}
