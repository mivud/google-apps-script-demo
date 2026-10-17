import { Button } from '../../../shared/components/button'
import { FormError } from '../../../shared/components/form-error'
import { useAsyncAction } from '../../../shared/hooks/use-async-action'
import { useI18n } from '../../../shared/i18n'
import { useRedirectLogin } from './auth-context'

// Official four-colour mark, drawn inline so no external image is loaded.
function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

interface GoogleRedirectButtonProps {
  // Drawn attention when the automatic sign-in already failed.
  emphasized?: boolean
}

// Fallback when One Tap / the Google button cannot work (blocked third-party sign-in, dismissed prompt).
export function GoogleRedirectButton({ emphasized = false }: GoogleRedirectButtonProps) {
  const redirectLogin = useRedirectLogin()
  const { t } = useI18n()
  const begin = useAsyncAction(() => redirectLogin.begin())

  return (
    <div className="login-redirect">
      {emphasized && <p className="muted" role="status">{t('auth.redirectHint')}</p>}
      <Button variant="outline" className="btn-google" loading={begin.pending} onClick={() => void begin.run()}>
        <GoogleLogo />
        {t('auth.redirectSignIn')}
      </Button>
      {begin.error && <FormError message={t('auth.redirectFailed')} />}
    </div>
  )
}
