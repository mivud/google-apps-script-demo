import { Link } from 'react-router'
import { useState } from 'react'
import { rolePath } from '../../../../shared/identity-routes'
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
import type { Role, RoleService } from '../..'
import { RoleFormDialog } from '../components/role-form-dialog'
import { isBuiltInRole } from '../role-rules'

export function RolesPage({ roles }: { roles: RoleService }) {
  const { t } = useI18n()
  const list = useAsyncData(() => roles.list(), [roles])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Role | undefined>(undefined)
  const remove = useDeleteAction({
    getName: (role: Role) => role.name,
    remove: (role) => roles.remove(role.id),
    onDeleted: () => list.reload(),
  })

  const columns: DataColumn<Role>[] = [
    { key: 'name', header: t('identity.roles.name'), primary: true, cell: (role) => <Link to={rolePath(role.id)}>{role.name}</Link> },
    { key: 'builtIn', header: t('identity.roles.type'), cell: (role) => (isBuiltInRole(role.name) ? <Badge>{t('identity.builtIn')}</Badge> : '') },
    { key: 'claims', header: t('identity.roles.claimsColumn'), cell: (role) => t('identity.roles.claimCount', { count: role.claims.length }) },
    { key: 'description', header: t('identity.roles.description'), cell: (role) => role.description },
    { key: 'actions', header: t('common.actions'), cell: (role) => <RowActions itemName={role.name} disabled={remove.pending} onEdit={() => setEditing(role)} onDelete={(isBuiltInRole(role.name) ? undefined : () => remove.ask(role))} /> },
  ]

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
        <DataTable
          caption={t('identity.roles.title')}
          columns={columns}
          rows={list.data}
          getRowKey={(role) => role.id}
          refreshing={list.loading}
        />
      )}
      {remove.dialog}

      {editing && (
        <RoleFormDialog
          initial={editing}
          onSubmit={async (input) => {
            const updated = await roles.update(editing.id, input, editing.lastModified)
            list.reload()
            return updated
          }}
          onRefresh={() => { list.reload(); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
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
