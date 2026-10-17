import { describe, expect, it } from 'vitest'
import type { Category } from './category'
import { buildTree, flattenTree, formatPath, getDescendantIds, getPath, isDescendant } from './category-tree'

const cat = (id: string, parentId: string, name = id): Category => ({
  id, parentId, name, createdAt: '', modifiedAt: '', createdBy: '', lastModifiedBy: '',
})

// a -> b -> c, plus root d
const sample = [cat('a', ''), cat('b', 'a'), cat('c', 'b'), cat('d', '')]

describe('buildTree', () => {
  it('nests children under their parent', () => {
    const roots = buildTree(sample)
    expect(roots.map((n) => n.category.id)).toEqual(['a', 'd'])
    expect(roots[0].children[0].children[0].category.id).toBe('c')
  })

  it('treats orphans and self-parented nodes as roots', () => {
    const roots = buildTree([cat('x', 'missing'), cat('y', 'y')])
    expect(roots.map((n) => n.category.id)).toEqual(['x', 'y'])
  })
})

describe('flattenTree', () => {
  it('returns depth-first order with depth and path', () => {
    const flat = flattenTree(buildTree(sample))
    expect(flat.map((f) => [f.category.id, f.depth])).toEqual([['a', 0], ['b', 1], ['c', 2], ['d', 0]])
    expect(flat[2].path).toBe('a › b › c')
  })

  it('does not loop on cyclic data', () => {
    expect(flattenTree(buildTree([cat('p', 'q'), cat('q', 'p')]))).toEqual([])
  })
})

describe('getPath / formatPath', () => {
  it('returns the root-first chain', () => {
    expect(getPath(sample, 'c').map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(formatPath(sample, 'c')).toBe('a › b › c')
  })

  it('returns empty for unknown ids and stops on cycles', () => {
    expect(getPath(sample, 'zzz')).toEqual([])
    expect(getPath([cat('p', 'q'), cat('q', 'p')], 'p')).toHaveLength(2)
  })
})

describe('getDescendantIds / isDescendant', () => {
  it('lists all descendants without the node itself', () => {
    expect(getDescendantIds(sample, 'a').sort()).toEqual(['b', 'c'])
    expect(getDescendantIds(sample, 'd')).toEqual([])
  })

  it('detects descendants', () => {
    expect(isDescendant(sample, 'a', 'c')).toBe(true)
    expect(isDescendant(sample, 'c', 'a')).toBe(false)
    expect(isDescendant(sample, 'a', 'a')).toBe(false)
  })
})
