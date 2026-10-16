import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useControllable } from '../hooks/use-controllable'
import { TreeItem, type TreeContext } from './TreeItem'
import { TreeToolbar } from './TreeToolbar'
import { collectExpandableIds, flattenVisible, resolveTreeKey, toggled, withIds } from './tree-navigation'
import type { TreeKeyAction, TreeNode } from './tree-types'

export type { TreeNode } from './tree-types'

interface TreeListProps<T extends TreeNode> {
  nodes: T[]
  label: string
  renderLabel: (node: T, depth: number) => ReactNode
  // Row controls: always shown on touch, on hover/selection/focus with a mouse.
  renderActions?: (node: T, depth: number) => ReactNode
  childCountLabel: (count: number) => string
  expandAllLabel: string
  collapseAllLabel: string
  refreshing?: boolean
  // Expansion and selection are controlled when their change handler is given.
  expandedIds?: ReadonlySet<string>
  onExpandedChange?: (ids: ReadonlySet<string>) => void
  selectedId?: string
  onSelectedChange?: (id: string) => void
}

const NO_IDS: ReadonlySet<string> = new Set()
const MODIFIER_KEYS = ['ctrlKey', 'altKey', 'metaKey'] as const

export function TreeList<T extends TreeNode>(props: TreeListProps<T>) {
  const { nodes, label, refreshing = false } = props
  const treeRef = useRef<HTMLUListElement>(null)
  const [expanded, setExpanded] = useControllable<ReadonlySet<string>>(props.expandedIds, props.onExpandedChange, NO_IDS)
  const [selectedId, setSelectedId] = useControllable<string | undefined>(props.selectedId, props.onSelectedChange as ((id: string | undefined) => void) | undefined, undefined)
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined)
  const visible = useMemo(() => flattenVisible(nodes, expanded), [nodes, expanded])
  const tabbableId = [focusedId, selectedId].find((id) => visible.some((node) => node.id === id)) ?? visible[0]?.id

  function focusItem(id: string) {
    setFocusedId(id)
    treeRef.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(id)}"]`)?.focus()
  }

  function apply(action: TreeKeyAction) {
    if (action.kind === 'focus') return focusItem(action.id)
    if (action.kind === 'expand') return setExpanded(withIds(expanded, action.ids))
    if (action.kind === 'collapse') return setExpanded(toggled(expanded, action.id))
    setSelectedId(action.id)
    if (action.toggle) setExpanded(toggled(expanded, action.id))
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.target !== event.currentTarget || MODIFIER_KEYS.some((key) => event[key])) return
    const action = resolveTreeKey(event.key, visible, id)
    if (!action) return
    event.preventDefault()
    apply(action)
  }

  const context: TreeContext<T> = {
    expanded,
    selectedId,
    tabbableId,
    renderLabel: props.renderLabel,
    renderActions: props.renderActions,
    childCountLabel: props.childCountLabel,
    onSelect: (id) => { setSelectedId(id); setFocusedId(id) },
    onToggle: (id) => setExpanded(toggled(expanded, id)),
    onFocusItem: setFocusedId,
    onKeyDown,
  }

  return (
    <>
      <TreeToolbar
        expandAllLabel={props.expandAllLabel}
        collapseAllLabel={props.collapseAllLabel}
        onExpandAll={() => setExpanded(new Set(collectExpandableIds(nodes)))}
        onCollapseAll={() => setExpanded(NO_IDS)}
      />
      <ul ref={treeRef} role="tree" aria-label={label} className={refreshing ? 'tree is-refreshing' : 'tree'}>
        {nodes.map((node, index) => (
          <TreeItem key={node.id} node={node} depth={0} setSize={nodes.length} position={index + 1} context={context} />
        ))}
      </ul>
    </>
  )
}
