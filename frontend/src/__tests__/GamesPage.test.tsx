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

const breakoutCanvasMock = vi.hoisted(() => ({
  onGameOver: undefined as ((score: number) => void) | undefined,
  onRestart: undefined as (() => void) | undefined,
  runId: undefined as number | undefined,
}))

const spaceInvadersCanvasMock = vi.hoisted(() => ({
  onGameOver: undefined as ((score: number) => void) | undefined,
  onRestart: undefined as (() => void) | undefined,
  runId: undefined as number | undefined,
}))

const flappyBirdCanvasMock = vi.hoisted(() => ({
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

vi.mock('../games/BreakoutCanvas', () => ({
  BreakoutCanvas: (props: { onGameOver: (score: number) => void; onRestart: () => void; runId: number }) => {
    breakoutCanvasMock.onGameOver = props.onGameOver
    breakoutCanvasMock.onRestart = props.onRestart
    breakoutCanvasMock.runId = props.runId
    return (
      <div data-testid="breakout-canvas">
        <button onClick={props.onRestart}>Restart Breakout</button>
      </div>
    )
  },
}))

vi.mock('../games/SpaceInvadersCanvas', () => ({
  SpaceInvadersCanvas: (props: { onGameOver: (score: number) => void; onRestart: () => void; runId: number }) => {
    spaceInvadersCanvasMock.onGameOver = props.onGameOver
    spaceInvadersCanvasMock.onRestart = props.onRestart
    spaceInvadersCanvasMock.runId = props.runId
    return (
      <div data-testid="space-invaders-canvas">
        <button onClick={props.onRestart}>Restart Space Invaders</button>
      </div>
    )
  },
}))

vi.mock('../games/FlappyBirdCanvas', () => ({
  FlappyBirdCanvas: (props: { onGameOver: (score: number) => void; onRestart: () => void; runId: number }) => {
    flappyBirdCanvasMock.onGameOver = props.onGameOver
    flappyBirdCanvasMock.onRestart = props.onRestart
    flappyBirdCanvasMock.runId = props.runId
    return (
      <div data-testid="flappy-bird-canvas">
        <button onClick={props.onRestart}>Restart Flappy Bird</button>
      </div>
    )
  },
}))

import { useAuth } from '../hooks/useAuth'
import { useGames, useSubmitScore } from '../hooks/useGames'
import type { GamesSummary, GameStatus } from '../api/games.api'

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

type GameData = GamesSummary

function gamesRecord(
  pong: GameStatus,
  snake: GameStatus,
  breakout: GameStatus = LOCKED,
  spaceInvaders: GameStatus = LOCKED,
  flappyBird: GameStatus = LOCKED,
): GameData {
  return {
    PONG: pong,
    SNAKE: snake,
    BREAKOUT: breakout,
    SPACE_INVADERS: spaceInvaders,
    FLAPPY_BIRD: flappyBird,
    pong,
    snake,
    breakout,
    space_invaders: spaceInvaders,
    flappy_bird: flappyBird,
  }
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
    breakoutCanvasMock.onGameOver = undefined
    breakoutCanvasMock.onRestart = undefined
    breakoutCanvasMock.runId = undefined
    spaceInvadersCanvasMock.onGameOver = undefined
    spaceInvadersCanvasMock.onRestart = undefined
    spaceInvadersCanvasMock.runId = undefined
    flappyBirdCanvasMock.onGameOver = undefined
    flappyBirdCanvasMock.onRestart = undefined
    flappyBirdCanvasMock.runId = undefined
    mockAuth()
    mockGames(defaultLocked())
    mockSubmit()
  })

  it('renders a GameCard per registry entry', () => {
    renderPage()
    expect(screen.getByTestId('game-card-PONG')).toBeInTheDocument()
    expect(screen.getByTestId('game-card-SNAKE')).toBeInTheDocument()
    expect(screen.getByTestId('game-card-BREAKOUT')).toBeInTheDocument()
    expect(screen.getByTestId('game-card-SPACE_INVADERS')).toBeInTheDocument()
    expect(screen.getByTestId('game-card-FLAPPY_BIRD')).toBeInTheDocument()
    expect(GAME_REGISTRY).toHaveLength(5)
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

  it('shows Breakout locked state while Pong and Snake are unlocked', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        LOCKED,
      ),
    )
    renderPage()

    expect(screen.getByText('Earn the 30 Chores badge to unlock Breakout.')).toBeInTheDocument()
    expect(screen.queryByTestId('breakout-canvas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Launch Breakout' })).not.toBeInTheDocument()
  })

  it('shows Space Invaders locked state while the other games are unlocked', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        LOCKED,
      ),
    )
    renderPage()

    expect(screen.getByText('Earn the 50 Chores badge to unlock Space Invaders.')).toBeInTheDocument()
    expect(screen.queryByTestId('space-invaders-canvas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Launch Space Invaders' })).not.toBeInTheDocument()
  })

  it('shows Flappy Bird locked state while the other games are unlocked', () => {
    mockGames(
      gamesRecord(
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        { unlocked: true, personalBest: null, leaderboard: [] },
        LOCKED,
      ),
    )
    renderPage()

    expect(screen.getByText('Earn the 100 Points badge to unlock Flappy Bird.')).toBeInTheDocument()
    expect(screen.queryByTestId('flappy-bird-canvas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Launch Flappy Bird' })).not.toBeInTheDocument()
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

  it('submits the final Breakout score via generic submitScore', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 50, isNewBest: true }))
    mockGames(gamesRecord(LOCKED, LOCKED, { unlocked: true, personalBest: null, leaderboard: null }))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Breakout' }))
    act(() => breakoutCanvasMock.onGameOver?.(50))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ gameId: 'BREAKOUT', score: 50 }))
    expect(screen.getByText('Breakout score: 50')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })

  it('submits the final Space Invaders score via generic submitScore', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 32, isNewBest: true }))
    mockGames(gamesRecord(LOCKED, LOCKED, LOCKED, { unlocked: true, personalBest: null, leaderboard: null }))
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Space Invaders' }))
    act(() => spaceInvadersCanvasMock.onGameOver?.(32))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ gameId: 'SPACE_INVADERS', score: 32 }))
    expect(screen.getByText('Space Invaders score: 32')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })

  it('submits the final Flappy Bird score via generic submitScore', async () => {
    const user = userEvent.setup()
    const mutateAsync = mockSubmit(vi.fn().mockResolvedValue({ personalBest: 6, isNewBest: true }))
    mockGames(
      gamesRecord(LOCKED, LOCKED, LOCKED, LOCKED, { unlocked: true, personalBest: null, leaderboard: null }),
    )
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Launch Flappy Bird' }))
    act(() => flappyBirdCanvasMock.onGameOver?.(6))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ gameId: 'FLAPPY_BIRD', score: 6 }))
    expect(screen.getByText('Flappy Bird score: 6')).toBeInTheDocument()
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
