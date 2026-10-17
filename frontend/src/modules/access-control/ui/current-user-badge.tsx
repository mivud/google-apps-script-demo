import { useI18n } from '../../../shared/i18n'
import { useSession } from './use-session'

// Content of the settings button in the app header: avatar initial on mobile, plus email and role from tablet width.
export function CurrentUserBadge() {
  const session = useSession()
  const { t } = useI18n()
  if (!session) return null

  return (
    <span className="current-user" title={session.email}>
      <span className="current-user-avatar" aria-hidden="true">{session.email.charAt(0).toUpperCase()}</span>
      <span className="current-user-text">
        <span className="visually-hidden">{t('settings.label')}: </span>
        <span className="current-user-email">{session.email}</span>
        <span className="current-user-role">{session.roles.join(', ')}</span>
      </span>
    </span>
  )
}
