import { useState, type FormEvent } from 'react'
import { MAINTENANCE_TYPES, isMaintenanceType, maintenanceDateToIso, type MaintenanceType, type NewMaintenanceLog } from '../../domain/maintenance'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { translateError, useI18n } from '../../../../shared/i18n'
import { MAINTENANCE_LABEL_KEYS } from '../labels'
import { FormError } from '../../../../shared/components/form-error'
import { GlassSurface } from '../../../../shared/components/glass-surface'
import { FieldRow } from '../../../../shared/components/layout'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { Select } from '../../../../shared/components/select'
import { Textarea } from '../../../../shared/components/textarea'
import { TextInput } from '../../../../shared/components/text-input'

interface MaintenanceFormProps {
  equipmentId: string
  onSubmit: (input: NewMaintenanceLog) => Promise<unknown>
  onSaved: () => void
}

// Local calendar date; toISOString() would use UTC and can show tomorrow/yesterday.
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function MaintenanceForm({ equipmentId, onSubmit, onSaved }: MaintenanceFormProps) {
  const [type, setType] = useState<MaintenanceType>('maintenance')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const { t } = useI18n()
  // Conversion lives inside the action so a bad date becomes a displayed error, not an uncaught throw.
  const submit = useAsyncAction(async (input: Omit<NewMaintenanceLog, 'performedAt'> & { date: string }) => {
    const { date: chosenDate, ...rest } = input
    return onSubmit({ ...rest, performedAt: maintenanceDateToIso(chosenDate) })
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const result = await submit.run({
      equipmentId,
      type,
      date,
      note,
    })
    if (result !== undefined) {
      setNote('')
      onSaved()
    }
  }

  return (
    <GlassSurface as="form" onSubmit={handleSubmit}>
      <h3>{t('maintenance.addTitle')}</h3>
      <FieldRow>
        <Select label={t('maintenance.type')} value={type} disabled={submit.pending} onChange={(e) => isMaintenanceType(e.target.value) && setType(e.target.value)}>
          {MAINTENANCE_TYPES.map((value) => (
            <option key={value} value={value}>{t(MAINTENANCE_LABEL_KEYS[value])}</option>
          ))}
        </Select>
        <TextInput label={t('maintenance.date')} type="date" required value={date} disabled={submit.pending} onChange={(e) => setDate(e.target.value)} />
      </FieldRow>
      <Textarea label={t('maintenance.note')} rows={2} value={note} disabled={submit.pending} onChange={(e) => setNote(e.target.value)} />
      {submit.error && <FormError message={translateError(submit.error, t)} />}
      <LoadingButton type="submit" loading={submit.pending}>{t('maintenance.addRecord')}</LoadingButton>
    </GlassSurface>
  )
}
