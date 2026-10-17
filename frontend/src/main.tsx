import { StrictMode } from 'react'
import { RouterProvider } from 'react-router'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/controls.css'
import './styles/components.css'
import { buildAuth } from './app/build-auth'
import { buildSupabaseClient } from './app/build-supabase-client'
import { consumeAuthCallback } from './app/consume-auth-callback'
import { readEnv } from './app/env'
import { resetRouteOnSignOut } from './app/reset-route-on-sign-out'
import { buildRouter } from './app/router'
import { StartupError } from './app/startup-error'
import { AuthGate } from './modules/access-control'
import { ErrorBoundary } from './shared/components/error-boundary'
import { I18nProvider } from './shared/i18n'
import { AppearanceProvider } from './shared/theme'
import { ToastProvider } from './shared/toast'

const root = createRoot(document.getElementById('root')!)
async function start() {
  try {
    // Built once; both throw ConfigError on missing env so the startup error page shows.
    const env = readEnv(import.meta.env)
    const supabase = buildSupabaseClient(env)
    const runtime = buildAuth(env, supabase)
    const { auth, renderSignInButton, redirectLogin } = runtime
    // Before the router and the gate exist, so a redirect result is exchanged before any silent restore starts.
    await consumeAuthCallback(runtime, window)
    const router = buildRouter({ auth, env, supabase })
    resetRouteOnSignOut(auth, router)
    root.render(
      <StrictMode>
        <AppearanceProvider>
          <I18nProvider>
            <ToastProvider>
              <ErrorBoundary>
                <AuthGate auth={auth} renderSignInButton={renderSignInButton} redirectLogin={redirectLogin}>
                  <RouterProvider router={router} />
                </AuthGate>
              </ErrorBoundary>
            </ToastProvider>
          </I18nProvider>
        </AppearanceProvider>
      </StrictMode>,
    )
  } catch (error) {
    // Misconfiguration (missing env vars) is shown instead of a blank page; details stay in the console only.
    console.error(error)
    root.render(
      <AppearanceProvider>
        <I18nProvider>
          <StartupError />
        </I18nProvider>
      </AppearanceProvider>,
    )
  }
}

void start()
