// Routes of the Identity app live here so pages never build URLs by hand.
export const IDENTITY_BASE = '/identity'
export const USERS_PATH = `${IDENTITY_BASE}/users`
export const ROLES_PATH = `${IDENTITY_BASE}/roles`
export const CLAIMS_PATH = `${IDENTITY_BASE}/claims`

export type IdentityRoute =
  | { page: 'users' }
  | { page: 'user'; id: string }
  | { page: 'roles' }
  | { page: 'role'; id: string }
  | { page: 'claims' }

export function userPath(id: string): string {
  return `${USERS_PATH}/${encodeURIComponent(id)}`
}

export function rolePath(id: string): string {
  return `${ROLES_PATH}/${encodeURIComponent(id)}`
}

// Rows created by hand in the sheet may carry non-UUID ids, so accept any short token of safe characters.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function decodeId(raw: string): string | undefined {
  try {
    const id = decodeURIComponent(raw)
    return ID_PATTERN.test(id) ? id : undefined
  } catch {
    return undefined
  }
}

// Unknown paths and non-UUID ids fall back to the list routes.
export function parseIdentityRoute(path: string): IdentityRoute {
  const parts = path.split('/').filter(Boolean)
  const [, section, rawId, extra] = parts
  if (parts[0] !== 'identity' || extra !== undefined) return { page: 'users' }
  const id = rawId === undefined ? undefined : decodeId(rawId)
  if (section === 'claims' && rawId === undefined) return { page: 'claims' }
  if (section === 'users') return id ? { page: 'user', id } : { page: 'users' }
  if (section === 'roles') return id ? { page: 'role', id } : { page: 'roles' }
  return { page: 'users' }
}
