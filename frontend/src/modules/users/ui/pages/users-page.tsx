import { Link } from 'react-router'
import { useState } from 'react'
import { userPath } from '../../../../shared/identity-routes'
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
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { RowActions } from '../../../../shared/components/row-actions'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import type { User, UserService } from '../..'
import { UserFormDialog } from '../components/user-form-dialog'
import { roleNamesFor } from '../role-names'

export function UsersPage({ users, roles, canWrite }: { users: UserService; roles: RoleService; canWrite: boolean }) {
  const { t } = useI18n()
  const list = useAsyncData(() => users.list(), [users])
  // Role names are decoration; a failed roles load must not block the user list.
  const roleList = useAsyncData(() => roles.list(), [roles])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | undefined>(undefined)
  const remove = useDeleteAction({
    getName: (user: User) => user.email,
    remove: (user) => users.remove(user.id),
    onDeleted: () => list.reload(),
  })

  const columns: DataColumn<User>[] = [
    { key: 'email', header: t('identity.users.email'), primary: true, cell: (user) => <Link to={userPath(user.id)}>{user.email}</Link> },
    { key: 'active', header: t('identity.users.status'), cell: (user) => <Badge tone={user.active ? 'success' : 'neutral'}>{t(user.active ? 'identity.active' : 'identity.inactive')}</Badge> },
    {
      key: 'roles',
      header: t('identity.users.roles'),
      cell: (user) => {
        if (!roleList.data) return ''
        const names = roleNamesFor(user.roleIds, roleList.data)
        return names.length ? names.join(', ') : t('identity.users.noRoles')
      },
    },
    ...(canWrite ? [{ key: 'actions', header: t('common.actions'), cell: (user: User) => <RowActions itemName={user.email} disabled={remove.pending} onEdit={() => setEditing(user)} onDelete={() => remove.ask(user)} /> }] : []),
  ]

  return (
    <section>
      <PageHeader
        title={t('identity.users.title')}
        actions={canWrite ? <LoadingButton onClick={() => setCreating(true)}>{t('identity.users.add')}</LoadingButton> : undefined}
      />
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('identity.users.empty')} />
      ) : (
        <DataTable
          caption={t('identity.users.title')}
          columns={columns}
          rows={list.data}
          getRowKey={(user) => user.id}
          refreshing={list.loading}
        />
      )}
      {remove.dialog}

      {editing && (
        <UserFormDialog
          initial={editing}
          onSubmit={async (input) => {
            const updated = await users.update(editing.id, input, editing.lastModified)
            list.reload()
            return updated
          }}
          onRefresh={() => { list.reload(); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
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
