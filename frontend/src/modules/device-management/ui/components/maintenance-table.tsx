import type { MaintenanceLog } from '../../domain/maintenance'
import { Badge } from '../../../../shared/components/badge'
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { useI18n } from '../../../../shared/i18n'
import { EMPTY_VALUE, MAINTENANCE_LABEL_KEYS, formatDate } from '../labels'

// Wraps long notes and keeps their line breaks; rendered as text only, never as HTML.
const WRAPPED_TEXT = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const

export function MaintenanceTable({ logs, refreshing }: { logs: MaintenanceLog[]; refreshing: boolean }) {
  const { t, language } = useI18n()
  const sorted = [...logs].sort((a, b) => b.performedAt.localeCompare(a.performedAt))
  const columns: DataColumn<MaintenanceLog>[] = [
    { key: 'date', header: t('maintenance.date'), primary: true, cell: (log) => formatDate(log.performedAt, language) },
    { key: 'type', header: t('maintenance.type'), cell: (log) => <Badge>{t(MAINTENANCE_LABEL_KEYS[log.type])}</Badge> },
    { key: 'vendor', header: t('maintenance.vendor'), cell: (log) => log.vendor ?? EMPTY_VALUE },
    { key: 'note', header: t('maintenance.note'), cell: (log) => (log.note ? <span style={WRAPPED_TEXT}>{log.note}</span> : EMPTY_VALUE) },
    { key: 'createdBy', header: t('audit.createdBy'), cell: (log) => log.createdBy || t('audit.unknown') },
  ]
  return <DataTable caption={t('maintenance.tableCaption')} columns={columns} rows={sorted} getRowKey={(log) => log.id} refreshing={refreshing} />
}
