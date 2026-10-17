// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setupDomTests } from '../shared/testing/render-app'
import { sessionOf, sessionWrapper } from '../shared/testing/session-wrapper'
import type { AppDeps } from './app-deps'
import { Shell } from './shell'

setupDomTests()

const deps = {} as AppDeps
const tile = (name: string) => screen.queryByRole('heading', { name })

describe('Shell launcher gating', () => {
  it('hides tiles without the matching read permission', async () => {
    render(<Shell deps={deps} />, { wrapper: sessionWrapper(sessionOf([], ['identity.read', 'expense.write']), '/') })
    expect(await screen.findByRole('heading', { name: 'Identity' })).toBeTruthy()
    expect(tile('Equipment manager')).toBeNull()
    expect(tile('Expenses')).toBeNull()
  })

  it('redirects a typed app URL back to the launcher when the tile is hidden', async () => {
    render(<Shell deps={deps} />, { wrapper: sessionWrapper(sessionOf([], ['device.mgt.write']), '/devices/categories') })
    expect(await screen.findByText('No apps are available for your account')).toBeTruthy()
    expect(tile('Equipment manager')).toBeNull()
  })

  it('shows every tile to the super role', async () => {
    render(<Shell deps={deps} />, { wrapper: sessionWrapper(sessionOf(['super']), '/') })
    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeTruthy()
    expect(tile('Equipment manager')).toBeTruthy()
  })
})
