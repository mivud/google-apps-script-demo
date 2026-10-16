import { ValidationError } from '../../../shared/errors'
import type { Category } from './category'

export interface CategoryNode {
  category: Category
  children: CategoryNode[]
}

export interface FlatCategory {
  category: Category
  depth: number
  // Full path such as "Parent › Child".
  path: string
}

export const PATH_SEPARATOR = ' › '

// Orphans (parent missing from the list) are shown as roots so no category becomes unreachable.
export function buildTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(categories.map((category) => [category.id, { category, children: [] }]))
  const roots: CategoryNode[] = []
  for (const node of nodes.values()) {
    const parent = nodes.get(node.category.parentId)
    // A self-parent would otherwise hide the node forever.
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

// Depth-first order; the visited set keeps corrupted cyclic data from looping.
export function flattenTree(roots: CategoryNode[]): FlatCategory[] {
  const result: FlatCategory[] = []
  const visited = new Set<string>()
  const walk = (node: CategoryNode, depth: number, parentPath: string) => {
    if (visited.has(node.category.id)) return
    visited.add(node.category.id)
    const path = parentPath ? `${parentPath}${PATH_SEPARATOR}${node.category.name}` : node.category.name
    result.push({ category: node.category, depth, path })
    node.children.forEach((child) => walk(child, depth + 1, path))
  }
  roots.forEach((root) => walk(root, 0, ''))
  return result
}

// Root-first chain of categories ending at `id`; empty when the id is unknown.
export function getPath(categories: Category[], id: string): Category[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const path: Category[] = []
  const seen = new Set<string>()
  let current = byId.get(id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = byId.get(current.parentId)
  }
  return path
}

export function formatPath(categories: Category[], id: string): string {
  return getPath(categories, id).map((category) => category.name).join(PATH_SEPARATOR)
}

// Excludes `id` itself.
export function getDescendantIds(categories: Category[], id: string): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const category of categories) {
    childrenOf.set(category.parentId, [...(childrenOf.get(category.parentId) ?? []), category.id])
  }
  const result: string[] = []
  const seen = new Set<string>([id])
  const queue = [id]
  while (queue.length > 0) {
    for (const childId of childrenOf.get(queue.shift()!) ?? []) {
      if (seen.has(childId)) continue
      seen.add(childId)
      result.push(childId)
      queue.push(childId)
    }
  }
  return result
}

// Used by the UI to keep a category from being moved under itself or its own subtree.
export function isDescendant(categories: Category[], ancestorId: string, candidateId: string): boolean {
  return getDescendantIds(categories, ancestorId).includes(candidateId)
}

// Ids that cannot become the parent of `id`: itself and its own subtree.
export function nonSelectableParentIds(categories: Category[], id: string): string[] {
  return [id, ...getDescendantIds(categories, id)]
}

// Categories that may become the parent of `id`.
export function selectableParents(categories: Category[], id: string): Category[] {
  const excluded = nonSelectableParentIds(categories, id)
  return categories.filter((category) => !excluded.includes(category.id))
}

export function assertNotOwnParent(id: string, parentId: string): void {
  if (parentId === id) throw new ValidationError('A category cannot be its own parent', 'category_cycle')
}

// Full check against the whole tree: no self-parent and no move under the category's own subtree.
export function assertNoCategoryCycle(categories: Category[], id: string, parentId: string): void {
  assertNotOwnParent(id, parentId)
  if (getDescendantIds(categories, id).includes(parentId)) throw new ValidationError('Cycle', 'category_cycle')
}

// Two levels: category > sub category.
export const MAX_CATEGORY_DEPTH = 2

// Levels in the subtree rooted at `id`, counting `id` itself.
function subtreeHeight(categories: Category[], id: string): number {
  const descendants = new Set(getDescendantIds(categories, id))
  let height = 1
  let frontier = [id]
  while (frontier.length > 0) {
    frontier = categories.filter((c) => descendants.has(c.id) && frontier.includes(c.parentId)).map((c) => c.id)
    if (frontier.length > 0) height += 1
  }
  return height
}

function exceedsDepthLimit(categories: Category[], id: string | undefined, parentId: string): boolean {
  if (!parentId) return false
  const parentLevels = getPath(categories, parentId).length
  const ownLevels = id ? subtreeHeight(categories, id) : 1
  return parentLevels + ownLevels > MAX_CATEGORY_DEPTH
}

// `id` is undefined for a category that does not exist yet.
export function assertWithinDepthLimit(categories: Category[], id: string | undefined, parentId: string): void {
  if (exceedsDepthLimit(categories, id, parentId)) {
    throw new ValidationError('Categories allow at most two levels', 'category_depth_exceeded')
  }
}

// Parent choices for the picker: root categories only, so no tree can grow past the depth limit.
export function selectableRootParents(categories: Category[], id?: string): Category[] {
  return categories.filter(
    (candidate) =>
      candidate.id !== id &&
      getPath(categories, candidate.id).length === 1 &&
      !exceedsDepthLimit(categories, id, candidate.id),
  )
}
