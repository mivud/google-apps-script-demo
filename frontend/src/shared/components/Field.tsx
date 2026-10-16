import { useId, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

export interface FieldLayoutProps {
  // Keeps the label for screen readers when the layout (e.g. a filter bar) shows none.
  hideLabel?: boolean
  // Extra element beside the control, e.g. a quick-create button.
  adornment?: ReactNode
}

interface FieldProps extends FieldLayoutProps {
  label: string
  error?: string
  children: (control: FieldControlProps) => ReactNode
}

// Wires label, error text and aria attributes so every control gets them the same way.
export function Field({ label, error, hideLabel = false, adornment, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const control: FieldControlProps = {
    id,
    ...(error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {}),
  }
  const controlNode = children(control)
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>{label}</label>
      {adornment ? <div className="field-control-row">{controlNode}{adornment}</div> : controlNode}
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
    </div>
  )
}
