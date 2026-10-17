import { useState } from 'react'
import { roleHref } from '../../../../shared/identity-routes'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { Badge } from '../../../../shared/components/badge'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { SurfaceList, SurfaceListItem } from '../../../../shared/components/surface-list'
import type { RoleService } from '../..'
import { RoleFormDialog } from '../components/role-form-dialog'
import { isBuiltInRole } from '../role-rules'

export function RolesPage({ roles }: { roles: RoleService }) {
  const { t } = useI18n()
  const list = useAsyncData(() => roles.list(), [roles])
  const [creating, setCreating] = useState(false)

  return (
    <section>
      <PageHeader
        title={t('identity.roles.title')}
        actions={<LoadingButton onClick={() => setCreating(true)}>{t('identity.roles.add')}</LoadingButton>}
      />
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('identity.roles.empty')} />
      ) : (
        <SurfaceList refreshing={list.loading}>
          {list.data.map((role) => (
            <SurfaceListItem key={role.id}>
              <a href={roleHref(role.id)}><strong>{role.name}</strong></a>{' '}
              {isBuiltInRole(role.name) && <Badge>{t('identity.builtIn')}</Badge>}{' '}
              <span className="muted">{t('identity.roles.claimCount', { count: role.claims.length })}</span>
              {role.description && <p>{role.description}</p>}
            </SurfaceListItem>
          ))}
        </SurfaceList>
      )}

      {creating && (
        <RoleFormDialog
          onSubmit={async (input) => {
            const created = await roles.create(input)
            list.reload()
            return created
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
