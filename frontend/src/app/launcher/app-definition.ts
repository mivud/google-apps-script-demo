import type { ComponentType } from 'react'
import type { Session } from '../../modules/access-control'
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
  // Defaults to true; the visibility rule per identity is decided later.
  isAvailable?: (identity: Session) => boolean
}

export function isAppAvailable(app: AppDefinition, identity: Session): boolean {
  return app.isAvailable?.(identity) ?? true
}
