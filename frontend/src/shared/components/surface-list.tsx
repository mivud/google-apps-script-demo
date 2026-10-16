import type { ReactNode } from 'react'
import { GlassSurface } from './glass-surface'

export function SurfaceList({ refreshing = false, children }: { refreshing?: boolean; children: ReactNode }) {
  return <ul className={refreshing ? 'surface-list is-refreshing' : 'surface-list'}>{children}</ul>
}

interface SurfaceListItemProps {
  // Trailing controls; they stack under the content on mobile.
  actions?: ReactNode
  children: ReactNode
}

export function SurfaceListItem({ actions, children }: SurfaceListItemProps) {
  return (
    <GlassSurface as="li" padding="sm" className="surface-item">
      <div className="surface-item-body">{children}</div>
      {actions && <div className="surface-item-actions">{actions}</div>}
    </GlassSurface>
  )
}
