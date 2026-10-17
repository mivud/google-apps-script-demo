import type { IconName } from './icon'
import { Icon } from './icon'
import { LoadingButton } from './loading-button'

export interface ActionConfig {
  id: string
  icon: IconName
  // Accessible name and tooltip; icon-only buttons carry no visible text.
  label: string
  onClick: () => void
  // Replaces the icon with a spinner and disables the button.
  loading?: boolean
  disabled?: boolean
}

interface ActionGroupProps {
  // 'sm' is the compact function-key strip used above tables.
  size?: 'default' | 'sm'
  // Names the group for assistive technology.
  label: string
  actions: readonly ActionConfig[]
}

// Joined set of icon buttons for toolbars. A new action (e.g. Export) is one more entry in `actions`.
export function ActionGroup({ label, actions, size = 'default' }: ActionGroupProps) {
  if (actions.length === 0) return null
  return (
    <div className={size === 'sm' ? 'action-group button-group action-group-sm' : 'action-group button-group'} role="group" aria-label={label}>
      {actions.map((action) => (
        <LoadingButton key={action.id} type="button" size="icon" variant={size === 'sm' ? 'secondary' : 'outline'} aria-label={action.label} title={action.label} loading={action.loading} disabled={action.disabled} onClick={action.onClick}>
          <Icon name={action.icon} />
        </LoadingButton>
      ))}
    </div>
  )
}
