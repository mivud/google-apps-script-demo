import { Link } from 'react-router'
import type { Equipment } from '../../domain/equipment'
import { Badge } from '../../../../shared/components/badge'
import { DataTable, type DataColumn } from '../../../../shared/components/data-table'
import { useI18n } from '../../../../shared/i18n'
import type { DataTableToolbar } from '../../../../shared/table-filters'
import { useCategories } from '../categories-context'
import { EMPTY_VALUE, STATUS_LABEL_KEYS, STATUS_TONES, WARRANTY_LABEL_KEYS, WARRANTY_TONES, formatDate, formatDateOnly, formatNumber, getWarrantyStatus } from '../labels'
import { equipmentPath } from '../navigation'
import { CategoryPath } from './category-path'

interface EquipmentTableProps {
  items: Equipment[]
  refreshing: boolean
  toolbar: DataTableToolbar<Equipment>
  // Local YYYY-MM-DD, read once by the page so every row is judged against the same day.
  today: string
}

export function EquipmentTable({ items, refreshing, toolbar, today }: EquipmentTableProps) {
  const { t, language } = useI18n()
  const { pathOf } = useCategories()
  const statusText = (item: Equipment) => t(STATUS_LABEL_KEYS[item.status])
  const warrantyText = (item: Equipment) => {
    const status = getWarrantyStatus(item.warrantyExpiryDate, today)
    return status ? t(WARRANTY_LABEL_KEYS[status]) : ''
  }
  const columns: DataColumn<Equipment>[] = [
    { key: 'name', header: t('equipmentForm.name'), primary: true, cell: (item) => <Link to={equipmentPath(item.id)}>{item.name}</Link>, exportValue: (item) => item.name },
    { key: 'category', header: t('equipmentForm.category'), cell: (item) => <CategoryPath categoryId={item.categoryId} />, exportValue: (item) => (item.categoryId ? pathOf(item.categoryId) : '') },
    { key: 'vendor', header: t('equipmentForm.vendor'), cell: (item) => item.vendor ?? EMPTY_VALUE, exportValue: (item) => item.vendor },
    { key: 'status', header: t('equipmentForm.status'), cell: (item) => <Badge tone={STATUS_TONES[item.status]}>{statusText(item)}</Badge>, exportValue: statusText },
    { key: 'quantity', header: t('equipmentForm.quantity'), cell: (item) => formatNumber(item.quantity, language), exportValue: (item) => item.quantity },
    { key: 'purchaseDate', header: t('equipmentForm.purchaseDate'), cell: (item) => formatDateOnly(item.purchaseDate, language), exportValue: (item) => item.purchaseDate },
    { key: 'warrantyExpiry', header: t('equipmentForm.warrantyExpiry'), cell: (item) => <WarrantyCell item={item} today={today} />, exportValue: (item) => item.warrantyExpiryDate },
    { key: 'warrantyStatus', header: t('warranty.filter'), exportOnly: true, cell: () => null, exportValue: warrantyText },
    { key: 'updated', header: t('equipment.updated'), cell: (item) => formatDate(item.modifiedAt, language), exportValue: (item) => item.modifiedAt },
  ]
  return <DataTable caption={t('equipment.tableCaption')} columns={columns} rows={items} toolbar={toolbar} getRowKey={(item) => item.id} refreshing={refreshing} />
}

function WarrantyCell({ item, today }: { item: Equipment; today: string }) {
  const { t, language } = useI18n()
  const status = getWarrantyStatus(item.warrantyExpiryDate, today)
  if (!status) return <>{EMPTY_VALUE}</>
  return (
    <>
      {formatDateOnly(item.warrantyExpiryDate, language)} <Badge tone={WARRANTY_TONES[status]}>{t(WARRANTY_LABEL_KEYS[status])}</Badge>
    </>
  )
}
