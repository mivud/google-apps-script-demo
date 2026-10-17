import type { Claim } from '../../../claims'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useI18n } from '../../../../shared/i18n'
import { Badge } from '../../../../shared/components/badge'
import { DescriptionList } from '../../../../shared/components/description-list'
import { ErrorState } from '../../../../shared/components/error-state'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import type { AccessPreviewService } from '../../index'

interface EffectiveAccessPanelProps {
  access: AccessPreviewService
  userId: string
  // Bump to recompute after the user's roles or claims changed.
  version: number
}

export function EffectiveAccessPanel({ access, userId, version }: EffectiveAccessPanelProps) {
  const { t } = useI18n()
  const preview = useAsyncData(() => access.preview(userId), [access, userId, version])
  const none = <span className="muted">{t('identity.access.none')}</span>

  if (preview.error) return <ErrorState error={preview.error} onRetry={preview.reload} retrying={preview.loading} />
  if (!preview.data) return <ListSkeleton count={2} />

  const { role, roles, claims } = preview.data
  return (
    <div className={preview.loading ? 'is-refreshing' : undefined}>
      <DescriptionList
        items={[
          { label: t('identity.access.primaryRole'), value: role ? <Badge tone="success">{role}</Badge> : none },
          { label: t('identity.access.roles'), value: roles.length ? roles.map((name) => <Badge key={name}>{name}</Badge>) : none },
          { label: t('identity.access.claims'), value: claims.length ? claims.map(renderClaim) : none },
        ]}
      />
    </div>
  )
}

function renderClaim(claim: Claim) {
  const label = `${claim.key}=${claim.value}`
  return <Badge key={label}>{label}</Badge>
}
