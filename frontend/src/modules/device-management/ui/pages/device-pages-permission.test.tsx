// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { setupDomTests } from '../../../../shared/testing/render-app'
import { sessionOf, sessionWrapper } from '../../../../shared/testing/session-wrapper'
import { buildTree, flattenTree } from '../../domain/category-tree'
import { CategoriesContext, type CategoriesState } from '../categories-context'
import { ServicesContext, type Services } from '../services-context'
import { CategoriesPage } from './categories-page'
import { EquipmentDetailPage } from './equipment-detail-page'
import { EquipmentListPage } from './equipment-list-page'

setupDomTests()

const audit = { createdAt: '', modifiedAt: '', createdBy: '', lastModifiedBy: '' }
const category = { id: 'c1', parentId: '', name: 'Laptops', ...audit }
const device = { id: 'e1', categoryId: 'c1', name: 'ThinkPad', description: 'd', status: 'active', quantity: 1, purchaseDate: null, warrantyMonths: null, warrantyExpiryDate: null, note: null, vendor: null, ...audit }

const categories: CategoriesState = {
  data: [category], flat: flattenTree(buildTree([category])), pathOf: () => 'Laptops',
  loading: false, error: undefined, reload: () => undefined,
} as unknown as CategoriesState

const services = {
  equipment: { list: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }), get: async () => device },
  maintenance: { listByEquipment: async () => [] },
  categories: {},
} as unknown as Services

function Providers({ children }: { children: ReactNode }) {
  return <ServicesContext.Provider value={services}><CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider></ServicesContext.Provider>
}

const wrapperFor = (permissions: string[]) => {
  const Session = sessionWrapper(sessionOf(['viewer'], permissions))
  return ({ children }: { children: ReactNode }) => <Session><Providers>{children}</Providers></Session>
}
const button = (name: RegExp) => screen.queryByRole('button', { name })

describe.each([
  ['without device.mgt.write', ['device.mgt.read'], false],
  ['with device.mgt.write', ['device.mgt.read', 'device.mgt.write'], true],
])('device pages %s', (_label, permissions, canWrite) => {
  it('equipment list add action', async () => {
    render(<EquipmentListPage />, { wrapper: wrapperFor(permissions) })
    await screen.findByText(/No equipment/i)
    expect(!!button(/Add equipment/)).toBe(canWrite)
  })

  it('equipment detail edit, delete and maintenance form', async () => {
    render(<EquipmentDetailPage id="e1" onDeleted={() => undefined} />, { wrapper: wrapperFor(permissions) })
    await screen.findByText('ThinkPad')
    expect(!!button(/Edit/)).toBe(canWrite)
    expect(!!button(/Delete/)).toBe(canWrite)
    expect(!!button(/Add record/)).toBe(canWrite)
  })

  it('categories add and row actions', async () => {
    render(<CategoriesPage />, { wrapper: wrapperFor(permissions) })
    await screen.findByText('Laptops')
    expect(!!button(/Add category/)).toBe(canWrite)
    expect(!!button(/Delete/)).toBe(canWrite)
  })
})
