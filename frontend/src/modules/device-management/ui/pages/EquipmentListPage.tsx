import { useState } from 'react'
import type { EquipmentStatus } from '../../domain/equipment'
import { EQUIPMENT_STATUSES } from '../../domain/equipment'
import { CategorySelect } from '../components/CategorySelect'
import { EquipmentFormDialog } from '../components/EquipmentFormDialog'
import { EquipmentTable } from '../components/EquipmentTable'
import { EmptyState } from '../../../../shared/components/EmptyState'
import { ErrorState } from '../../../../shared/components/ErrorState'
import { FilterBar } from '../../../../shared/components/Layout'
import { LoadingButton } from '../../../../shared/components/LoadingButton'
import { PageHeader } from '../../../../shared/components/PageHeader'
import { Pager } from '../../../../shared/components/Pager'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { Select } from '../../../../shared/components/Select'
import { TableSkeleton } from '../../../../shared/components/Skeleton'
import { RefreshIndicator } from '../../../../shared/components/RefreshIndicator'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useDebounced } from '../../../../shared/hooks/use-debounced'
import { useI18n } from '../../../../shared/i18n'
import { STATUS_LABEL_KEYS } from '../labels'
import { useServices } from '../services-context'

export function EquipmentListPage() {
  const { equipment } = useServices()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<EquipmentStatus | ''>('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)

  const debouncedSearch = useDebounced(search, 300)

  // Pending debounce means the visible results are already stale.
  const debouncing = search !== debouncedSearch

  const list = useAsyncData(
    () =>
      equipment.list({
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        status: status || undefined,
        page,
      }),
    [equipment, debouncedSearch, categoryId, status, page],
  )

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1

  const rangeStart = list.data ? (list.data.page - 1) * list.data.pageSize + 1 : 0

  // Any filter change returns to page 1 so the user never lands on an empty page.
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <section>
      <PageHeader
        title={t('equipment.title')}
        actions={<LoadingButton onClick={() => setAdding(true)}>{t('equipment.add')}</LoadingButton>}
      />

      <FilterBar>
        <SearchInput label={t('equipment.searchPlaceholder')} placeholder={t('equipment.searchPlaceholder')} value={search} onChange={(e) => withPageReset(setSearch)(e.target.value)} />
        <CategorySelect label={t('equipment.categoryFilter')} hideLabel value={categoryId} onChange={withPageReset(setCategoryId)} noneLabel={t('category.all')} />
        <Select label={t('equipmentForm.status')} hideLabel value={status} onChange={(e) => withPageReset(setStatus)(e.target.value as EquipmentStatus | '')}>
          <option value="">{t('equipment.allStatuses')}</option>
          {EQUIPMENT_STATUSES.map((value) => (
            <option key={value} value={value}>{t(STATUS_LABEL_KEYS[value])}</option>
          ))}
        </Select>
      </FilterBar>

      <RefreshIndicator active={(list.loading && !!list.data) || debouncing} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <TableSkeleton />
      ) : list.data.items.length === 0 ? (
        <EmptyState message={t('equipment.empty')} />
      ) : (
        <>
          <p className="muted" aria-live="polite">{t('common.showing', { from: rangeStart, to: rangeStart + list.data.items.length - 1, total: list.data.total })}</p>
          <EquipmentTable items={list.data.items} refreshing={list.loading || debouncing} />
        </>
      )}

      {list.data && totalPages > 1 && (
        <Pager page={page} totalPages={totalPages} onChange={setPage} disabled={list.loading} />
      )}

      {adding && (
        <EquipmentFormDialog
          onSubmit={async (input) => {
            const created = await equipment.create(input)
            // Page 1 holds the newest item (modifiedAt DESC); reload covers the case where page is already 1.
            setPage(1)
            list.reload()
            return created
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </section>
  )
}
