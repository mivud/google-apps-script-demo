import { useState } from 'react'
import type { Page } from '../../../../shared/page'
import { MAX_PAGE_SIZE } from '../../application/equipment-service'
import { EQUIPMENT_STATUSES, type Equipment } from '../../domain/equipment'
import { getDescendantIds } from '../../domain/category-tree'
import { useCanWriteDevices } from '../use-can-write-devices'
import { useCategories } from '../categories-context'
import { EquipmentFormDialog } from '../components/equipment-form-dialog'
import { EquipmentTable } from '../components/equipment-table'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useReloadAction } from '../../../../shared/hooks/use-reload-action'
import { useI18n } from '../../../../shared/i18n'
import { ALL_VALUE, type DataTableToolbar, type FilterDefinition } from '../../../../shared/table-filters'
import { STATUS_LABEL_KEYS, WARRANTY_LABEL_KEYS, getWarrantyStatus, localToday, type WarrantyStatus } from '../labels'
import { useServices } from '../services-context'

const WARRANTY_STATUSES: WarrantyStatus[] = ['active', 'expiring', 'expired']

export function EquipmentListPage() {
  const { equipment } = useServices()
  const { t } = useI18n()
  const canWrite = useCanWriteDevices()
  const categories = useCategories()
  const [adding, setAdding] = useState(false)

  // The whole list is loaded once (like expenses) so search and filters run in the browser.
  const list = useAsyncData(() => loadAllEquipment((query) => equipment.list(query)), [equipment])
  const reloadAction = useReloadAction(list)
  const rows = list.data
  // Read once per render so every row of one paint is judged against the same day.
  const today = localToday()

  const filters: FilterDefinition<Equipment>[] = [
    {
      key: 'category',
      label: t('equipment.categoryFilter'),
      kind: 'select',
      options: [{ value: ALL_VALUE, label: t('category.all') }, ...categories.flat.map(({ category, path }) => ({ value: category.id, label: path }))],
      // Selecting a parent includes its subcategories, like the server-side filter did.
      predicate: (item, value) => item.categoryId === value || getDescendantIds(categories.data ?? [], value).includes(item.categoryId),
    },
    {
      key: 'status',
      label: t('equipmentForm.status'),
      kind: 'select',
      options: [{ value: ALL_VALUE, label: t('equipment.allStatuses') }, ...EQUIPMENT_STATUSES.map((value) => ({ value, label: t(STATUS_LABEL_KEYS[value]) }))],
      predicate: (item, value) => item.status === value,
    },
    {
      key: 'warranty',
      label: t('warranty.filter'),
      kind: 'select',
      options: [{ value: ALL_VALUE, label: t('warranty.filter.all') }, ...WARRANTY_STATUSES.map((value) => ({ value, label: t(WARRANTY_LABEL_KEYS[value]) }))],
      predicate: (item, value) => getWarrantyStatus(item.warrantyExpiryDate, today) === value,
    },
  ]
  const toolbar: DataTableToolbar<Equipment> = {
    searchLabel: t('equipment.searchPlaceholder'),
    searchFields: (item) => [item.name, item.description, item.vendor ?? ''],
    filters,
    itemsName: t('equipment.items'),
    urlSync: true,
    exportFileName: 'equipment',
    actions: [reloadAction],
  }

  return (
    <section>
      <PageHeader
        title={t('equipment.title')}
        actions={canWrite ? <LoadingButton onClick={() => setAdding(true)}>{t('equipment.add')}</LoadingButton> : undefined}
      />

      <RefreshIndicator active={list.loading && !!rows} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !rows ? (
        <ListSkeleton count={4} />
      ) : rows.length === 0 ? (
        <EmptyState message={t('equipment.empty')} />
      ) : (
        <EquipmentTable items={rows} toolbar={toolbar} today={today} refreshing={list.loading} />
      )}

      {adding && (
        <EquipmentFormDialog
          onSubmit={async (input) => {
            const created = await equipment.create(input)
            list.reload()
            return created
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  )
}

// Pages through the service (its page size is capped) and returns rows ordered by modifiedAt DESC.
async function loadAllEquipment(listPage: (query: { page: number; pageSize: number }) => Promise<Page<Equipment>>): Promise<Equipment[]> {
  const items: Equipment[] = []
  for (let page = 1; ; page += 1) {
    const result = await listPage({ page, pageSize: MAX_PAGE_SIZE })
    items.push(...result.items)
    if (result.items.length === 0 || items.length >= result.total) break
  }
  return items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
}
