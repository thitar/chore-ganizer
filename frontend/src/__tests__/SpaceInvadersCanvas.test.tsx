import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SHIP_WIDTH, createSpaceInvadersGame, type SpaceInvadersGame } from '../games/spaceInvaders'
import { SpaceInvadersCanvas } from '../games/SpaceInvadersCanvas'

const spaceInvadersTestState = vi.hoisted(() => ({
  nextGame: null as SpaceInvadersGame | null,
}))

vi.mock('../games/spaceInvaders', async () => {
  const actual = await vi.importActual<typeof import('../games/spaceInvaders')>('../games/spaceInvaders')
  return {
    ...actual,
    advanceSpaceInvadersGame: vi.fn((game: SpaceInvadersGame, deltaSeconds: number) =>
      spaceInvadersTestState.nextGame ?? actual.advanceSpaceInvadersGame(game, deltaSeconds)),
  }
})

const context = {
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: '',
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
} as unknown as CanvasRenderingContext2D

let animationCallbacks: Map<number, FrameRequestCallback>
let nextAnimationFrameId: number

function runNextFrame(timestamp = 16) {
  const callback = animationCallbacks.get(1)
  if (!callback) throw new Error('Expected an animation frame callback')
  callback(timestamp)
}

describe('SpaceInvadersCanvas', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    spaceInvadersTestState.nextGame = null
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

  it('persists pointer ship movement into the next rendered frame', () => {
    const { container } = render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    const pointerDown = new Event('pointerdown', { bubbles: true })
    Object.defineProperty(pointerDown, 'pointerId', { value: 1 })
    Object.defineProperty(pointerDown, 'clientX', { value: 310 })
    Object.defineProperty(pointerDown, 'clientY', { value: 100 })
    fireEvent(canvas, pointerDown)
    runNextFrame()

    // The ship is drawn as a multi-cell pixel-art sprite (not one solid rect), so
    // assert its leftmost column landed at the moved-to x rather than a single
    // full-width fillRect call.
    const expectedShipX = 600 - SHIP_WIDTH / 2
    const leftColumnCalls = (context.fillRect as ReturnType<typeof vi.fn>).mock.calls.filter(
      call => call[0] === expectedShipX,
    )
    expect(leftColumnCalls.length).toBeGreaterThan(0)
  })

  it('advances and fires without requiring any fire input (auto-fire lives in the engine)', () => {
    render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    // No pointerdown/up at all — just let frames run. Auto-fire is engine-driven
    // (see spaceInvaders.test.ts), so the canvas has nothing to assert here beyond
    // "it doesn't crash and keeps requesting frames without any fire gesture."
    runNextFrame()
    runNextFrame(600)

    expect(requestAnimationFrame).toHaveBeenCalledTimes(3)
  })

  it('shows a level-up flash on the frame the engine reports leveledUp', () => {
    spaceInvadersTestState.nextGame = { ...createSpaceInvadersGame(), level: 2, leveledUp: true }
    render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    runNextFrame(100)

    expect(context.fillText).toHaveBeenCalledWith('Level 2!', expect.any(Number), expect.any(Number))
  })

  it('draws an explosion on the frame the engine reports lastKilled, including a wave-clearing kill', () => {
    // Regression: this used to be inferred by diffing enemy arrays across frames,
    // which specifically missed the wave-clearing kill because the engine rebuilds
    // a full new (all-alive) wave in the same tick it reports that kill.
    spaceInvadersTestState.nextGame = {
      ...createSpaceInvadersGame(),
      level: 2,
      leveledUp: true,
      lastKilled: { x: 100, y: 200, width: 82, height: 32 },
    }
    render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    runNextFrame(100)

    expect(context.arc).toHaveBeenCalledWith(100 + 41, 200 + 16, expect.any(Number), 0, Math.PI * 2)
  })

  it('does not report game-over when a wave clears into the next level', () => {
    const onGameOver = vi.fn()
    spaceInvadersTestState.nextGame = { ...createSpaceInvadersGame(), level: 2, status: 'playing' }
    render(<SpaceInvadersCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()

    expect(onGameOver).not.toHaveBeenCalled()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  it('cancels the active animation frame on unmount', () => {
    const { unmount } = render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('stops animation and reports game-over only once', () => {
    const onGameOver = vi.fn()
    spaceInvadersTestState.nextGame = { ...createSpaceInvadersGame(), score: 7, status: 'game-over' }
    const { unmount } = render(<SpaceInvadersCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()
    runNextFrame(32)

    expect(onGameOver).toHaveBeenCalledOnce()
    expect(onGameOver).toHaveBeenCalledWith(7)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('exposes restart during an active run', () => {
    const onRestart = vi.fn()
    render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={onRestart} runId={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart Space Invaders' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })
})
