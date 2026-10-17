import { useState } from 'react'
import { AuditDetails } from '../../../../shared/components/audit-details'
import { ROLES_PATH } from '../../../../shared/identity-routes'
import { ClaimAssignment, type ClaimService } from '../../../claims'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { Badge } from '../../../../shared/components/badge'
import { ErrorState } from '../../../../shared/components/error-state'
import { ButtonRow } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import type { RoleService } from '../..'
import { RoleFormDialog } from '../components/role-form-dialog'
import { isBuiltInRole } from '../role-rules'

interface RoleDetailPageProps {
  id: string
  roles: RoleService
  claims: ClaimService
  onDeleted: () => void
}

export function RoleDetailPage({ id, roles, claims, onDeleted }: RoleDetailPageProps) {
  const { t } = useI18n()
  const detail = useAsyncData(() => roles.get(id), [roles, id])
  const [editing, setEditing] = useState(false)
  const remove = useDeleteAction({
    getName: (name: string) => name,
    remove: () => roles.remove(id),
    onDeleted,
  })
  const back = { to: ROLES_PATH, label: t('identity.roles.back') }
  const role = detail.data

  if (detail.error) {
    return <section><PageHeader back={back} /><ErrorState error={detail.error} onRetry={detail.reload} retrying={detail.loading} /></section>
  }
  if (!role) return <section><PageHeader back={back} /><ListSkeleton count={2} /></section>

  const builtIn = isBuiltInRole(role.name)
  return (
    <section>
      <div className={detail.loading ? 'is-refreshing' : undefined}>
        <RefreshIndicator active={detail.loading} />
        <PageHeader title={role.name} back={back} actions={builtIn ? <Badge>{t('identity.builtIn')}</Badge> : undefined} />
        <p>{role.description}</p>
        <AuditDetails audit={role} />

        <ButtonRow>
          <LoadingButton variant="outline" disabled={remove.pending} onClick={() => setEditing(true)}>{t('common.edit')}</LoadingButton>
          {!builtIn && <LoadingButton variant="destructive" disabled={remove.pending} onClick={() => remove.ask(role.name)}>{t('common.delete')}</LoadingButton>}
        </ButtonRow>

        <h2>{t('identity.roles.claims')}</h2>
        <ClaimAssignment
          claimService={claims}
          assigned={role.claims}
          onAdd={(claim) => roles.addClaim(id, claim)}
          onRemove={(claim) => roles.removeClaim(id, claim)}
          onChanged={detail.reload}
          onRefresh={detail.reload}
        />
      </div>

      {remove.dialog}
      {editing && (
        <RoleFormDialog
          initial={role}
          onSubmit={async (input) => {
            const updated = await roles.update(id, input, role.lastModified)
            detail.reload()
            return updated
          }}
          onRefresh={() => { detail.reload(); setEditing(false) }}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
