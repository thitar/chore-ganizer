import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

vi.mock('../api/games.api', () => ({
  getGames: vi.fn().mockResolvedValue({
    pong: { unlocked: false, personalBest: null, leaderboard: null },
  }),
  submitPongScore: vi.fn(),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
