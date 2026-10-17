import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Spinner } from '../../../shared/components/spinner'
import { useI18n } from '../../../shared/i18n'
import type { AuthService } from '../application/auth-service'
import type { RedirectLogin } from '../application/redirect-token-source'
import { AuthContext, RedirectLoginContext, SignInButtonContext, useAuth, type RenderSignInButton } from './auth-context'
import { LoginPage } from './login-page'
import { useSession } from './use-session'

function GateContent({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { t } = useI18n()
  const session = useSession()
  const [checking, setChecking] = useState(() => auth.current() === null)
  const started = useRef(false)

  // Token lives in memory only, so every page load tries a silent Google re-login first.
  useEffect(() => {
    if (started.current || !checking) return
    started.current = true
    void auth.restoreSession().finally(() => setChecking(false))
  }, [auth, checking])

  if (session) return <>{children}</>
  if (checking) {
    return (
      <main className="login-page">
        <p className="login-status"><Spinner label={t('auth.checking')} />{t('auth.checking')}</p>
      </main>
    )
  }
  return <LoginPage />
}

interface AuthGateProps {
  auth: AuthService
  renderSignInButton: RenderSignInButton
  redirectLogin: RedirectLogin
  children: ReactNode
}

export function AuthGate({ auth, renderSignInButton, redirectLogin, children }: AuthGateProps) {
  return (
    <AuthContext.Provider value={auth}>
      <SignInButtonContext.Provider value={renderSignInButton}>
        <RedirectLoginContext.Provider value={redirectLogin}>
          <GateContent>{children}</GateContent>
        </RedirectLoginContext.Provider>
      </SignInButtonContext.Provider>
    </AuthContext.Provider>
  )
}
