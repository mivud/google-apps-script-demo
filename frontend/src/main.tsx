import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/controls.css'
import './styles/components.css'
import { buildAuth } from './app/build-auth'
import { buildSupabaseClient } from './app/build-supabase-client'
import { readEnv } from './app/env'
import { resetRouteOnSignOut } from './app/reset-route-on-sign-out'
import { Shell } from './app/shell'
import { StartupError } from './app/startup-error'
import { AuthGate } from './modules/access-control'
import { ErrorBoundary } from './shared/components/error-boundary'
import { I18nProvider } from './shared/i18n'
import { AppearanceProvider } from './shared/theme'
import { ToastProvider } from './shared/toast'

const root = createRoot(document.getElementById('root')!)

try {
  // Built once; both throw ConfigError on missing env so the startup error page shows.
  const env = readEnv(import.meta.env)
  const supabase = buildSupabaseClient(env)
  const { auth, renderSignInButton } = buildAuth(env, supabase)
  resetRouteOnSignOut(auth)
  root.render(
    <StrictMode>
      <AppearanceProvider>
        <I18nProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AuthGate auth={auth} renderSignInButton={renderSignInButton}>
                <Shell deps={{ auth, env, supabase }} />
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
