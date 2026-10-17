import type { ComponentType } from 'react'
import { hasClaim, isSuper, type Session } from '../../modules/access-control'
import type { IconName } from '../../shared/components/icon'
import type { MessageKey } from '../../shared/i18n'
import type { AppDeps } from '../app-deps'

export interface AppDefinition {
  id: string
  titleKey: MessageKey
  descriptionKey: MessageKey
  icon: IconName
  // Hash route prefix the app owns, e.g. "/devices".
  path: string
  // Code-split entry; the module is fetched only when the user opens the app.
  load: () => Promise<{ default: ComponentType<{ deps: AppDeps }> }>
  // Claim (key and value) that grants access to this app, e.g. permission=expense.read.
  accessClaimKey: string
  accessClaimValue: string
}

// Same rule as hasPermission, but with the app's own claim key.
export function isAppAvailable(app: AppDefinition, identity: Session): boolean {
  return isSuper(identity) || hasClaim(identity.claims, app.accessClaimKey, app.accessClaimValue)
}
