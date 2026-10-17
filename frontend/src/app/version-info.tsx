import type { ReactNode } from 'react'
import { Button } from '../shared/components/button'
import { useAsyncData } from '../shared/hooks/use-async-data'
import { InlineSkeleton } from '../shared/components/skeleton'
import { useI18n } from '../shared/i18n'
import { FRONTEND_VERSION } from './app-version'

const NO_VALUE = '—'

interface VersionInfoProps {
  // Each app passes the backend row it can reach; an app without one shows the frontend version only.
  backend?: ReactNode
}

// Shown inside the settings popover, which mounts only when opened, so the backend is asked lazily.
export function VersionInfo({ backend }: VersionInfoProps) {
  const { t } = useI18n()
  return (
    <dl className="version-info" aria-label={t('version.label')}>
      <div>
        <dt>{t('version.frontend')}</dt>
        <dd>{FRONTEND_VERSION}</dd>
      </div>
      {backend !== undefined && (
        <div>
          <dt>{t('version.backend')}</dt>
          <dd>{backend}</dd>
        </div>
      )}
    </dl>
  )
}

interface BackendVersionValueProps {
  load: () => Promise<string | null>
}

// `load` must be stable (memoized by the caller), otherwise the value would reload on every render.
export function BackendVersionValue({ load }: BackendVersionValueProps) {
  const { t } = useI18n()
  const backend = useAsyncData(load, [load])
  if (backend.loading && backend.data === undefined) return <InlineSkeleton />
  if (backend.error) {
    return (
      <>
        {NO_VALUE}
        <Button variant="link" size="sm" loading={backend.loading} onClick={backend.reload}>{t('common.retry')}</Button>
      </>
    )
  }
  return <>{backend.data ?? NO_VALUE}</>
}
