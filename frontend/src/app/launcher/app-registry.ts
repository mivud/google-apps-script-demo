import type { AppDefinition } from './app-definition'

// Cards appear in this order on the launcher.
export const APP_REGISTRY: readonly AppDefinition[] = [
  {
    id: 'identity',
    titleKey: 'launcher.identity.title',
    descriptionKey: 'launcher.identity.description',
    icon: 'users',
    path: '/identity',
    load: () => import('../identity/identity-app'),
  },
  {
    id: 'device-management',
    titleKey: 'launcher.devices.title',
    descriptionKey: 'launcher.devices.description',
    icon: 'book',
    path: '/devices',
    load: () => import('../device-management-app'),
  },
]
