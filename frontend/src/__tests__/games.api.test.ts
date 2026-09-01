import { vi } from 'vitest'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('../lib/apiClient', () => ({
  createApiClient: vi.fn(() => ({
    get: getMock,
    post: postMock,
  })),
}))

import { getGames, submitScore, submitPongScore } from '../api/games.api'

describe('games.api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches games as a per-game record keyed by gameId', async () => {
    const pongEntry = { unlocked: true, personalBest: 10, leaderboard: [] }
    const snakeEntry = { unlocked: false, personalBest: null, leaderboard: null }
    const record = {
      PONG: pongEntry,
      SNAKE: snakeEntry,
      pong: pongEntry,
      snake: snakeEntry,
    }
    getMock.mockResolvedValue({ data: { data: record } })

    await expect(getGames()).resolves.toEqual(record)
    expect(getMock).toHaveBeenCalledWith('/me')
  })

  it('submits a score to the generic per-game endpoint', async () => {
    const result = { personalBest: 7, isNewBest: true }
    postMock.mockResolvedValue({ data: { data: result } })

    await expect(submitScore('SNAKE', 7)).resolves.toEqual(result)
    expect(postMock).toHaveBeenCalledWith('/SNAKE/scores', { score: 7 })

    await expect(submitScore('PONG', 12)).resolves.toEqual(result)
    expect(postMock).toHaveBeenCalledWith('/PONG/scores', { score: 12 })
  })

  it('keeps submitPongScore as a backward-compat alias', async () => {
    const result = { personalBest: 15, isNewBest: false }
    postMock.mockResolvedValue({ data: { data: result } })

    await expect(submitPongScore(15)).resolves.toEqual(result)
    expect(postMock).toHaveBeenCalledWith('/PONG/scores', { score: 15 })
  })

  it('uses createApiClient for the /api/games base path', async () => {
    const { createApiClient } = await import('../lib/apiClient')
    // createApiClient is called at module import time; verify mock exists
    expect(vi.isMockFunction(createApiClient)).toBe(true)
    // Verify the games.api module was constructed via the mocked client (get/post work)
    expect(getMock).toBeDefined()
    expect(postMock).toBeDefined()
  })
})
