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

// Cleanup after each test
afterEach(() => {
  cleanup()
})
