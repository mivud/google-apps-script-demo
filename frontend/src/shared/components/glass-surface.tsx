import type { ElementType, HTMLAttributes } from 'react'

interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  to?: string
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md'
}

const PADDING_CLASS = { none: '', sm: 'surface-pad-sm', md: 'surface-pad' } as const

export function GlassSurface({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className = '',
  ...rest
}: GlassSurfaceProps) {
  const classes = ['surface', PADDING_CLASS[padding], interactive ? 'surface-interactive' : '', className]
  return <Tag {...rest} className={classes.filter(Boolean).join(' ')} />
}
