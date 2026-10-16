import { translateError, useI18n } from '../i18n'
import { Button } from './button'
import { GlassSurface } from './glass-surface'

interface ErrorStateProps {
  error: Error
  onRetry?: () => void
  retrying?: boolean
}

export function ErrorState({ error, onRetry, retrying = false }: ErrorStateProps) {
  const { t } = useI18n()
  return (
    <GlassSurface className="state state-error" role="alert">
      <p>{translateError(error, t)}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} loading={retrying}>
          {t('common.retry')}
        </Button>
      )}
    </GlassSurface>
  )
}
