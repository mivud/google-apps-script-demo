import { InlineSkeleton } from '../../../../shared/components/Skeleton'
import { useI18n } from '../../../../shared/i18n'
import { useCategories } from '../categories-context'

// Plain text path for cards and detail pages; shows a placeholder bar while categories load.
export function CategoryPath({ categoryId }: { categoryId: string }) {
  const { t } = useI18n()
  const { data, error, pathOf } = useCategories()
  if (!categoryId) return <>{t('equipment.uncategorized')}</>
  if (error && !data) return <>&mdash;</>
  if (!data) return <InlineSkeleton />
  return <>{pathOf(categoryId) || t('category.unknown')}</>
}
