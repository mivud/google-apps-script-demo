import type { ActionConfig } from '../components/action-group'
import { useI18n } from '../i18n'
import type { AsyncData } from './use-async-data'

export interface ReloadOptions {
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
