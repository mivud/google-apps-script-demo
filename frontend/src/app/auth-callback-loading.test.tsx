// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp, setupDomTests } from '../shared/testing/render-app'
import { AuthCallbackLoading } from './auth-callback-loading'

setupDomTests()

describe('AuthCallbackLoading', () => {
  it('shows a spinner with the signing-in text', () => {
    renderApp(<AuthCallbackLoading />)
    expect(screen.getByText(/signing in/i)).toBeTruthy()
    expect(screen.getByRole('main')).toBeTruthy()
  })
})
