import { useI18n } from '../i18n'
import { Button } from './Button'

interface PagerProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  disabled?: boolean
}

export function Pager({ page, totalPages, onChange, disabled = false }: PagerProps) {
  const { t } = useI18n()
  return (
    <nav className="pager" aria-label={t('common.pagination')}>
      <Button variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>{t('common.previous')}</Button>
      <span>{t('common.pageOf', { page, total: totalPages })}</span>
      <Button variant="outline" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>{t('common.next')}</Button>
    </nav>
  )
}
