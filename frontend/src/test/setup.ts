import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// AppShell mounts navigation outside a QueryClientProvider in several page tests.
// Keep those tests isolated while TopNav.test.tsx supplies its own states.
vi.mock('../hooks/useGames', () => ({
  useGames: vi.fn().mockReturnValue({ data: undefined, isLoading: false, error: null }),
}))

// jsdom's HTMLDialogElement has no showModal()/close() implementation at all
// (verified against jsdom's HTMLDialogElement-impl.js, which is an empty stub).
// Polyfill just enough real <dialog> behavior — including throwing on a
// redundant showModal() call, matching real browsers — so components using
// native <dialog> are testable.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    if (this.hasAttribute('open')) {
      throw new DOMException(
        "Failed to execute 'showModal' on 'HTMLDialogElement': The element already has an 'open' attribute, and therefore cannot be opened modally.",
        'InvalidStateError'
      )
    }
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// Cleanup after each test
afterEach(() => {
  cleanup()
})
