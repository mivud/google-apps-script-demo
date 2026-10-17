import type { ComponentType } from 'react'
import { hasClaim, type Session } from '../../modules/access-control'
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
  // Value of the `app` claim that grants access to this app.
  accessClaimValue: string
}

export const APP_CLAIM_KEY = 'app'
// Users holding this role skip the claim check.
export const SUPER_ROLE = 'super'

export function isAppAvailable(app: AppDefinition, identity: Session): boolean {
  return identity.roles.includes(SUPER_ROLE) || hasClaim(identity.claims, APP_CLAIM_KEY, app.accessClaimValue)
}
