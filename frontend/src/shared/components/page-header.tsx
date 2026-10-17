import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { Icon } from './icon'

interface PageHeaderProps {
  // Omit while the real title is still loading or failed, so no empty heading is rendered.
  title?: string
  actions?: ReactNode
  back?: { to: string; label: string }
}

export function PageHeader({ title, actions, back }: PageHeaderProps) {
  return (
    <>
      {back && <Link className="back-link" to={back.to}><Icon name="back" />{back.label}</Link>}
      {(title || actions) && (
        <div className="page-header">
          {title && <h1>{title}</h1>}
          {actions && <div className="button-group button-group-end">{actions}</div>}
        </div>
      )}
    </>
  )
}
