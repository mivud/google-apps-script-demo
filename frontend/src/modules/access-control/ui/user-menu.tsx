import { Button } from '../../../shared/components/button'
import { FormError } from '../../../shared/components/form-error'
import { useAsyncAction } from '../../../shared/hooks/use-async-action'
import { translateError, useI18n } from '../../../shared/i18n'
import { useAuth } from './auth-context'
import { useSession } from './use-session'

// Rendered inside the settings popover.
export function UserMenu() {
  const auth = useAuth()
  const session = useSession()
  const { t } = useI18n()
  const signOut = useAsyncAction(() => auth.signOut())
  if (!session) return null

  return (
    <div className="user-menu" role="group" aria-label={t('auth.account')}>
      <p className="user-menu-email">{session.email}</p>
      <p className="muted">{t(`auth.role.${session.role}`)}</p>
      {session.role === 'viewer' && <p className="muted">{t('auth.viewerReadOnly')}</p>}
      {signOut.error && <FormError message={translateError(signOut.error, t)} />}
      <Button variant="outline" loading={signOut.pending} onClick={() => signOut.run()}>{t('auth.signOut')}</Button>
    </div>
  )
}
