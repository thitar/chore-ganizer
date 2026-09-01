import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { useGames, useSubmitScore } from '../hooks/useGames'

vi.unmock('../hooks/useGames')
vi.mock('../api/games.api', () => ({
  getGames: vi.fn(),
  submitScore: vi.fn(),
  submitPongScore: vi.fn(),
}))

import { getGames, submitScore } from '../api/games.api'

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGames', () => {
  it('refetches eligibility when mounted again despite the app default stale time', async () => {
    vi.mocked(getGames).mockResolvedValue({
      PONG: { unlocked: false, personalBest: null, leaderboard: null },
      SNAKE: { unlocked: false, personalBest: null, leaderboard: null },
      pong: { unlocked: false, personalBest: null, leaderboard: null },
      snake: { unlocked: false, personalBest: null, leaderboard: null },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
    })
    const wrapper = createWrapper(queryClient)

    const first = renderHook(() => useGames(), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(getGames).toHaveBeenCalledTimes(2))
  })

  it('returns a per-game record keyed by gameId', async () => {
    const pongEntry = { unlocked: true, personalBest: 12, leaderboard: [] as never[] }
    const snakeEntry = { unlocked: false, personalBest: null, leaderboard: null as null }
    vi.mocked(getGames).mockResolvedValue({
      PONG: pongEntry,
      SNAKE: snakeEntry,
      pong: pongEntry,
      snake: snakeEntry,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useGames(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      PONG: pongEntry,
      SNAKE: snakeEntry,
      pong: pongEntry,
      snake: snakeEntry,
    })
    expect(result.current.data!.SNAKE.unlocked).toBe(false)
    expect(result.current.data!.PONG.unlocked).toBe(true)
    expect(result.current.data!.PONG.personalBest).toBe(12)
  })
})

describe('useSubmitScore', () => {
  it('submits a score for the given gameId and invalidates games', async () => {
    vi.mocked(submitScore).mockResolvedValue({ personalBest: 10, isNewBest: true })
    vi.mocked(getGames).mockResolvedValue({
      PONG: { unlocked: true, personalBest: null, leaderboard: null },
      SNAKE: { unlocked: true, personalBest: null, leaderboard: null },
      pong: { unlocked: true, personalBest: null, leaderboard: null },
      snake: { unlocked: true, personalBest: null, leaderboard: null },
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useSubmitScore(), { wrapper })

    await result.current.mutateAsync({ gameId: 'SNAKE', score: 10 })

    expect(submitScore).toHaveBeenCalledWith('SNAKE', 10)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['games'] }))
  })

  it('submits a PONG score through the generic endpoint', async () => {
    vi.mocked(submitScore).mockResolvedValue({ personalBest: 15, isNewBest: false })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = createWrapper(queryClient)

    const { result } = renderHook(() => useSubmitScore(), { wrapper })

    await result.current.mutateAsync({ gameId: 'PONG', score: 15 })

    expect(submitScore).toHaveBeenCalledWith('PONG', 15)
  })
})
