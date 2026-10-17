import type { AuthService } from '../modules/access-control'
import { LAUNCHER_PATH } from './launcher/app-route'

interface Navigator {
  navigate(path: string, options: { replace: boolean }): unknown
}

// Another user may sign in next, so they must not land on the previous user's deep link.
export function resetRouteOnSignOut(auth: AuthService, router: Navigator): void {
  let hadSession = auth.current() !== null
  auth.subscribe(() => {
    const hasSession = auth.current() !== null
    if (hadSession && !hasSession) void router.navigate(LAUNCHER_PATH, { replace: true })
    hadSession = hasSession
  })
}
