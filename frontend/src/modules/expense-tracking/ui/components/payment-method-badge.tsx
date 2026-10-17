import type { CSSProperties } from 'react'
import { isPaymentMethodColor, type PaymentMethod } from '../../domain/payment-method'

interface PaymentMethodBadgeProps {
  name: string
  color: string | null
}

// The method color only tints the badge background and the dot; the name stays in the normal text token,
// so contrast cannot break whatever color is chosen. The color is validated before it reaches a style.
export function PaymentMethodBadge({ name, color }: PaymentMethodBadgeProps) {
  const valid = color !== null && isPaymentMethodColor(color)
  const style = valid ? ({ '--pm-color': color } as CSSProperties) : undefined
  return (
    <span className={valid ? 'pm-badge' : 'pm-badge pm-badge-plain'} style={style}>
      <span className="pm-dot" aria-hidden="true" />
      <span className="pm-name">{name}</span>
    </span>
  )
}

// Looks a method up by id; falls back to the raw id for rows whose method was deleted.
export function PaymentMethodBadgeById({ id, methods }: { id: string; methods: readonly PaymentMethod[] }) {
  const method = methods.find((candidate) => candidate.id === id)
  return <PaymentMethodBadge name={method?.name ?? id} color={method?.color ?? null} />
}
