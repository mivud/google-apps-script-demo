import { createBrowserRouter } from 'react-router'
import type { AppDeps } from './app-deps'
import { Shell } from './shell'

// One catch-all route: the Shell owns app routing, so adding an app never touches the router.
// BASE_URL carries GitHub Pages' /<repo>/ prefix.
export function buildRouter(deps: AppDeps) {
  return createBrowserRouter([{ path: '*', element: <Shell deps={deps} /> }], { basename: import.meta.env.BASE_URL })
}
