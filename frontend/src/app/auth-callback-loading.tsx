import { Spinner } from '../shared/components/spinner'
import { useI18n } from '../shared/i18n'

// Shown while the redirect result is exchanged, before the router and the auth gate exist.
export function AuthCallbackLoading() {
  const { t } = useI18n()
  return (
    <main className="login-page">
      <p className="login-status"><Spinner label={t('auth.signingIn')} />{t('auth.signingIn')}</p>
    </main>
  )
}
