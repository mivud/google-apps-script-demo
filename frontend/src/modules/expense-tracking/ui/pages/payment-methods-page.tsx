import { useState } from 'react'
import { useAsyncData } from '../../../../shared/hooks/use-async-data'
import { useDeleteAction } from '../../../../shared/hooks/use-delete-action'
import { useI18n } from '../../../../shared/i18n'
import { Badge } from '../../../../shared/components/badge'
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { RowActions } from '../../../../shared/components/row-actions'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { useReloadAction } from '../../../../shared/hooks/use-reload-action'
import { ALL_VALUE, type DataTableToolbar, type FilterDefinition } from '../../../../shared/table-filters'
import type { CSSProperties } from 'react'
import { PaymentMethodBadge } from '../components/payment-method-badge'
import { cycleStartDay, type PaymentMethod } from '../../domain/payment-method'
import { PaymentMethodFormDialog } from '../components/payment-method-form-dialog'
import { useExpenseTrackingServices } from '../services-context'
import { useCanWriteExpenses } from '../use-can-write-expenses'

export function PaymentMethodsPage() {
  const { paymentMethods } = useExpenseTrackingServices()
  const { t } = useI18n()
  const canWrite = useCanWriteExpenses()
  const list = useAsyncData(() => paymentMethods.list(), [paymentMethods])
  const reloadAction = useReloadAction(list)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PaymentMethod | undefined>(undefined)
  const remove = useDeleteAction({
    getName: (method: PaymentMethod) => method.name,
    remove: (method) => paymentMethods.remove(method.id),
    onDeleted: () => list.reload(),
  })

  const columns: DataColumn<PaymentMethod>[] = [
    { key: 'name', header: t('expense.methods.name'), primary: true, cell: (s) => <PaymentMethodBadge name={s.name} color={s.color} />, exportValue: (s) => s.name },
    { key: 'color', header: t('expense.methods.color'), cell: (s) => (s.color === null ? '—' : <span className="color-chip"><span className="swatch-chip swatch-small" style={{ '--pm-color': s.color } as CSSProperties} aria-hidden="true" /><span>{s.color}</span></span>), exportValue: (s) => s.color ?? '' },
    { key: 'cycle', header: t('expense.methods.cycle'), cell: (s) => (s.statementClosingDay === null ? t('expense.methods.calendarMonth') : t('expense.methods.cycleRange', { from: cycleStartDay(s.statementClosingDay), to: s.statementClosingDay })), exportValue: (s) => (s.statementClosingDay === null ? t('expense.methods.calendarMonth') : t('expense.methods.cycleRange', { from: cycleStartDay(s.statementClosingDay), to: s.statementClosingDay })) },
    { key: 'status', header: t('expense.status'), cell: (s) => <Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? t('expense.active') : t('expense.inactive')}</Badge>, exportValue: (s) => (s.active ? t('expense.active') : t('expense.inactive')) },
    ...(canWrite ? [{ key: 'actions', header: t('common.actions'), align: 'end' as const, cell: (s: PaymentMethod) => <RowActions itemName={s.name} disabled={remove.pending} onEdit={() => setEditing(s)} onDelete={() => remove.ask(s)} /> }] : []),
  ]

  const filters: FilterDefinition<PaymentMethod>[] = [
    { key: 'status', label: t('expense.status'), kind: 'radio', options: [{ value: ALL_VALUE, label: t('expense.filter.allStatuses') }, { value: 'active', label: t('expense.active') }, { value: 'inactive', label: t('expense.inactive') }], predicate: (m, v) => m.active === (v === 'active') },
    { key: 'cycle', label: t('expense.methods.cycle'), kind: 'radio', options: [{ value: ALL_VALUE, label: t('expense.filter.allCycles') }, { value: 'withCycle', label: t('expense.filter.withCycle') }, { value: 'calendar', label: t('expense.methods.calendarMonth') }], predicate: (m, v) => (m.statementClosingDay !== null) === (v === 'withCycle') },
  ]
  const toolbar: DataTableToolbar<PaymentMethod> = { searchLabel: t('expense.methods.search'), searchFields: (m) => [m.name, m.id], filters, itemsName: t('expense.methods.items'), urlSync: true, exportFileName: 'payment-methods', actions: [reloadAction] }

  return (
    <section>
      <PageHeader
        title={t('expense.methods.title')}
        actions={canWrite ? <LoadingButton onClick={() => setCreating(true)}>{t('expense.methods.add')}</LoadingButton> : undefined}
      />
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('expense.methods.empty')} />
      ) : (
        <DataTable caption={t('expense.methods.title')} columns={columns} rows={list.data} toolbar={toolbar} getRowKey={(s) => s.id} refreshing={list.loading} />
      )}
      {remove.dialog}

      {editing && (
        <PaymentMethodFormDialog
          initial={editing}
          onSubmit={async (input) => {
            const updated = await paymentMethods.update(editing.id, input, editing.lastModified)
            list.reload()
            return updated
          }}
          onRefresh={() => { list.reload(); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
      )}
      {creating && (
        <PaymentMethodFormDialog
          existingIds={(list.data ?? []).map((method) => method.id)}
          onSubmit={async (input) => {
            const created = await paymentMethods.create(input)
            list.reload()
            return created
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
