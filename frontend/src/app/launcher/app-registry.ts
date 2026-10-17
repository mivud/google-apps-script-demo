import { EXPENSE_READ_PERMISSION, PERMISSION_CLAIM_KEY } from '../../modules/expense-tracking/permissions'
import type { AppDefinition } from './app-definition'

// Cards appear in this order on the launcher.
export const APP_REGISTRY: readonly AppDefinition[] = [
  {
    id: 'identity',
    titleKey: 'launcher.identity.title',
    descriptionKey: 'launcher.identity.description',
    icon: 'users',
    path: '/identity',
    accessClaimValue: 'identity',
    load: () => import('../identity/identity-app'),
  },
  {
    id: 'device-management',
    titleKey: 'launcher.devices.title',
    descriptionKey: 'launcher.devices.description',
    icon: 'book',
    path: '/devices',
    accessClaimValue: 'device.mgt',
    load: () => import('../device-management-app'),
  },
  {
    id: 'expense',
    titleKey: 'launcher.expense.title',
    descriptionKey: 'launcher.expense.description',
    icon: 'file',
    path: '/expense',
    accessClaimKey: PERMISSION_CLAIM_KEY,
    accessClaimValue: EXPENSE_READ_PERMISSION,
    load: () => import('../expense/expense-app'),
  },
]
