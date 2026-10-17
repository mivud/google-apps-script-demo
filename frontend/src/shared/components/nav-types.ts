import type { IconName } from './icon'

export interface NavItemData {
  label: string
  href: string
  icon: IconName
  current: boolean
}
