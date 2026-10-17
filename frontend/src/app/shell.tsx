import { useEffect } from 'react'
import type { AppDeps } from './app-deps'
import { useSession } from '../modules/access-control'
import { isAppAvailable } from './launcher/app-definition'
import { findOwner, legacyRedirect, LAUNCHER_PATH } from './launcher/app-route'
import { APP_REGISTRY } from './launcher/app-registry'
import { LauncherPage } from './launcher/launcher-page'
import { LazyAppHost } from './launcher/lazy-app-host'
import { useHashPath } from './use-hash-path'

// Chooses between the launcher and the registered apps from the hash route.
export function Shell({ deps }: { deps: AppDeps }) {
  const path = useHashPath()
  const session = useSession()
  const owner = findOwner(APP_REGISTRY, path)
  // A typed URL must not open an app the launcher hides from this user.
  const app = owner && session && isAppAvailable(owner, session) ? owner : undefined
  const redirectTo = legacyRedirect(path) ?? (path === LAUNCHER_PATH || app ? null : LAUNCHER_PATH)

  // replace() keeps the old route out of the back-button history.
  useEffect(() => {
    if (redirectTo) window.location.replace(`#${redirectTo}`)
  }, [redirectTo])

  if (redirectTo) return null
  if (!app) return <LauncherPage apps={APP_REGISTRY} path={path} />
  return <LazyAppHost key={app.id} app={app} deps={deps} />
}
