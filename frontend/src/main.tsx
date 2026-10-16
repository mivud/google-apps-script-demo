import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/themes.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/controls.css'
import './styles/components.css'
import App from './app/App.tsx'
import { buildServices } from './app/build-services'
import { StartupError } from './app/StartupError'
import { CategoriesProvider, ServicesProvider } from './modules/device-management'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { I18nProvider } from './shared/i18n'
import { AppearanceProvider } from './shared/theme'

const root = createRoot(document.getElementById('root')!)

try {
  root.render(
    <StrictMode>
      <AppearanceProvider>
        <I18nProvider>
          <ErrorBoundary>
            <ServicesProvider services={buildServices()}>
              <CategoriesProvider>
                <App />
              </CategoriesProvider>
            </ServicesProvider>
          </ErrorBoundary>
        </I18nProvider>
      </AppearanceProvider>
    </StrictMode>,
  )
} catch (error) {
  // Misconfiguration (missing env vars) is shown instead of a blank page.
  root.render(
    <AppearanceProvider>
      <I18nProvider>
        <StartupError error={error} />
      </I18nProvider>
    </AppearanceProvider>,
  )
}
