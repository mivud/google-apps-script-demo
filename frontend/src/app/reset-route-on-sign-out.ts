import type { AuthService } from '../modules/access-control'
import { LAUNCHER_PATH } from './launcher/app-route'

// Another user may sign in next, so they must not land on the previous user's deep link.
export function resetRouteOnSignOut(auth: AuthService): void {
  let hadSession = auth.current() !== null
  auth.subscribe(() => {
    const hasSession = auth.current() !== null
    if (hadSession && !hasSession) window.location.hash = `#${LAUNCHER_PATH}`
    hadSession = hasSession
  })
}
