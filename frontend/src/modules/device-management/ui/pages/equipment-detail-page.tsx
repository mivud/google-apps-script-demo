import { useState } from 'react'
import { useCanWrite } from '../../../access-control'
import { EquipmentFormDialog } from '../components/equipment-form-dialog'
import { AuditInfo } from '../components/audit-info'
import { EquipmentCategoryLine, EquipmentQuantityLine } from '../components/equipment-meta'
import { Badge } from '../../../../shared/components/badge'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { FormError } from '../../../../shared/components/form-error'
import { ButtonRow } from '../../../../shared/components/layout'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { SurfaceList, SurfaceListItem } from '../../../../shared/components/surface-list'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { MaintenanceForm } from '../components/maintenance-form'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { translateError, useI18n } from '../../../../shared/i18n'
import { MAINTENANCE_LABEL_KEYS, STATUS_LABEL_KEYS, STATUS_TONES, formatDate } from '../labels'
import { DEVICES_PATH } from '../navigation'
import { useServices } from '../services-context'

interface EquipmentDetailPageProps {
  id: string
  onDeleted: () => void
}

export function EquipmentDetailPage({ id, onDeleted }: EquipmentDetailPageProps) {
  const { equipment, maintenance } = useServices()
  const { t, language } = useI18n()
  const canWrite = useCanWrite()
  const detail = useAsyncData(() => equipment.get(id), [equipment, id])
  const logs = useAsyncData(() => maintenance.listByEquipment(id), [maintenance, id])
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const remove = useAsyncAction(async () => {
    await equipment.remove(id)
    onDeleted()
  })

  const backToList = { href: `#${DEVICES_PATH}`, label: t('equipment.backToList') }

  return (
    <section>
      {detail.error ? (
        <>
          <PageHeader back={backToList} />
          <ErrorState error={detail.error} onRetry={detail.reload} retrying={detail.loading} />
        </>
      ) : !detail.data ? (
        <>
          <PageHeader back={backToList} />
          <ListSkeleton count={2} />
        </>
      ) : (
        <>
        <div className={detail.loading ? 'is-refreshing' : undefined}>
          <RefreshIndicator active={detail.loading} />
          <PageHeader
            title={detail.data.name}
            back={backToList}
            actions={<Badge tone={STATUS_TONES[detail.data.status]}>{t(STATUS_LABEL_KEYS[detail.data.status])}</Badge>}
          />
          <EquipmentCategoryLine categoryId={detail.data.categoryId} />
          <p>{detail.data.description || t('equipment.noDescription')}</p>
          <EquipmentQuantityLine quantity={detail.data.quantity} />
          <AuditInfo
            createdAt={detail.data.createdAt}
            createdBy={detail.data.createdBy}
            modifiedAt={detail.data.modifiedAt}
            lastModifiedBy={detail.data.lastModifiedBy}
          />

          {canWrite && <ButtonRow>
            <LoadingButton variant="outline" onClick={() => setEditing(true)} disabled={remove.pending}>{t('common.edit')}</LoadingButton>
            {confirmingDelete ? (
              <>
                <LoadingButton variant="destructive" loading={remove.pending} onClick={() => remove.run()}>{t('common.confirmDelete')}</LoadingButton>
                <LoadingButton variant="outline" disabled={remove.pending} onClick={() => setConfirmingDelete(false)}>{t('common.cancel')}</LoadingButton>
              </>
            ) : (
              <LoadingButton variant="destructive" onClick={() => setConfirmingDelete(true)}>{t('common.delete')}</LoadingButton>
            )}
          </ButtonRow>}
          {remove.error && <FormError message={translateError(remove.error, t)} />}

          <h2>{t('maintenance.history')}</h2>
          <RefreshIndicator active={logs.loading && !!logs.data} />
          {logs.error ? (
            <ErrorState error={logs.error} onRetry={logs.reload} retrying={logs.loading} />
          ) : !logs.data ? (
            <ListSkeleton />
          ) : logs.data.length === 0 ? (
            <EmptyState message={t('maintenance.empty')} />
          ) : (
            <SurfaceList refreshing={logs.loading}>
              {logs.data.map((log) => (
                <SurfaceListItem key={log.id}>
                  <strong>{t(MAINTENANCE_LABEL_KEYS[log.type])}</strong>
                  <span className="muted"> &middot; {formatDate(log.performedAt, language)}</span>
                  {log.note && <p>{log.note}</p>}
                </SurfaceListItem>
              ))}
            </SurfaceList>
          )}

          {canWrite && (
            <MaintenanceForm
              equipmentId={id}
              onSubmit={(input) => maintenance.add(input)}
              onSaved={logs.reload}
            />
          )}

        </div>
          {editing && (
            <EquipmentFormDialog
              initial={detail.data}
              onSubmit={async (input) => {
                const updated = await equipment.update(id, input)
                detail.reload()
                return updated
              }}
              onClose={() => setEditing(false)}
            />
          )}
        </>
      )}
    </section>
  )
}
