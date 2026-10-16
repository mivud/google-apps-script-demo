import { useI18n } from '../i18n'

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <span className="spinner" role="status">
      <span className="visually-hidden">{label ?? t('common.loading')}</span>
    </span>
  )
}
