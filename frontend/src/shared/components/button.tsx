import type { ComponentProps } from 'react'
import { Spinner } from './spinner'

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
export type ButtonSize = 'default' | 'sm' | 'icon'

interface ButtonProps extends ComponentProps<'button'> {
  loading?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const SIZE_CLASS: Record<ButtonSize, string> = { default: '', sm: 'btn-sm', icon: 'btn-icon' }

// Disables itself while loading; the spinner overlays the (transparent) content so the button keeps its width.
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
      {loading && <span className="btn-spinner"><Spinner /></span>}
      <span className={loading ? 'btn-content is-loading' : 'btn-content'}>{children}</span>
    </button>
  )
}
