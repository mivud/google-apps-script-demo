import type { ComponentProps } from 'react'
import { Spinner } from './Spinner'

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
export type ButtonSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends ComponentProps<'button'> {
  loading?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const SIZE_CLASS: Record<ButtonSize, string> = { default: '', sm: 'btn-sm', icon: 'btn-icon' }

// Disables itself and shows a spinner while loading, so double submits are impossible.
export function Button({
  loading = false,
  variant = 'default',
  size = 'default',
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, SIZE_CLASS[size], className]
  return (
    <button
      {...rest}
      className={classes.filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading && <Spinner />}
      {size === 'icon' ? children : <span>{children}</span>}
    </button>
  )
}
