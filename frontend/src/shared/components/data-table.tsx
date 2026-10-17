import type { DataTableToolbar } from '../table-filters'
import { DataTableView, type DataColumn, type DataTableViewProps } from './data-table-view'
import { FilterableDataTable } from './filterable-data-table'

export type { DataColumn }

export interface DataTableProps<T> extends DataTableViewProps<T> {
  // Opt-in search, filters, count and actions above the table; without it the table renders as before.
  toolbar?: DataTableToolbar<T>
}

export function DataTable<T>({ toolbar, ...view }: DataTableProps<T>) {
  if (toolbar) return <FilterableDataTable {...view} toolbar={toolbar} />
  return <DataTableView {...view} />
}
