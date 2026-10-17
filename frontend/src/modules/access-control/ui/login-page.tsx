import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Button } from '../../../shared/components/button'
import { FormError } from '../../../shared/components/form-error'
import { Spinner } from '../../../shared/components/spinner'
import { ForbiddenError } from '../../../shared/errors'
import { RedirectLoginError } from '../domain/redirect-callback'
import { useI18n } from '../../../shared/i18n'
import type { MessageKey } from '../../../shared/i18n/en'
import type { SilentFailure } from '../application/id-token-source'
import { useAuth, useSignInButton } from './auth-context'
import { GoogleRedirectButton } from './google-redirect-button'

// Shown only when the automatic sign-in could not run; not an error, the button below still works.
const SILENT_HINT_KEYS = {
  unavailable: 'auth.silentUnavailable',
  timeout: 'auth.silentTimeout',
  load_error: 'auth.silentLoadError',
} as const satisfies Record<SilentFailure, MessageKey>

// A state mismatch hints at a tampered or stale callback; everything else is a plain failure.
function redirectFailureKey(error: RedirectLoginError): MessageKey {
  return error.code === 'state_mismatch' ? 'auth.redirectStateMismatch' : 'auth.redirectFailed'
}

export function LoginPage() {
  const auth = useAuth()
  const { t } = useI18n()
  const renderSignInButton = useSignInButton()
  const buttonRef = useRef<HTMLDivElement>(null)
  const attempt = useSyncExternalStore(
    (listener) => auth.attempts.subscribe(listener),
    () => auth.attempts.get(),
  )

  const renderButton = () => {
    if (buttonRef.current) renderSignInButton(buttonRef.current)
  }
  useEffect(renderButton, [renderSignInButton]) // eslint-disable-line react-hooks/exhaustive-deps

  function retry() {
    auth.attempts.clear()
    renderButton()
  }

  const silentFailure = auth.silentFailure()
  const failure = attempt.status === 'failed' ? attempt.error : undefined
  return (
    <main className="login-page">
      <section className="surface surface-pad login-card" aria-labelledby="login-title">
        <h1 id="login-title">{t('auth.title')}</h1>
        <p className="muted">{t('auth.description')}</p>
        {attempt.status === 'pending' && (
          <p className="login-status"><Spinner label={t('auth.signingIn')} />{t('auth.signingIn')}</p>
        )}
        {!failure && silentFailure && <p className="muted" role="status">{t(SILENT_HINT_KEYS[silentFailure])}</p>}
        {failure instanceof RedirectLoginError && <FormError message={t(redirectFailureKey(failure))} />}
        {failure instanceof ForbiddenError && <FormError message={t('auth.forbidden')} />}
        {failure && !(failure instanceof ForbiddenError) && !(failure instanceof RedirectLoginError) && <FormError message={t('auth.failed')} />}
        <div className="login-button" ref={buttonRef} hidden={attempt.status === 'pending'} />
        {attempt.status !== 'pending' && <GoogleRedirectButton emphasized={silentFailure !== null} />}
        {failure && !(failure instanceof ForbiddenError) && (
          <Button variant="outline" onClick={retry}>{t('common.retry')}</Button>
        )}
      </section>
    </main>
  )
}
