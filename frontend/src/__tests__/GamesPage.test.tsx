import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { GamesPage } from '../pages/GamesPage'
import { GAME_REGISTRY } from '../games/registry'

const pongCanvasMock = vi.hoisted(() => ({
  onGameOver: undefined as ((score: number) => void) | undefined,
  onRestart: undefined as (() => void) | undefined,
  runId: undefined as number | undefined,
}))

const snakeCanvasMock = vi.hoisted(() => ({
  onGameOver: undefined as ((score: number) => void) | undefined,
  onRestart: undefined as (() => void) | undefined,
  runId: undefined as number | undefined,
}))

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

vi.mock('../games/SnakeCanvas', () => ({
  SnakeCanvas: (props: { onGameOver: (score: number) => void; onRestart: () => void; runId: number }) => {
    snakeCanvasMock.onGameOver = props.onGameOver
    snakeCanvasMock.onRestart = props.onRestart
    snakeCanvasMock.runId = props.runId
    return (
      <div data-testid="snake-canvas">
        <button onClick={props.onRestart}>Restart Snake</button>
      </div>
    )
  },
}))

import { useAuth } from '../hooks/useAuth'
import { useGames, useSubmitScore } from '../hooks/useGames'

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

type GameData = Record<string, { unlocked: boolean; personalBest: number | null; leaderboard: Array<{ user: { id: number; name: string; color: string }; score: number }> | null }>
type GameStatus = GameData[string]

function gamesRecord(pong: GameStatus, snake: GameStatus): GameData {
  return { PONG: pong, SNAKE: snake, pong, snake }
}

const LOCKED: GameStatus = { unlocked: false, personalBest: null, leaderboard: null }

function mockGames(data: GameData) {
  ;(useGames as ReturnType<typeof vi.fn>).mockReturnValue({
    data,
    isLoading: false,
    error: null,
  })
}

function defaultLocked(): GameData {
  return gamesRecord(LOCKED, LOCKED)
}

