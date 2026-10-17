import type { IconName } from './icon'

export interface NavItemData {
  label: string
  to: string
  icon: IconName
  current: boolean
}
