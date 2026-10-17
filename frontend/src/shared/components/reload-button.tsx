import type { AsyncData } from '../hooks/use-async-data'
import { useReloadAction, type ReloadOptions } from '../hooks/use-reload-action'
import { useI18n } from '../i18n'
import { ActionGroup } from './action-group'

// Convenience for tables whose only toolbar action is Reload.
export function ReloadButton({ source, ...options }: { source: AsyncData<unknown> } & ReloadOptions) {
  const { t } = useI18n()
  return <ActionGroup size="sm" label={t('table.actions')} actions={[useReloadAction(source, options)]} />
}
