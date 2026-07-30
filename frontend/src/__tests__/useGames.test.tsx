import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { useGames } from '../hooks/useGames'

vi.unmock('../hooks/useGames')
vi.mock('../api/games.api', () => ({
  getGames: vi.fn(),
  submitPongScore: vi.fn(),
}))

import { getGames } from '../api/games.api'

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGames', () => {
  it('refetches eligibility when mounted again despite the app default stale time', async () => {
    vi.mocked(getGames).mockResolvedValue({
      pong: { unlocked: false, personalBest: null, leaderboard: null },
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
})
