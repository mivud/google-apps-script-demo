import type { ReactNode } from 'react'
import { Icon } from './icon'

interface PageHeaderProps {
  // Omit while the real title is still loading or failed, so no empty heading is rendered.
  title?: string
  actions?: ReactNode
  back?: { href: string; label: string }
}

export function PageHeader({ title, actions, back }: PageHeaderProps) {
  return (
    <>
      {back && <a className="back-link" href={back.href}><Icon name="back" />{back.label}</a>}
      {(title || actions) && (
        <div className="page-header">
          {title && <h1>{title}</h1>}
          {actions}
        </div>
      )}
    </>
  )
}
