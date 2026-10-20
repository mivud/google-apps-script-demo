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
import { isTemplateCompleted, type FixedExpenseTemplate } from '../../domain/fixed-expense-template'
import { PaymentMethodBadgeById } from '../components/payment-method-badge'
import { TemplateFormDialog } from '../components/template-form-dialog'
import { useExpenseTrackingServices } from '../services-context'
import { useCanWriteExpenses } from '../use-can-write-expenses'
import { useMoneyFormat } from '../use-money-format'

function matchesProgress(template: FixedExpenseTemplate, progress: string): boolean {
  if (progress === 'unlimited') return template.totalMonths === null
  if (progress === 'completed') return isTemplateCompleted(template)
  return template.totalMonths !== null && !isTemplateCompleted(template)
}

export function TemplatesPage() {
  const { templates, paymentMethods } = useExpenseTrackingServices()
  const { t } = useI18n()
  const canWrite = useCanWriteExpenses()
  const format = useMoneyFormat()
  const list = useAsyncData(() => templates.list(), [templates])
  const methods = useAsyncData(() => paymentMethods.list(), [paymentMethods])
  const reloadAction = useReloadAction(list, { onReload: () => { list.reload(); methods.reload() }, loading: list.loading || methods.loading })
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<FixedExpenseTemplate | undefined>(undefined)
  const remove = useDeleteAction({
    getName: (template: FixedExpenseTemplate) => template.description,
    remove: (template) => templates.remove(template.id),
    onDeleted: () => list.reload(),
  })


  const columns: DataColumn<FixedExpenseTemplate>[] = [
    { key: 'description', header: t('expense.description'), primary: true, cell: (x) => x.description, exportValue: (x) => x.description },
    { key: 'amount', header: t('expense.amount'), cell: (x) => (x.amount === null ? t('expense.templates.noFixedAmount') : format(x.amount)), exportValue: (x) => x.amount },
    { key: 'method', header: t('expense.paymentMethod'), cell: (x) => (x.paymentMethodId === null ? t('expense.templates.noFixedMethod') : <PaymentMethodBadgeById id={x.paymentMethodId} methods={methods.data ?? []} />), exportValue: (x) => (methods.data ?? []).find((m) => m.id === x.paymentMethodId)?.name ?? '' },
    { key: 'paymentDay', header: t('expense.paymentDay'), cell: (x) => x.paymentDay ?? '—', exportValue: (x) => x.paymentDay },
    { key: 'progress', header: t('expense.templates.progress'), cell: (x) => (
      <span className="button-group">
        {x.totalMonths === null ? t('expense.templates.unlimitedProgress', { added: x.monthsAdded }) : t('expense.templates.progressValue', { added: x.monthsAdded, total: x.totalMonths })}
        {isTemplateCompleted(x) && <> <Badge tone="success">{t('expense.templates.completed')}</Badge></>}
      </span>
    ), exportValue: (x) => (x.totalMonths === null ? `${x.monthsAdded}` : `${x.monthsAdded}/${x.totalMonths}`) },
    { key: 'status', header: t('expense.status'), cell: (x) => <Badge tone={x.active ? 'success' : 'neutral'}>{x.active ? t('expense.active') : t('expense.inactive')}</Badge>, exportValue: (x) => (x.active ? t('expense.active') : t('expense.inactive')) },
    ...(canWrite ? [{ key: 'actions', header: t('common.actions'), align: 'end' as const, cell: (x: FixedExpenseTemplate) => <RowActions itemName={x.description} disabled={remove.pending} onEdit={() => setEditing(x)} onDelete={() => remove.ask(x)} /> }] : []),
  ]

  const methodList = methods.data ?? []
  const filters: FilterDefinition<FixedExpenseTemplate>[] = [
    { key: 'status', label: t('expense.status'), kind: 'radio', options: [{ value: ALL_VALUE, label: t('expense.filter.allStatuses') }, { value: 'active', label: t('expense.active') }, { value: 'inactive', label: t('expense.inactive') }], predicate: (x, v) => x.active === (v === 'active') },
    { key: 'progress', label: t('expense.templates.progress'), kind: 'radio', options: [{ value: ALL_VALUE, label: t('expense.filter.allProgress') }, { value: 'inProgress', label: t('expense.filter.inProgress') }, { value: 'completed', label: t('expense.templates.completed') }, { value: 'unlimited', label: t('expense.filter.unlimited') }], predicate: (x, v) => matchesProgress(x, v) },
    { key: 'noAmount', label: t('expense.filter.missingAmount'), kind: 'toggle', predicate: (x) => x.amount === null },
    { key: 'noMethod', label: t('expense.filter.missingMethod'), kind: 'toggle', predicate: (x) => x.paymentMethodId === null },
  ]
  const toolbar: DataTableToolbar<FixedExpenseTemplate> = { searchLabel: t('expense.templates.search'), searchFields: (x) => [x.description], filters, itemsName: t('expense.templates.items'), toggleGroupLabel: t('expense.filter.attention'), urlSync: true, exportFileName: 'fixed-expense-templates', actions: [reloadAction] }

  return (
    <section>
      <PageHeader
        title={t('expense.templates.title')}
        actions={canWrite ? <LoadingButton disabled={!methods.data} onClick={() => setCreating(true)}>{t('expense.templates.add')}</LoadingButton> : undefined}
      />
      <RefreshIndicator active={list.loading && !!list.data} />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} retrying={list.loading} />
      ) : !list.data ? (
        <ListSkeleton count={4} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="list" message={t('expense.templates.empty')} />
      ) : (
        <DataTable caption={t('expense.templates.title')} columns={columns} rows={list.data} toolbar={toolbar} getRowKey={(x) => x.id} refreshing={list.loading} />
      )}
      {remove.dialog}

      {editing && (
        <TemplateFormDialog
          initial={editing}
          methods={methodList}
          onSubmit={async (input) => {
            const updated = await templates.update(editing.id, input, editing.lastModified)
            list.reload()
            return updated
          }}
          onRefresh={() => { list.reload(); setEditing(undefined) }}
          onClose={() => setEditing(undefined)}
        />
      )}
      {creating && (
        <TemplateFormDialog
          methods={methodList}
          onSubmit={async (input) => {
            const created = await templates.create(input)
            list.reload()
            return created
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  )
}
