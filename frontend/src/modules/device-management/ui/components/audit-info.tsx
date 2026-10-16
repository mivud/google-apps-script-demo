import { DescriptionList } from '../../../../shared/components/description-list'
import { useI18n } from '../../../../shared/i18n'
import { formatDateTime } from '../labels'

interface AuditInfoProps {
  createdAt: string
  createdBy: string
  modifiedAt: string
  lastModifiedBy: string
}

export function AuditInfo({ createdAt, createdBy, modifiedAt, lastModifiedBy }: AuditInfoProps) {
  const { t, language } = useI18n()
  // Older rows may have no author recorded, so fall back to a neutral label.
  const person = (name: string) => name || t('audit.unknown')
  const time = (iso: string) => (iso ? formatDateTime(iso, language) : '-')

  return (
    <DescriptionList
      items={[
        { label: t('audit.createdAt'), value: time(createdAt) },
        { label: t('audit.createdBy'), value: person(createdBy) },
        { label: t('audit.modifiedAt'), value: time(modifiedAt) },
        { label: t('audit.lastModifiedBy'), value: person(lastModifiedBy) },
      ]}
    />
  )
}
