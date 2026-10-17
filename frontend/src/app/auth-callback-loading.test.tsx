// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, setupDomTests } from '../shared/testing/render-app'
import { AuthCallbackLoading } from './auth-callback-loading'

setupDomTests()

describe('AuthCallbackLoading', () => {
  it('shows a spinner with the signing-in text', () => {
    renderApp(<AuthCallbackLoading />)
    // The spinner label and the visible text both read "Signing in", so assert on the spinner itself.
    expect(screen.getByRole('status').textContent).toMatch(/signing in/i)
    expect(screen.getByRole('main')).toBeTruthy()
  })
})
