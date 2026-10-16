import type { TextareaHTMLAttributes } from 'react'
import { Field, type FieldLayoutProps } from './Field'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldLayoutProps {
  label: string
  error?: string
}

export function Textarea({ label, error, hideLabel, adornment, ...rest }: TextareaProps) {
  return (
    <Field label={label} error={error} hideLabel={hideLabel} adornment={adornment}>
      {(control) => <textarea {...rest} {...control} />}
    </Field>
  )
}
