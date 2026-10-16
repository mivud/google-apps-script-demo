import { Button } from '../shared/components/button'
import { useAsyncData } from '../shared/hooks/use-async-data'
import { InlineSkeleton } from '../shared/components/skeleton'
import { useI18n } from '../shared/i18n'
import { useServices } from '../modules/device-management'
import { FRONTEND_VERSION } from './app-version'

const NO_VALUE = '—'

// Shown inside the settings popover, which mounts only when opened, so the backend is asked lazily.
export function VersionInfo() {
  const { t } = useI18n()
  const { systemInfo } = useServices()
  const backend = useAsyncData(() => systemInfo.getBackendVersion(), [systemInfo])

  return (
    <dl className="version-info" aria-label={t('version.label')}>
      <div>
        <dt>{t('version.frontend')}</dt>
        <dd>{FRONTEND_VERSION}</dd>
      </div>
      <div>
        <dt>{t('version.backend')}</dt>
        <dd>
          {backend.loading && backend.data === undefined ? (
            <InlineSkeleton />
          ) : backend.error ? (
            <>
              {NO_VALUE}
              <Button variant="link" size="sm" loading={backend.loading} onClick={backend.reload}>{t('common.retry')}</Button>
            </>
          ) : (
            backend.data ?? NO_VALUE
          )}
        </dd>
      </div>
    </dl>
  )
}
