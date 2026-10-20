import type { Equipment } from '../../domain/equipment'
import { Badge } from '../../../../shared/components/badge'
import { useI18n } from '../../../../shared/i18n'
import { EMPTY_VALUE, WARRANTY_LABEL_KEYS, WARRANTY_TONES, formatDateOnly, formatNumber, getWarrantyStatus, localToday } from '../labels'

// Purchase, warranty, vendor and note; the note is rendered as plain text (never HTML) with its line breaks kept.
export function EquipmentExtraDetails({ equipment }: { equipment: Equipment }) {
  const { t, language } = useI18n()
  const status = getWarrantyStatus(equipment.warrantyExpiryDate, localToday())
  const months = equipment.warrantyMonths === null ? EMPTY_VALUE : formatNumber(equipment.warrantyMonths, language)
  return (
    <dl>
      <dt className="muted">{t('equipmentForm.purchaseDate')}</dt>
      <dd>{formatDateOnly(equipment.purchaseDate, language)}</dd>
      <dt className="muted">{t('equipmentForm.warrantyMonths')}</dt>
      <dd>{months}</dd>
      <dt className="muted">{t('equipmentForm.warrantyExpiry')}</dt>
      <dd>
        {formatDateOnly(equipment.warrantyExpiryDate, language)}
        {status && <> <Badge tone={WARRANTY_TONES[status]}>{t(WARRANTY_LABEL_KEYS[status])}</Badge></>}
      </dd>
      <dt className="muted">{t('equipmentForm.vendor')}</dt>
      <dd>{equipment.vendor ?? EMPTY_VALUE}</dd>
      <dt className="muted">{t('equipmentForm.note')}</dt>
      <dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{equipment.note ?? EMPTY_VALUE}</dd>
    </dl>
  )
}
