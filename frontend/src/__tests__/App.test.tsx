import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useGames', () => ({
  useGames: vi.fn(),
  useSubmitScore: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useGamification: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
}))

vi.mock('../games/PongCanvas', () => ({
  PongCanvas: () => <div data-testid="pong-canvas" />,
}))

import { useAuth } from '../hooks/useAuth'
import { useGames, useSubmitScore } from '../hooks/useGames'

describe('App games route', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/games')
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 2, email: 'alice@test.com', name: 'Alice', role: 'CHILD', color: '#10B981' },
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    ;(useGames as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { pong: { unlocked: false, personalBest: null, leaderboard: null } },
      isLoading: false,
      error: null,
    })
    ;(useSubmitScore as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
  })

  it('routes a locked child to the locked games state without rendering PongCanvas', () => {
    render(<App />)

    expect(screen.getByText('Pong is locked')).toBeInTheDocument()
    expect(screen.queryByTestId('pong-canvas')).not.toBeInTheDocument()
  })
})
