import type { ReactNode } from 'react'
import { Icon, type IconName } from './icon'

interface EmptyStateProps {
  message: string
  icon?: IconName
  action?: ReactNode
}

export function EmptyState({ message, icon = 'list', action }: EmptyStateProps) {
  return (
    <div className="state empty-state">
      <Icon name={icon} />
      <p>{message}</p>
      {action}
    </div>
  )
}
