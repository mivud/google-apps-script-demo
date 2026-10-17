import { RichSelect } from '../../../../shared/components/rich-select'
import { useI18n } from '../../../../shared/i18n'
import type { PaymentMethod } from '../../domain/payment-method'
import { PaymentMethodBadge } from './payment-method-badge'

interface PaymentMethodSelectProps {
  methods: PaymentMethod[]
  value: string
  disabled?: boolean
  onChange: (id: string) => void
  // When set the field is optional and this label names the empty choice.
  emptyLabel?: string
  autoFocus?: boolean
}

// Inactive methods stay selectable only when already chosen, so old expenses still render.
export function PaymentMethodSelect({ methods, value, disabled, onChange, emptyLabel, autoFocus }: PaymentMethodSelectProps) {
  const { t } = useI18n()
  const active = methods.filter((method) => method.active || method.id === value)
  const options = [{ value: '', label: emptyLabel ?? t('expense.choose') }, ...active.map((method) => ({ value: method.id, label: method.name }))]
  const colorOf = (id: string) => methods.find((method) => method.id === id)?.color ?? null
  return (
    <RichSelect
      label={t('expense.paymentMethod')}
      required={emptyLabel === undefined}
      autoFocus={autoFocus}
      value={value}
      disabled={disabled}
      options={options}
      onChange={onChange}
      renderOption={(option) => (option.value === '' ? <span className="muted">{option.label}</span> : <PaymentMethodBadge name={option.label} color={colorOf(option.value)} />)}
    />
  )
}
