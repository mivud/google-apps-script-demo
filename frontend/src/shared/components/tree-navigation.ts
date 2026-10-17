import type { TreeKeyAction, TreeNode, VisibleNode } from './tree-types'

export function flattenVisible(nodes: readonly TreeNode[], expanded: ReadonlySet<string>, depth = 0, parentId?: string): VisibleNode[] {
  const expandableSiblingIds = nodes.filter((node) => node.children.length > 0).map((node) => node.id)
  return nodes.flatMap((node) => {
    const expandable = node.children.length > 0
    const open = expandable && expanded.has(node.id)
    const self: VisibleNode = { id: node.id, depth, parentId, expandable, open, expandableSiblingIds }
    return open ? [self, ...flattenVisible(node.children, expanded, depth + 1, node.id)] : [self]
  })
}

export function collectExpandableIds(nodes: readonly TreeNode[]): string[] {
  return nodes.flatMap((node) => (node.children.length > 0 ? [node.id, ...collectExpandableIds(node.children)] : []))
}

export function toggled(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids)
  if (!next.delete(id)) next.add(id)
  return next
}

export function withIds(ids: ReadonlySet<string>, added: readonly string[]): Set<string> {
  return new Set([...ids, ...added])
}

type KeyResolver = (visible: VisibleNode[], index: number) => TreeKeyAction | undefined

const focusAt = (visible: VisibleNode[], index: number): TreeKeyAction | undefined =>
  visible[index] ? { kind: 'focus', id: visible[index].id } : undefined

const KEY_RESOLVERS: Record<string, KeyResolver> = {
  ArrowDown: (visible, index) => focusAt(visible, index + 1),
  ArrowUp: (visible, index) => focusAt(visible, index - 1),
  Home: (visible) => focusAt(visible, 0),
  End: (visible) => focusAt(visible, visible.length - 1),
  ArrowRight: (visible, index) => {
    const current = visible[index]
    if (!current.expandable) return undefined
    return current.open ? focusAt(visible, index + 1) : { kind: 'expand', ids: [current.id] }
  },
  ArrowLeft: (visible, index) => {
    const current = visible[index]
    if (current.open) return { kind: 'collapse', id: current.id }
    return current.parentId ? { kind: 'focus', id: current.parentId } : undefined
  },
  Enter: (visible, index) => ({ kind: 'select', id: visible[index].id, toggle: visible[index].expandable }),
  ' ': (visible, index) => ({ kind: 'select', id: visible[index].id, toggle: false }),
  '*': (visible, index) => ({ kind: 'expand', ids: visible[index].expandableSiblingIds }),
}

// Pure so the WAI-ARIA keyboard model stays easy to review apart from rendering.
export function resolveTreeKey(key: string, visible: VisibleNode[], id: string): TreeKeyAction | undefined {
  const index = visible.findIndex((node) => node.id === id)
  if (index < 0) return undefined
  return KEY_RESOLVERS[key]?.(visible, index)
}
