import { Link } from 'react-router'
import type { Equipment } from '../../domain/equipment'
import { Badge } from '../../../../shared/components/badge'
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { useI18n } from '../../../../shared/i18n'
import { STATUS_LABEL_KEYS, STATUS_TONES, formatNumber } from '../labels'
import { equipmentPath } from '../navigation'
import { CategoryPath } from './category-path'

export function EquipmentTable({ items, refreshing }: { items: Equipment[]; refreshing: boolean }) {
  const { t, language } = useI18n()
  const columns: DataColumn<Equipment>[] = [
    { key: 'name', header: t('equipmentForm.name'), primary: true, cell: (item) => <Link to={equipmentPath(item.id)}>{item.name}</Link> },
    { key: 'category', header: t('equipmentForm.category'), cell: (item) => <CategoryPath categoryId={item.categoryId} /> },
    { key: 'status', header: t('equipmentForm.status'), cell: (item) => <Badge tone={STATUS_TONES[item.status]}>{t(STATUS_LABEL_KEYS[item.status])}</Badge> },
    { key: 'quantity', header: t('equipmentForm.quantity'), cell: (item) => formatNumber(item.quantity, language) },
  ]
  return <DataTable caption={t('equipment.tableCaption')} columns={columns} rows={items} getRowKey={(item) => item.id} refreshing={refreshing} />
}
