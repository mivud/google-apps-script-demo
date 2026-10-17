import { Button } from '../../../shared/components/button'
import { FormError } from '../../../shared/components/form-error'
import { useAsyncAction } from '../../../shared/hooks/use-async-action'
import { useI18n } from '../../../shared/i18n'
import { useRedirectLogin } from './auth-context'

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
      <Button variant={emphasized ? 'outline' : 'ghost'} loading={begin.pending} onClick={() => void begin.run()}>
        {t('auth.redirectSignIn')}
      </Button>
      {begin.error && <FormError message={t('auth.redirectFailed')} />}
    </div>
  )
}
