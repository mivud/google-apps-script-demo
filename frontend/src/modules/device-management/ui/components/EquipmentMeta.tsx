import { useI18n } from '../../../../shared/i18n'
import { formatNumber } from '../labels'
import { CategoryPath } from './CategoryPath'

// Two separate lines (not one block) because pages place the description between them.
export function EquipmentCategoryLine({ categoryId }: { categoryId: string }) {
  return <p className="muted"><CategoryPath categoryId={categoryId} /></p>
}

export function EquipmentQuantityLine({ quantity }: { quantity: number }) {
  const { t, language } = useI18n()
  return <p className="muted">{t('equipment.quantity', { count: formatNumber(quantity, language) })}</p>
}
