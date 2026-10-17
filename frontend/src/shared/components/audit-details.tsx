import type { Audit } from '../audit'
import { DescriptionList } from './description-list'
import { useI18n } from '../i18n'

export function AuditDetails({ audit }: { audit: Audit }) {
  const { t, language } = useI18n()
  const person = (name: string) => name || t('audit.unknown')
  const time = (iso: string) => {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso || '-' : date.toLocaleString(language)
  }
  return (
    <DescriptionList
      items={[
        { label: t('audit.createdAt'), value: time(audit.created) },
        { label: t('audit.createdBy'), value: person(audit.createdBy) },
        { label: t('audit.modifiedAt'), value: time(audit.lastModified) },
        { label: t('audit.lastModifiedBy'), value: person(audit.lastModifiedBy) },
      ]}
    />
  )
}
