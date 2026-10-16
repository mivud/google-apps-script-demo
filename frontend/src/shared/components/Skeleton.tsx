import { useI18n } from '../i18n'
import { GlassSurface } from './GlassSurface'

export function TableSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-busy="true">
      <span className="visually-hidden">{t('common.loading')}</span>
      <GlassSurface className="skeleton-table" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div className="skeleton skeleton-table-row" key={index} />
        ))}
      </GlassSurface>
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-busy="true">
      <span className="visually-hidden">{t('common.loading')}</span>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton skeleton-row" key={index} aria-hidden="true" />
      ))}
    </div>
  )
}

// Inline placeholder for a value that is still loading inside text.
export function InlineSkeleton() {
  const { t } = useI18n()
  return <span className="skeleton skeleton-inline" role="status" aria-label={t('common.loading')} />
}
