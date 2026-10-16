import type { InputHTMLAttributes } from 'react'
import { Field, type FieldLayoutProps } from './Field'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement>, FieldLayoutProps {
  label: string
  error?: string
}

export function TextInput({ label, error, hideLabel, adornment, ...rest }: TextInputProps) {
  return (
    <Field label={label} error={error} hideLabel={hideLabel} adornment={adornment}>
      {(control) => <input {...rest} {...control} />}
    </Field>
  )
}
