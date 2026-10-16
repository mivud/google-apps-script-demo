import { useMemo, useState } from 'react'
import type { Category } from '../../domain/category'
import { buildTree, MAX_CATEGORY_DEPTH, type CategoryNode } from '../../domain/category-tree'
import { useCanWrite } from '../../../auth'
import { translateError, useI18n } from '../../../../shared/i18n'
import { useCategories } from '../categories-context'
import { EmptyState } from '../../../../shared/components/empty-state'
import { ErrorState } from '../../../../shared/components/error-state'
import { FormError } from '../../../../shared/components/form-error'
import { CategoryRowActions } from '../components/category-row-actions'
import { CategoryFormDialog } from '../components/category-form-dialog'
import { LoadingButton } from '../../../../shared/components/loading-button'
import { PageHeader } from '../../../../shared/components/page-header'
import { RefreshIndicator } from '../../../../shared/components/refresh-indicator'
import { ListSkeleton } from '../../../../shared/components/skeleton'
import { TreeList, type TreeNode } from '../../../../shared/components/tree-list'
import { useAsyncAction } from '../../../../shared/hooks/use-async-action'
import { useServices } from '../services-context'

type DialogState = { kind: 'create'; parentId: string } | { kind: 'edit'; category: Category }

interface CategoryTreeNode extends TreeNode {
  category: Category
  children: CategoryTreeNode[]
}

// TreeList needs an `id` on every node; the domain tree keys nodes by their category.
function toTreeNodes(nodes: CategoryNode[]): CategoryTreeNode[] {
  return nodes.map((node) => ({ id: node.category.id, category: node.category, children: toTreeNodes(node.children) }))
}

export function CategoriesPage() {
  const { categories } = useServices()
  const { t } = useI18n()
  const canWrite = useCanWrite()
  const { data, flat, loading, error, reload } = useCategories()
  const [dialog, setDialog] = useState<DialogState | undefined>(undefined)
  const [confirmingId, setConfirmingId] = useState<string | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
  const nodes = useMemo(() => toTreeNodes(buildTree(data ?? [])), [data])

  const remove = useAsyncAction(async (id: string) => {
    await categories.remove(id)
    setConfirmingId(undefined)
    reload()
  })

  function renderActions({ category }: CategoryTreeNode, depth: number) {
    if (!canWrite) return null
    return (
      <CategoryRowActions
        category={category}
        canAddChild={depth < MAX_CATEGORY_DEPTH - 1}
        confirming={confirmingId === category.id}
        pending={remove.pending}
        onAddChild={() => setDialog({ kind: 'create', parentId: category.id })}
        onEdit={() => setDialog({ kind: 'edit', category })}
        // Select the row so its actions stay visible while the confirmation is open.
        onAskDelete={() => { remove.clearError(); setSelectedId(category.id); setConfirmingId(category.id) }}
        onConfirmDelete={() => remove.run(category.id)}
        onCancelDelete={() => setConfirmingId(undefined)}
      />
    )
  }

  return (
    <section>
      <PageHeader
        title={t('category.title')}
        back={{ href: '#/', label: t('equipment.backToList') }}
        actions={canWrite ? <LoadingButton onClick={() => setDialog({ kind: 'create', parentId: '' })} disabled={remove.pending}>{t('category.add')}</LoadingButton> : undefined}
      />

      {remove.error && <FormError message={translateError(remove.error, t)} />}
      <RefreshIndicator active={loading && !!data} />

      {error ? (
        <ErrorState error={error} onRetry={reload} retrying={loading} />
      ) : !data ? (
        <ListSkeleton count={4} />
      ) : flat.length === 0 ? (
        <EmptyState icon="folder" message={t('category.empty')} />
      ) : (
        <TreeList
          nodes={nodes}
          label={t('category.treeLabel')}
          refreshing={loading}
          expandedIds={expandedIds}
          onExpandedChange={setExpandedIds}
          selectedId={selectedId}
          onSelectedChange={setSelectedId}
          expandAllLabel={t('category.expandAll')}
          collapseAllLabel={t('category.collapseAll')}
          childCountLabel={(count) => t('category.childCount', { count })}
          renderLabel={(node) => node.category.name}
          renderActions={renderActions}
        />
      )}

      {dialog && (
        <CategoryFormDialog
          initial={dialog.kind === 'edit' ? dialog.category : undefined}
          initialParentId={dialog.kind === 'create' ? dialog.parentId : undefined}
          onSubmit={async (input) => {
            const saved = dialog.kind === 'edit' ? await categories.update(dialog.category.id, input) : await categories.create(input)
            // Reveal the new or moved category by opening its parent.
            if (input.parentId) setExpandedIds((current) => new Set(current).add(input.parentId))
            setSelectedId(saved.id)
            reload()
            return saved
          }}
          onClose={() => setDialog(undefined)}
        />
      )}
    </section>
  )
}
