import { useMemo } from 'react'
import { AssignmentPanel } from '../../../../shared/components/assignment-panel'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { ErrorState } from '../../../../shared/components/error-state'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import type { Claim, ClaimService } from '../..'
import { claimLabel, parseClaimLabel, sortClaims, unassignedClaims } from '../claim-format'

interface ClaimAssignmentProps {
  claimService: ClaimService
  assigned: Claim[]
  onAdd: (claim: Claim) => Promise<unknown>
  onRemove: (claim: Claim) => Promise<unknown>
  onRefresh?: () => void
}

// Claims can only be assigned from the catalog, so the picker lists existing claims.
export function ClaimAssignment({ claimService, assigned, onAdd, onRemove, onRefresh }: ClaimAssignmentProps) {
  const { t } = useI18n()
  const catalog = useAsyncData(() => claimService.list(), [claimService])
  const items = useMemo(() => sortClaims(assigned).map((claim) => ({ id: claimLabel(claim), label: claimLabel(claim) })), [assigned])
  const options = useMemo(
    () => unassignedClaims(catalog.data ?? [], assigned).map((claim) => ({ id: claimLabel(claim), label: claimLabel(claim) })),
    [catalog.data, assigned],
  )

  if (catalog.error) return <ErrorState error={catalog.error} onRetry={catalog.reload} retrying={catalog.loading} />
  if (!catalog.data) return <ListSkeleton count={2} />

  // Labels always come from our own options/items, so parsing cannot fail; the guard keeps types honest.
  const withClaim = (action: (claim: Claim) => Promise<unknown>) => async (id: string) => {
    const claim = parseClaimLabel(id)
    if (claim) await action(claim)
  }

  return (
    <AssignmentPanel
      items={items}
      options={options}
      emptyMessage={t('identity.claims.assignedEmpty')}
      selectLabel={t('identity.claims.choose')}
      onAdd={withClaim(onAdd)}
      onRemove={withClaim(onRemove)}
      onRefresh={onRefresh}
    />
  )
}
