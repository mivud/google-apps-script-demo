import { useI18n } from '../i18n'

// Thin bar shown while data is refetched but stale content is still on screen.
export function RefreshIndicator({ active }: { active: boolean }) {
  const { t } = useI18n()
  if (!active) return null
  return <div className="progress-bar" role="progressbar" aria-label={t('common.refreshing')} />
}
