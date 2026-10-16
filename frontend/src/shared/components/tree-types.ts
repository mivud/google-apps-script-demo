export interface TreeNode {
  id: string
  children: TreeNode[]
}

// One entry of the flattened list of currently visible nodes (document order).
export interface VisibleNode {
  id: string
  depth: number
  parentId?: string
  expandable: boolean
  open: boolean
  // Expandable siblings (self included), used by the '*' key.
  expandableSiblingIds: string[]
}

export type TreeKeyAction =
  | { kind: 'focus'; id: string }
  | { kind: 'expand'; ids: string[] }
  | { kind: 'collapse'; id: string }
  | { kind: 'select'; id: string; toggle: boolean }
