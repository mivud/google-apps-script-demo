const MILLIS_PER_SECOND = 1000

// Decodes the payload WITHOUT verifying the signature: only used to schedule a refresh.
// Trust decisions are always made by the backend.
export function readIdTokenExpiry(idToken: string): number | null {
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof claims.exp === 'number' ? claims.exp * MILLIS_PER_SECOND : null
  } catch {
    return null
  }
}
