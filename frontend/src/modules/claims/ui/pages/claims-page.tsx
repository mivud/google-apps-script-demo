import { useState } from 'react'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { SurfaceList, SurfaceListItem } from '../../../../shared/components/surface-list'
import type { Claim, ClaimService } from '../..'
import { ClaimFormDialog } from '../components/claim-form-dialog'
import { claimLabel, sortClaims } from '../claim-format'

export function ClaimsPage({ claims }: { claims: ClaimService }) {
  const { t } = useI18n()
  const list = useAsyncData(() => claims.list(), [claims])
  const [creating, setCreating] = useState(false)
  const remove = useDeleteAction({
    getName: claimLabel,
    remove: (claim: Claim) => claims.remove(claim),
    onDeleted: list.reload,
  })

  return (
    <section>
      <PageHeader
        title={t('identity.claims.title')}
        actions={<LoadingButton onClick={() => setCreating(true)} disabled={remove.pending}>{t('identity.claims.add')}</LoadingButton>}
      />
      {remove.dialog}
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('identity.claims.empty')} />
      ) : (
        <SurfaceList refreshing={list.loading}>
          {sortClaims(list.data).map((claim) => {
            const label = claimLabel(claim)
            return (
              <SurfaceListItem
                key={label}
                actions={
                  <LoadingButton variant="destructive" size="sm" disabled={remove.pending} aria-label={t('identity.claims.deleteNamed', { name: label })} onClick={() => remove.ask(claim)}>
                    {t('common.delete')}
                  </LoadingButton>
                }
              >
                <strong>{claim.key}</strong>
                <span className="muted"> = </span>
                <span>{claim.value}</span>
              </SurfaceListItem>
            )
          })}
        </SurfaceList>
      )}

      {creating && (
        <ClaimFormDialog
          onSubmit={async (claim) => {
            await claims.create(claim)
            list.reload()
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
