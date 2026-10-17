export const LAUNCHER_PATH = '/'

// Hash routing works on static hosts (GitHub Pages, Cloudflare Pages) without server rewrites.
export function pathFromHash(hash: string): string {
  const path = hash.startsWith('#') ? hash.slice(1) : hash
  return path === '' ? LAUNCHER_PATH : path
}

// Routes from before the app launcher existed; kept so old bookmarks still work.
const LEGACY_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ['/equipment/', '/devices/equipment/'],
]
const LEGACY_EXACT: Readonly<Record<string, string>> = {
  '/categories': '/devices/categories',
}

// Returns the new route for a legacy one, or null when the path is not legacy.
export function legacyRedirect(path: string): string | null {
  const exact = LEGACY_EXACT[path]
  if (exact) return exact
  for (const [oldPrefix, newPrefix] of LEGACY_PREFIXES) {
    if (path.startsWith(oldPrefix) && path.length > oldPrefix.length) return newPrefix + path.slice(oldPrefix.length)
  }
  return null
}

// An app owns its path and everything below it ("/devices" matches "/devices/x" but not "/devices-x").
export function ownsPath(appPath: string, path: string): boolean {
  return path === appPath || path.startsWith(`${appPath}/`)
}

export function findOwner<T extends { path: string }>(apps: readonly T[], path: string): T | null {
  return apps.find((app) => ownsPath(app.path, path)) ?? null
}
