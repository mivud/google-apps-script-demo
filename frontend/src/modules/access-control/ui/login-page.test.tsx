// @vitest-environment jsdom
import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppearanceProvider } from '../../../shared/theme/appearance-provider'
import { renderApp, setupDomTests } from '../../../shared/testing/render-app'
import type { AuthService } from '../application/auth-service'
import { SignInAttemptStore } from '../application/sign-in-attempt-store'
import type { RedirectLogin } from '../application/redirect-token-source'
import { AuthContext, RedirectLoginContext, SignInButtonContext } from './auth-context'
import { LoginPage } from './login-page'

setupDomTests()

// jsdom has no matchMedia, which the color scheme provider reads for the system preference.
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
})

const redirectLogin: RedirectLogin = { begin: () => Promise.resolve(), consumeCallback: () => ({ status: 'none' }), clear: () => undefined }

function renderLoginPage() {
  const auth = { attempts: new SignInAttemptStore(), silentFailure: () => null } as unknown as AuthService
  return renderApp(
    <AppearanceProvider>
    <AuthContext.Provider value={auth}>
      <SignInButtonContext.Provider value={() => undefined}>
      <RedirectLoginContext.Provider value={redirectLogin}>
        <LoginPage />
      </RedirectLoginContext.Provider>
      </SignInButtonContext.Provider>
    </AuthContext.Provider>
    </AppearanceProvider>,
  )
}

describe('LoginPage settings', () => {
  it('offers language, color scheme and theme before sign-in', () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText('Language')).toBeTruthy()
    expect(screen.getByText('Appearance')).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: /theme|color/i })).toBeTruthy()
  })
})
