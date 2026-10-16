import type { KeyboardEvent, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import type { TreeNode } from './tree-types'

export interface TreeContext<T extends TreeNode> {
  expanded: ReadonlySet<string>
  selectedId?: string
  tabbableId?: string
  renderLabel: (node: T, depth: number) => ReactNode
  renderActions?: (node: T, depth: number) => ReactNode
  childCountLabel: (count: number) => string
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onFocusItem: (id: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>, id: string) => void
}

interface TreeItemProps<T extends TreeNode> {
  node: T
  depth: number
  setSize: number
  position: number
  context: TreeContext<T>
}

function iconFor(expandable: boolean, open: boolean): IconName {
  if (!expandable) return 'file'
  return open ? 'folderOpen' : 'folder'
}

export function TreeItem<T extends TreeNode>({ node, depth, setSize, position, context }: TreeItemProps<T>) {
  const expandable = node.children.length > 0
  const open = expandable && context.expanded.has(node.id)
  const selected = context.selectedId === node.id
  const actions = context.renderActions?.(node, depth)
  return (
    <li role="none" className="tree-node">
      <div className={selected ? 'tree-line is-selected' : 'tree-line'}>
        <div
          role="treeitem"
          className="tree-item"
          data-tree-id={node.id}
          tabIndex={context.tabbableId === node.id ? 0 : -1}
          aria-level={depth + 1}
          aria-setsize={setSize}
          aria-posinset={position}
          aria-selected={selected}
          aria-expanded={expandable ? open : undefined}
          onClick={() => context.onSelect(node.id)}
          onDoubleClick={() => expandable && context.onToggle(node.id)}
          onFocus={(event) => event.target === event.currentTarget && context.onFocusItem(node.id)}
          onKeyDown={(event) => context.onKeyDown(event, node.id)}
        >
          <span
            className={open ? 'tree-toggle is-open' : 'tree-toggle'}
            aria-hidden="true"
            onClick={(event) => { if (!expandable) return; event.stopPropagation(); context.onToggle(node.id) }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {expandable && <Icon name="chevron" />}
          </span>
          <span className="tree-icon"><Icon name={iconFor(expandable, open)} /></span>
          <span className="tree-label">{context.renderLabel(node, depth)}</span>
          {expandable && <span className="muted tree-count">{context.childCountLabel(node.children.length)}</span>}
        </div>
        {actions && <div className="tree-actions">{actions}</div>}
      </div>
      {expandable && (
        <div className={open ? 'tree-collapse is-open' : 'tree-collapse'}>
          <div className="tree-collapse-inner">
            <ul role="group" className="tree-group">
              {node.children.map((child, index) => (
                <TreeItem key={child.id} node={child as T} depth={depth + 1} setSize={node.children.length} position={index + 1} context={context} />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
