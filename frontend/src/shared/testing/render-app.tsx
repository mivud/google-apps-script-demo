import { cleanup, configure, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'
import { Providers } from './providers'

// jsdom has no modal <dialog>, so showModal/close only toggle the open attribute.
function polyfillDialog() {
  const proto = window.HTMLDialogElement.prototype
  proto.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function close(this: HTMLDialogElement) { this.removeAttribute('open') }
}

// Shared CI runners can take longer than the 1s default to settle lazy pages and skeletons.
const ASYNC_UTIL_TIMEOUT_MS = 5000
const TEST_TIMEOUT_MS = 15000

// Call once at the top of a component test file (files using it start with `// @vitest-environment jsdom`).
export function setupDomTests() {
  configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS })
  vi.setConfig({ testTimeout: TEST_TIMEOUT_MS })
  beforeEach(() => {
    window.localStorage.clear()
    polyfillDialog()
  })
  afterEach(cleanup)
}

// The wrapper also applies to rerender(), so a re-rendered tree keeps its providers.
export function renderApp(ui: ReactElement) {
  return render(ui, { wrapper: Providers })
}
