// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClaimsPage } from '../../modules/claims/ui'
import { RoleDetailPage, RolesPage } from '../../modules/roles/ui'
import { UserDetailPage, UsersPage } from '../../modules/users/ui'
import { sessionOf, sessionWrapper } from '../../shared/testing/session-wrapper'
import { setupDomTests } from '../../shared/testing/render-app'
import type { AppDeps } from '../app-deps'
import IdentityApp from './identity-app'

setupDomTests()

const audit = { created: '', createdBy: '', lastModified: '2026-01-01T00:00:00.000Z', lastModifiedBy: '' }
const role = { id: 'r1', name: 'editor', description: 'Edits', claims: [{ key: 'permission', value: 'x.read' }], ...audit }
const user = { id: 'u1', email: 'bob@example.com', active: true, roleIds: ['r1'], claims: [], ...audit }
const claim = { key: 'permission', value: 'x.read' }

const roles = { list: async () => [role], get: async () => role }
const users = { list: async () => [user], get: async () => user }
const claims = { list: async () => [claim] }
const access = { get: async () => ({ role: '', email: '', roles: [], claims: [] }) }

vi.mock('./build-identity-services', () => ({ buildIdentityServices: () => ({ users, roles, claims, access }) }))

const asUser = (permissions: string[]) => ({ wrapper: sessionWrapper(sessionOf(['editor'], permissions), '/identity/users') })
const button = (name: RegExp) => screen.queryByRole('button', { name })

describe.each([
  ['read-only', false],
  ['writer', true],
])('identity pages for a %s user', (_label, canWrite) => {
  const expectWrite = (present: boolean) => expect(present).toBe(canWrite)

  it('users list', async () => {
    const wrapper = sessionWrapper(sessionOf([]))
    render(<UsersPage users={users as never} roles={roles as never} canWrite={canWrite} />, { wrapper })
    await screen.findByText('bob@example.com')
    expectWrite(!!button(/Add user/))
    expectWrite(!!button(/Edit/))
  })

  it('roles list', async () => {
    render(<RolesPage roles={roles as never} canWrite={canWrite} />, { wrapper: sessionWrapper(sessionOf([])) })
    await screen.findByText('Edits')
    expectWrite(!!button(/Add role/))
  })

  it('claims list', async () => {
    render(<ClaimsPage claims={claims as never} canWrite={canWrite} />, { wrapper: sessionWrapper(sessionOf([])) })
    await screen.findByText('x.read')
    expectWrite(!!button(/Add claim/))
    expectWrite(!!button(/Delete/))
  })

  it('role detail with its claim assignment panel', async () => {
    render(<RoleDetailPage id="r1" roles={roles as never} claims={claims as never} onDeleted={() => undefined} canWrite={canWrite} />, { wrapper: sessionWrapper(sessionOf([])) })
    await screen.findByRole('checkbox')
    expectWrite(!!button(/Save/))
    expectWrite(!!button(/Edit/))
    expect((screen.getByRole('checkbox') as HTMLInputElement).closest('fieldset')?.disabled).toBe(!canWrite)
  })

  it('user detail with both assignment panels', async () => {
    render(<UserDetailPage id="u1" users={users as never} roles={roles as never} claims={claims as never} renderAccess={() => null} onDeleted={() => undefined} canWrite={canWrite} />, { wrapper: sessionWrapper(sessionOf([])) })
    // The role and claim panels load independently; wait for both checkboxes.
    await waitFor(() => expect(screen.queryAllByRole('checkbox')).toHaveLength(2))
    // Roles and claims each render their own Save button.
    expectWrite(screen.queryAllByRole('button', { name: /Save/ }).length === 2)
    expectWrite(!!button(/Deactivate/))
  })
})

describe('identity app gating', () => {
  const deps = {} as AppDeps

  it('shows the no-access state without identity.read', async () => {
    render(<IdentityApp deps={deps} />, asUser(['identity.write']))
    expect(await screen.findByText(/do not have permission to manage identity/)).toBeTruthy()
    expect(button(/Add user/)).toBeNull()
  })

  it('is read-only with identity.read only', async () => {
    render(<IdentityApp deps={deps} />, asUser(['identity.read']))
    await screen.findByText('bob@example.com')
    expect(button(/Add user/)).toBeNull()
  })

  it('shows write actions with identity.read and identity.write', async () => {
    render(<IdentityApp deps={deps} />, asUser(['identity.read', 'identity.write']))
    await screen.findByText('bob@example.com')
    expect(button(/Add user/)).toBeTruthy()
  })
})
