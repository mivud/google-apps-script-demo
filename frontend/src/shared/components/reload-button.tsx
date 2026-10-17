import type { AsyncData } from '../hooks/use-async-data'
import { useI18n } from '../i18n'
import { ActionGroup, type ActionConfig } from './action-group'

interface ReloadOptions {
  // Override when one action refreshes several sources; defaults to source.reload.
  onReload?: () => void
  // Override the busy flag when several sources are involved.
  loading?: boolean
}

// The Refresh action as a preset entry for ActionGroup: it only refetches and shows the loading state.
export function useReloadAction(source: AsyncData<unknown>, { onReload, loading }: ReloadOptions = {}): ActionConfig {
  const { t } = useI18n()
  return { id: 'reload', icon: 'refresh', label: t('common.reload'), onClick: onReload ?? source.reload, loading: loading ?? source.loading }
}

// Convenience for tables whose only toolbar action is Reload.
export function ReloadButton({ source, ...options }: { source: AsyncData<unknown> } & ReloadOptions) {
  const { t } = useI18n()
  return <ActionGroup size="sm" label={t('table.actions')} actions={[useReloadAction(source, options)]} />
}
