import type { SelectHTMLAttributes } from 'react'
import { Field, type FieldLayoutProps } from './Field'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldLayoutProps {
  label: string
  error?: string
}

export function Select({ label, error, hideLabel, adornment, children, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} hideLabel={hideLabel} adornment={adornment}>
      {(control) => <select {...rest} {...control}>{children}</select>}
    </Field>
  )
}
