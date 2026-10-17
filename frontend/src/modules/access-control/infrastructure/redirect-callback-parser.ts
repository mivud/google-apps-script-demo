export interface CallbackFragment {
  idToken?: string
  state?: string
  error?: boolean
}

const READ_KEYS = ['id_token', 'state', 'error'] as const

// Returns null for a repeated parameter (parameter pollution). access_token and code are ignored on purpose.
export function parseCallbackFragment(hash: string): CallbackFragment | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  if (READ_KEYS.some((key) => params.getAll(key).length > 1)) return null
  const idToken = params.get('id_token') || undefined
  const state = params.get('state') || undefined
  // The error text is never read; its presence alone is the signal.
  return { idToken, state, error: params.has('error') || undefined }
}
