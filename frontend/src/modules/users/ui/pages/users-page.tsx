import { useState } from 'react'
import { userHref } from '../../../../shared/identity-routes'
import type { RoleService } from '../../../roles'
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
import type { UserService } from '../..'
import { UserFormDialog } from '../components/user-form-dialog'
import { roleNamesFor } from '../role-names'

export function UsersPage({ users, roles }: { users: UserService; roles: RoleService }) {
  const { t } = useI18n()
  const list = useAsyncData(() => users.list(), [users])
  // Role names are decoration; a failed roles load must not block the user list.
  const roleList = useAsyncData(() => roles.list(), [roles])
  const [creating, setCreating] = useState(false)

  return (
    <section>
      <PageHeader
        title={t('identity.users.title')}
        actions={<LoadingButton onClick={() => setCreating(true)}>{t('identity.users.add')}</LoadingButton>}
      />
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('identity.users.empty')} />
      ) : (
        <SurfaceList refreshing={list.loading}>
          {list.data.map((user) => {
            const names = roleNamesFor(user.roleIds, roleList.data ?? [])
            return (
              <SurfaceListItem key={user.id}>
                <a href={userHref(user.id)}><strong>{user.email}</strong></a>{' '}
                <Badge tone={user.active ? 'success' : 'neutral'}>{t(user.active ? 'identity.active' : 'identity.inactive')}</Badge>
                <p className="muted">{roleList.data ? (names.length ? names.join(', ') : t('identity.users.noRoles')) : ''}</p>
              </SurfaceListItem>
            )
          })}
        </SurfaceList>
      )}

      {creating && (
        <UserFormDialog
          onSubmit={async (input) => {
            const created = await users.create({ ...input, roleIds: [] })
            list.reload()
            return created
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
