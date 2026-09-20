import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PADDLE_HEIGHT, PADDLE_WIDTH, BREAKOUT_HEIGHT, createBreakoutGame, type BreakoutGame } from '../games/breakout'
import { BreakoutCanvas } from '../games/BreakoutCanvas'

const breakoutTestState = vi.hoisted(() => ({
  nextGame: null as BreakoutGame | null,
}))

vi.mock('../games/breakout', async () => {
  const actual = await vi.importActual<typeof import('../games/breakout')>('../games/breakout')
  return {
    ...actual,
    advanceBreakoutGame: vi.fn((game: BreakoutGame, deltaSeconds: number) =>
      breakoutTestState.nextGame ?? actual.advanceBreakoutGame(game, deltaSeconds)),
  }
})

const context = {
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: '',
  fillText: vi.fn(),
} as unknown as CanvasRenderingContext2D

let animationCallbacks: Map<number, FrameRequestCallback>
let nextAnimationFrameId: number

function runNextFrame(timestamp = 16) {
  const callback = animationCallbacks.get(1)
  if (!callback) throw new Error('Expected an animation frame callback')
  callback(timestamp)
}

describe('BreakoutCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    breakoutTestState.nextGame = null
    animationCallbacks = new Map()
    nextAnimationFrameId = 1

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      width: 400,
      top: 0,
      right: 410,
      bottom: 250,
      height: 250,
      x: 10,
      y: 0,
      toJSON: vi.fn(),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextAnimationFrameId++
      animationCallbacks.set(id, callback)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
      animationCallbacks.delete(id)
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('persists pointer paddle movement into the next rendered frame', () => {
    const { container } = render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    const pointerMove = new Event('pointermove', { bubbles: true })
    Object.defineProperty(pointerMove, 'clientX', { value: 310 })
    fireEvent(canvas, pointerMove)
    runNextFrame()

    expect(context.fillRect).toHaveBeenCalledWith(
      540,
      BREAKOUT_HEIGHT - PADDLE_HEIGHT - 24,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    )
  })

  it('cancels the active animation frame on unmount', () => {
    const { unmount } = render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('stops animation and reports game-over only once', () => {
    const onGameOver = vi.fn()
    breakoutTestState.nextGame = { ...createBreakoutGame(), score: 7, status: 'game-over' }
    const { unmount } = render(<BreakoutCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()
    runNextFrame(32)

    expect(onGameOver).toHaveBeenCalledOnce()
    expect(onGameOver).toHaveBeenCalledWith(7)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('does not report game-over when a wave clears into the next level', () => {
    const onGameOver = vi.fn()
    breakoutTestState.nextGame = { ...createBreakoutGame(), score: 60, level: 2, leveledUp: true, status: 'playing' }
    render(<BreakoutCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()

    expect(onGameOver).not.toHaveBeenCalled()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  it('shows a level-up flash on the frame the engine reports leveledUp', () => {
    breakoutTestState.nextGame = { ...createBreakoutGame(), level: 2, leveledUp: true }
    render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    runNextFrame(100)

    expect(context.fillText).toHaveBeenCalledWith('Level 2!', expect.any(Number), expect.any(Number))
  })

  it('shows a life-lost flash on the frame the engine reports lifeLost', () => {
    breakoutTestState.nextGame = { ...createBreakoutGame(), lives: 2, lifeLost: true }
    render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    runNextFrame(100)

    expect(context.fillText).toHaveBeenCalledWith('Life lost!', expect.any(Number), expect.any(Number))
  })

  it('shows the more-recently-triggered flash when a life is lost during an active level-up flash', () => {
    // Regression: an `if / else if` on two independent timers let the level-up
    // flash starve the life-lost flash for its whole window even when the life
    // was lost afterward, so the player got no feedback at the moment it happened.
    breakoutTestState.nextGame = { ...createBreakoutGame(), level: 2, leveledUp: true }
    render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    runNextFrame(100)

    breakoutTestState.nextGame = { ...createBreakoutGame(), lives: 2, lifeLost: true, leveledUp: false }
    runNextFrame(300)

    expect(context.fillText).toHaveBeenCalledWith('Life lost!', expect.any(Number), expect.any(Number))
  })

  it('draws every ball in play, not just one', () => {
    breakoutTestState.nextGame = {
      ...createBreakoutGame(),
      balls: [
        { x: 10, y: 20, vx: 0, vy: 100, speed: 100, size: 14 },
        { x: 200, y: 300, vx: 0, vy: 100, speed: 100, size: 14 },
      ],
    }
    render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    runNextFrame()

    expect(context.fillRect).toHaveBeenCalledWith(10, 20, 14, 14)
    expect(context.fillRect).toHaveBeenCalledWith(200, 300, 14, 14)
  })

  it('exposes restart during an active run', () => {
    const onRestart = vi.fn()
    render(<BreakoutCanvas onGameOver={vi.fn()} onRestart={onRestart} runId={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart Breakout' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })
})
