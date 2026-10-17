import { useState, type ReactNode } from 'react'
import { ActionError } from '../../../../shared/components/action-error'
import { AuditDetails } from '../../../../shared/components/audit-details'
import { USERS_PATH } from '../../../../shared/identity-routes'
import { ClaimAssignment, type ClaimService } from '../../../claims'
import type { RoleService } from '../../../roles'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { Badge } from '../../../../shared/components/badge'
import { ErrorState } from '../../../../shared/components/error-state'
import { GlassSurface } from '../../../../shared/components/glass-surface'
import { ButtonRow } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import type { UserService } from '../..'
import { UserFormDialog } from '../components/user-form-dialog'
import { UserRolesPanel } from '../components/user-roles-panel'

interface UserDetailPageProps {
  id: string
  users: UserService
  roles: RoleService
  claims: ClaimService
  // Rendered by the shell so users does not depend on access-control; version changes after each edit.
  renderAccess: (version: number) => ReactNode
  onDeleted: () => void
  canWrite: boolean
}

export function UserDetailPage({ id, users, roles, claims, renderAccess, onDeleted, canWrite }: UserDetailPageProps) {
  const { t } = useI18n()
  const detail = useAsyncData(() => users.get(id), [users, id])
  const roleList = useAsyncData(() => roles.list(), [roles])
  const [editing, setEditing] = useState(false)
  // Bumped after every change so the effective access panel recomputes.
  const [version, setVersion] = useState(0)
  const user = detail.data

  const changed = () => { setVersion((v) => v + 1); detail.reload() }
  const remove = useDeleteAction({
    getName: (target: string) => target,
    remove: () => users.remove(id),
    onDeleted,
  })
  const toggleActive = useAsyncAction(async () => {
    if (!user) return
    await users.update(id, { email: user.email, active: !user.active }, user.lastModified)
    changed()
  })

  const back = { to: USERS_PATH, label: t('identity.users.back') }
  if (detail.error) {
    return <section><PageHeader back={back} /><ErrorState error={detail.error} onRetry={detail.reload} retrying={detail.loading} /></section>
  }
  if (!user) return <section><PageHeader back={back} /><ListSkeleton count={2} /></section>

  const busy = remove.pending || toggleActive.pending
  return (
    <section>
      <div className={detail.loading ? 'is-refreshing' : undefined}>
        <RefreshIndicator active={detail.loading} />
        <PageHeader
          title={user.email}
          back={back}
          actions={<Badge tone={user.active ? 'success' : 'neutral'}>{t(user.active ? 'identity.active' : 'identity.inactive')}</Badge>}
        />
        <GlassSurface className="detail-card">
          <AuditDetails audit={user} />

          {canWrite && <ButtonRow>
            <LoadingButton variant="outline" disabled={busy} onClick={() => setEditing(true)}>{t('common.edit')}</LoadingButton>
            <LoadingButton variant="outline" loading={toggleActive.pending} disabled={remove.pending} onClick={() => toggleActive.run()}>
              {t(user.active ? 'identity.deactivate' : 'identity.activate')}
            </LoadingButton>
            <LoadingButton variant="destructive" disabled={busy} onClick={() => remove.ask(user.email)}>{t('common.delete')}</LoadingButton>
          </ButtonRow>}
          <ActionError error={toggleActive.error} onRefresh={detail.reload} />

          <hr className="card-divider" />
          <h2>{t('identity.access.title')}</h2>
          {renderAccess(version)}
        </GlassSurface>

        <GlassSurface className="detail-card">
          <h2>{t('identity.users.roles')}</h2>
          {roleList.error ? (
            <ErrorState error={roleList.error} onRetry={roleList.reload} retrying={roleList.loading} />
          ) : !roleList.data ? (
            <ListSkeleton count={2} />
          ) : (
            <UserRolesPanel
              user={user}
              roles={roleList.data}
              onAssign={(roleId) => users.assignRole(id, roleId)}
              onUnassign={(roleId) => users.unassignRole(id, roleId)}
              onChanged={changed}
              onRefresh={detail.reload}
              readOnly={!canWrite}
            />
          )}
        </GlassSurface>

        <GlassSurface className="detail-card">
          <h2>{t('identity.users.claims')}</h2>
          <p className="muted">{t('identity.users.claimsHint')}</p>
          <ClaimAssignment
            claimService={claims}
            assigned={user.claims}
            onAdd={(claim) => users.addClaim(id, claim)}
            onRemove={(claim) => users.removeClaim(id, claim)}
            onChanged={changed}
            onRefresh={detail.reload}
            readOnly={!canWrite}
          />
        </GlassSurface>
      </div>

      {remove.dialog}
      {editing && (
        <UserFormDialog
          initial={user}
          onSubmit={async (input) => {
            const updated = await users.update(id, input, user.lastModified)
            changed()
            return updated
          }}
          onRefresh={() => { detail.reload(); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
