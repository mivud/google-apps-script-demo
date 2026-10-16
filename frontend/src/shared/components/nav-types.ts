import type { IconName } from './Icon'

export interface NavItemData {
  label: string
  href: string
  icon: IconName
  current: boolean
}
