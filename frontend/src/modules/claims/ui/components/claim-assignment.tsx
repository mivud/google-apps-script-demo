import { useMemo } from 'react'
import { applyAssignmentChange, type AssignmentChange } from '../../../../shared/assignment-change'
import { AssignmentPanel } from '../../../../shared/components/assignment-panel'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { ErrorState } from '../../../../shared/components/error-state'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import type { Claim, ClaimService } from '../..'
import { claimLabel, parseClaimLabel, sortClaims } from '../claim-format'

interface ClaimAssignmentProps {
  claimService: ClaimService
  assigned: Claim[]
  onAdd: (claim: Claim) => Promise<unknown>
  onRemove: (claim: Claim) => Promise<unknown>
  // Called after a save, also when it stopped half way, so the page shows the real state.
  onChanged: () => void
  onRefresh?: () => void
  readOnly?: boolean
}

// Claims can only be assigned from the catalog, so the checklist lists every existing claim.
export function ClaimAssignment({ claimService, assigned, onAdd, onRemove, onChanged, onRefresh, readOnly }: ClaimAssignmentProps) {
  const { t } = useI18n()
  const catalog = useAsyncData(() => claimService.list(), [claimService])
  const assignedIds = useMemo(() => assigned.map(claimLabel), [assigned])
  // An assigned claim missing from the catalog still shows (checked) so it can be unchecked.
  const options = useMemo(
    () => sortClaims([...(catalog.data ?? []), ...assigned.filter((a) => !(catalog.data ?? []).some((c) => claimLabel(c) === claimLabel(a)))]).map((claim) => ({ id: claimLabel(claim), label: claimLabel(claim) })),
    [catalog.data, assigned],
  )

  if (catalog.error) return <ErrorState error={catalog.error} onRetry={catalog.reload} retrying={catalog.loading} />
  if (!catalog.data) return <ListSkeleton count={2} />

  // Labels always come from our own options, so parsing cannot fail; the guard keeps types honest.
  const withClaim = (action: (claim: Claim) => Promise<unknown>) => async (id: string) => {
    const claim = parseClaimLabel(id)
    if (claim) await action(claim)
  }
  const save = (change: AssignmentChange) => applyAssignmentChange(change, withClaim(onAdd), withClaim(onRemove), onChanged)

  return (
    <AssignmentPanel
      options={options}
      assignedIds={assignedIds}
      emptyMessage={t('identity.claims.catalogEmpty')}
      legend={t('identity.claims.title')}
      onSave={save}
      onRefresh={onRefresh}
      readOnly={readOnly}
    />
  )
}
