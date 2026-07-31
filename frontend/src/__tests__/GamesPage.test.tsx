import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { GamesPage } from '../pages/GamesPage'

const pongCanvasMock = vi.hoisted(() => ({
  onGameOver: undefined as ((score: number) => void) | undefined,
  onRestart: undefined as (() => void) | undefined,
  runId: undefined as number | undefined,
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useGames', () => ({
  useGames: vi.fn(),
  useSubmitPongScore: vi.fn(),
}))

vi.mock('../hooks/usePoints', () => ({
  useGamification: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
}))

vi.mock('../games/PongCanvas', () => ({
  PongCanvas: (props: { onGameOver: (score: number) => void; onRestart: () => void; runId: number }) => {
    pongCanvasMock.onGameOver = props.onGameOver
    pongCanvasMock.onRestart = props.onRestart
    pongCanvasMock.runId = props.runId
    return (
      <div data-testid="pong-canvas">
        <button onClick={props.onRestart}>Restart Pong</button>
      </div>
    )
  },
}))

import { useAuth } from '../hooks/useAuth'
import { useGames, useSubmitPongScore } from '../hooks/useGames'

const child = { id: 2, email: 'alice@test.com', name: 'Alice', role: 'CHILD', color: '#10B981' }
const parent = { id: 1, email: 'dad@test.com', name: 'Dad', role: 'PARENT', color: '#3B82F6' }

function mockAuth(user: typeof child | typeof parent = child) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
}

function mockGames(unlocked: boolean, leaderboard: Array<{ user: { id: number; name: string; color: string }; score: number }> | null, personalBest: number | null = null) {
  ;(useGames as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { pong: { unlocked, leaderboard, personalBest } },
    isLoading: false,
    error: null,
  })
}

function mockSubmit(mutateAsync = vi.fn().mockResolvedValue({ personalBest: 10, isNewBest: false })) {
  ;(useSubmitPongScore as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync,
    isPending: false,
  })
  return mutateAsync
}

function renderPage() {
  return render(
    <MemoryRouter>
      <GamesPage />
    </MemoryRouter>,
  )
}

describe('GamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pongCanvasMock.onGameOver = undefined
    pongCanvasMock.onRestart = undefined
    pongCanvasMock.runId = undefined
    mockAuth()
    mockGames(false, null)
    mockSubmit()
  })

  it('keeps a locked child from seeing the game or leaderboard', () => {
    renderPage()

    expect(screen.getByText('Earn the 10 Chores badge to unlock Pong.')).toBeInTheDocument()
    expect(screen.queryByTestId('pong-canvas')).not.toBeInTheDocument()
    expect(screen.queryByText('Pong leaderboard')).not.toBeInTheDocument()
  })

  it('shows an unlocked child leaderboard before launch', () => {
    mockGames(true, [{ user: { id: 2, name: 'Alice', color: '#10B981' }, score: 14 }], 14)
    renderPage()

    expect(screen.getByText('Pong leaderboard')).toBeInTheDocument()
    expect(screen.getAllByText('Alice')).toHaveLength(2)
    expect(screen.getAllByText('14', { exact: true })).toHaveLength(2)
    expect(screen.queryByTestId('pong-canvas')).not.toBeInTheDocument()
  })

  it('lets a parent play while omitting the child leaderboard', async () => {
    const user = userEvent.setup()
    mockAuth(parent)
    mockGames(true, null, 8)
    renderPage()

    expect(screen.getByText(/Best score:/)).toHaveTextContent('Best score: 8')
    expect(screen.queryByText('Pong leaderboard')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    expect(screen.getByTestId('pong-canvas')).toBeInTheDocument()
  })

  it('submits the final score and reports a new best score', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 21, isNewBest: true }))
    mockGames(true, null, 12)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    act(() => pongCanvasMock.onGameOver?.(21))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(21))
    expect(screen.getByText('Pong score: 21')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })

  it('keeps a failed score and retries submission without replaying', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ personalBest: 16, isNewBest: false })
    mockSubmit(mutateAsync)
    mockGames(true, null)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    act(() => pongCanvasMock.onGameOver?.(16))

    await waitFor(() => expect(screen.getByText('Unable to submit score.')).toBeInTheDocument())
    expect(screen.getByText('Pong score: 16')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry score' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Best score: 16', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Pong score: 16')).toBeInTheDocument()
  })

  it('restarts an active Pong run and clears its final submission state', async () => {
    const user = userEvent.setup()
    mockGames(true, null)
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    expect(pongCanvasMock.runId).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Restart Pong' }))

    expect(pongCanvasMock.runId).toBe(2)
    expect(screen.queryByText(/Pong score:/)).not.toBeInTheDocument()
  })

  it('uses Pong score labels instead of points labels', () => {
    mockGames(true, [{ user: { id: 2, name: 'Alice', color: '#10B981' }, score: 14 }], 14)
    renderPage()

    expect(screen.getByText(/Best score:/)).toHaveTextContent('Best score: 14')
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.queryByText('pts')).not.toBeInTheDocument()
  })
})
