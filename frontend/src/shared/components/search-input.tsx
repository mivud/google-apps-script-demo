import type { InputHTMLAttributes } from 'react'
import { Icon } from './icon'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function SearchInput({ label, ...rest }: SearchInputProps) {
  return (
    <div className="search-input">
      <Icon name="search" />
      <input {...rest} type="search" aria-label={label} />
    </div>
  )
}