function mockSubmit(mutateAsync = vi.fn().mockResolvedValue({ personalBest: 10, isNewBest: false })) {
  ;(useSubmitScore as ReturnType<typeof vi.fn>).mockReturnValue({
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
    snakeCanvasMock.onGameOver = undefined
    snakeCanvasMock.onRestart = undefined
    snakeCanvasMock.runId = undefined
    mockAuth()
    mockGames(defaultLocked())
    mockSubmit()
  })

  it('renders a GameCard per registry entry', () => {
    renderPage()
    expect(screen.getByTestId('game-card-PONG')).toBeInTheDocument()
    expect(screen.getByTestId('game-card-SNAKE')).toBeInTheDocument()
    expect(GAME_REGISTRY).toHaveLength(2)
  })

  it('keeps a locked child from seeing the game or leaderboard (Pong locked)', () => {
    renderPage()

    expect(screen.getByText('Earn the 10 Chores badge to unlock Pong.')).toBeInTheDocument()
    expect(screen.queryByTestId('pong-canvas')).not.toBeInTheDocument()
    expect(screen.queryByText('Pong leaderboard')).not.toBeInTheDocument()
  })

  it('shows Snake locked state while Pong is unlocked', () => {
    mockGames(gamesRecord({ unlocked: true, personalBest: null, leaderboard: [] }, LOCKED))
    renderPage()

    expect(screen.getByText('Earn the 20 Chores badge to unlock Snake.')).toBeInTheDocument()
    expect(screen.queryByTestId('snake-canvas')).not.toBeInTheDocument()
    // Pong should still be playable
    expect(screen.getByRole('button', { name: 'Launch Pong' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Launch Snake' })).not.toBeInTheDocument()
  })

  it('hides Snake leaderboard before first child unlock', () => {
    mockGames(gamesRecord({ unlocked: true, personalBest: null, leaderboard: [] }, LOCKED))
    renderPage()

    expect(screen.getByText('Pong leaderboard')).toBeInTheDocument()
    expect(screen.queryByText('Snake leaderboard')).not.toBeInTheDocument()
  })

  it('shows Snake leaderboard after unlock', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: 5, leaderboard: [] },
        { unlocked: true, personalBest: 7, leaderboard: [{ user: { id: 2, name: 'Alice', color: '#10B981' }, score: 7 }] },
      ),
    )
    renderPage()

    expect(screen.getByText('Snake leaderboard')).toBeInTheDocument()
    // Alice appears in Snake leaderboard (Pong leaderboard is empty -> No scores yet)
    expect(screen.getByText('Snake leaderboard').parentElement?.textContent).toContain('Alice')
  })

  it('shows an unlocked child leaderboard before launch', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: 14, leaderboard: [{ user: { id: 2, name: 'Alice', color: '#10B981' }, score: 14 }] },
        LOCKED,
      ),
    )
    renderPage()

    expect(screen.getByText('Pong leaderboard')).toBeInTheDocument()
    // Alice appears in nav + leaderboard = 2
    expect(screen.getAllByText('Alice')).toHaveLength(2)
    expect(screen.queryByTestId('pong-canvas')).not.toBeInTheDocument()
  })

  it('lets a parent play while omitting the child leaderboard', async () => {
    const user = userEvent.setup()
    mockAuth(parent)
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: 8, leaderboard: null },
        { unlocked: true, personalBest: null, leaderboard: null },
      ),
    )
    renderPage()

    expect(screen.getAllByText(/Best score:/)[0].textContent).toContain('8')
    expect(screen.queryByText('Pong leaderboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Snake leaderboard')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    expect(screen.getByTestId('pong-canvas')).toBeInTheDocument()
  })

  it('submits the final Pong score via generic submitScore and reports a new best score', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 21, isNewBest: true }))
    mockGames(gamesRecord({ unlocked: true, personalBest: 12, leaderboard: null }, LOCKED))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    act(() => pongCanvasMock.onGameOver?.(21))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ gameId: 'PONG', score: 21 }))
    expect(screen.getByText('Pong score: 21')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })

  it('submits the final Snake score via generic submitScore', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 9, isNewBest: true }))
    mockGames(gamesRecord(LOCKED, { unlocked: true, personalBest: null, leaderboard: null }))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Snake' }))
    act(() => snakeCanvasMock.onGameOver?.(9))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ gameId: 'SNAKE', score: 9 }))
    expect(screen.getByText('Snake score: 9')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })

  it('keeps a failed score and retries submission without replaying', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ personalBest: 16, isNewBest: false })
    mockSubmit(mutateAsync)
    mockGames(gamesRecord({ unlocked: true, personalBest: null, leaderboard: null }, LOCKED))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    act(() => pongCanvasMock.onGameOver?.(16))

    await waitFor(() => expect(screen.getByText('Unable to submit score.')).toBeInTheDocument())
    expect(screen.getByText('Pong score: 16')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry score' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2))
    expect(mutateAsync).toHaveBeenNthCalledWith(2, { gameId: 'PONG', score: 16 })
    expect(screen.getByText('Best score: 16', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Pong score: 16')).toBeInTheDocument()
  })

  it('restarts an active Pong run and clears its final submission state', async () => {
    const user = userEvent.setup()
    mockGames(gamesRecord({ unlocked: true, personalBest: null, leaderboard: null }, LOCKED))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Pong' }))
    expect(pongCanvasMock.runId).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Restart Pong' }))

    expect(pongCanvasMock.runId).toBe(2)
    expect(screen.queryByText(/Pong score:/)).not.toBeInTheDocument()
  })

  it('restarts an active Snake run and clears its final submission state', async () => {
    const user = userEvent.setup()
    mockGames(gamesRecord(LOCKED, { unlocked: true, personalBest: null, leaderboard: null }))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Snake' }))
    expect(snakeCanvasMock.runId).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Restart Snake' }))

    expect(snakeCanvasMock.runId).toBe(2)
    expect(screen.queryByText(/Snake score:/)).not.toBeInTheDocument()
  })

  it('uses Pong score labels instead of points labels', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: 14, leaderboard: [{ user: { id: 2, name: 'Alice', color: '#10B981' }, score: 14 }] },
        LOCKED,
      ),
    )
    renderPage()

    expect(screen.getAllByText(/Best score:/)[0].textContent).toContain('Best score: 14')
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.queryByText('pts')).not.toBeInTheDocument()
  })
})
