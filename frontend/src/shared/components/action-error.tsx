import { translateError, useI18n } from '../i18n'
import { FormError } from './form-error'
import { LoadingButton } from './loading-button'
import { isConflictError } from '../conflict'

interface ActionErrorProps {
  error: Error | undefined
  // When given, a concurrency conflict offers to reload the latest version.
  onRefresh?: () => void
}

export function ActionError({ error, onRefresh }: ActionErrorProps) {
  const { t } = useI18n()
  if (!error) return null
  const conflict = isConflictError(error)
  return (
    <>
      <FormError message={conflict ? t('identity.conflict') : translateError(error, t)} />
      {conflict && onRefresh && <LoadingButton variant="outline" type="button" onClick={onRefresh}>{t('identity.refresh')}</LoadingButton>}
    </>
  )
}
