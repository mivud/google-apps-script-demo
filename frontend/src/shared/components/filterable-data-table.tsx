import { useMemo } from 'react'
import { useLocalTableQuery, useUrlTableQuery } from '../hooks/use-table-query'
import { useI18n } from '../i18n'
import { applyFilters, hasChoiceFilters, isDefaultQuery, type DataTableToolbar } from '../table-filters'
import { ClearableSearch } from './clearable-search'
import { DataTableView, type DataTableViewProps } from './data-table-view'
import { EmptyState } from './empty-state'
import { LoadingButton } from './loading-button'
import { ChoiceFilters, SelectFilters } from './table-filter-panel'

interface FilterableDataTableProps<T> extends DataTableViewProps<T> {
  toolbar: DataTableToolbar<T>
}

export function FilterableDataTable<T>({ toolbar, ...view }: FilterableDataTableProps<T>) {
  const { t } = useI18n()
  const definitions = useMemo(() => toolbar.filters ?? [], [toolbar.filters])
  // urlSync is fixed for the lifetime of a table, so the hook choice never changes between renders.
  // oxlint-disable-next-line react-hooks/rules-of-hooks
  const query = (toolbar.urlSync ? useUrlTableQuery : useLocalTableQuery)(definitions)
  const visible = useMemo(() => applyFilters(view.rows, query, toolbar), [view.rows, query, toolbar])
  const filtered = !isDefaultQuery(definitions, query)

  return (
    <>
      <div className="table-toolbar">
        {toolbar.actions && <div className="table-actions-row">{toolbar.actions}</div>}
        <div className="table-inputs">
          <ClearableSearch label={toolbar.searchLabel} value={query.search} onChange={query.setSearch} />
          <SelectFilters definitions={definitions} values={query.values} onChange={query.setValue} />
        </div>
        {hasChoiceFilters(definitions) && (
          <div className="table-choices">
            <ChoiceFilters definitions={definitions} values={query.values} toggleGroupLabel={toolbar.toggleGroupLabel ?? t('table.moreFilters')} onChange={query.setValue} />
          </div>
        )}
        <div className="table-count-row">
          <p className="muted" aria-live="polite">{t('table.count', { shown: visible.length, total: view.rows.length, items: toolbar.itemsName })}</p>
          {filtered && <LoadingButton type="button" size="sm" variant="ghost" onClick={query.clear}>{t('table.clearFilters')}</LoadingButton>}
        </div>
      </div>
      {toolbar.renderAbove?.(visible)}
      {visible.length === 0 ? (
        <EmptyState icon="search" message={t('table.noMatch')} action={filtered ? <LoadingButton type="button" variant="outline" onClick={query.clear}>{t('table.clearFilters')}</LoadingButton> : undefined} />
      ) : (
        <DataTableView {...view} rows={visible} />
      )}
    </>
  )
}
