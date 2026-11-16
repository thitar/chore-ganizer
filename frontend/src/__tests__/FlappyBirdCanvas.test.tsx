import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { BIRD_SIZE, createFlappyBirdGame, type FlappyBirdGame } from '../games/flappyBird'
import { FlappyBirdCanvas, GROUND_HEIGHT, birdTiltRadians } from '../games/FlappyBirdCanvas'

const flappyBirdTestState = vi.hoisted(() => ({
  nextGame: null as FlappyBirdGame | null,
}))

vi.mock('../games/flappyBird', async () => {
  const actual = await vi.importActual<typeof import('../games/flappyBird')>('../games/flappyBird')
  return {
    ...actual,
    advanceFlappyBirdGame: vi.fn((game: FlappyBirdGame, deltaSeconds: number) =>
      flappyBirdTestState.nextGame ?? actual.advanceFlappyBirdGame(game, deltaSeconds)),
    flap: vi.fn(actual.flap),
  }
})

const context = {
  fillStyle: '',
  fillRect: vi.fn(),
  font: '',
  textAlign: '',
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
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

describe('FlappyBirdCanvas', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    flappyBirdTestState.nextGame = null
    animationCallbacks = new Map()
    nextAnimationFrameId = 1

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
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

  it('flaps the bird on a pointer tap', async () => {
    const { flap } = await import('../games/flappyBird')
    const { container } = render(<FlappyBirdCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    fireEvent.pointerDown(canvas)

    expect(flap).toHaveBeenCalled()
  })

  it('flaps the bird on a touch tap fallback', async () => {
    const { flap } = await import('../games/flappyBird')
    const { container } = render(<FlappyBirdCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    fireEvent.touchStart(canvas)

    expect(flap).toHaveBeenCalled()
  })

  it('cancels the active animation frame on unmount', () => {
    const { unmount } = render(<FlappyBirdCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('stops animation and reports game-over only once', () => {
    const onGameOver = vi.fn()
    flappyBirdTestState.nextGame = { ...createFlappyBirdGame(), score: 4, status: 'game-over' }
    const { unmount } = render(<FlappyBirdCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()
    runNextFrame(32)

    expect(onGameOver).toHaveBeenCalledOnce()
    expect(onGameOver).toHaveBeenCalledWith(4)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('exposes restart during an active run', () => {
    const onRestart = vi.fn()
    render(<FlappyBirdCanvas onGameOver={vi.fn()} onRestart={onRestart} runId={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart Flappy Bird' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })
})

describe('birdTiltRadians', () => {
  it('snaps to the max climbing tilt right after a flap', () => {
    // FLAP_VELOCITY from flappyBird.ts is -320, well past the point where the
    // -25° clamp kicks in — matches the design spec's "-25° (climbing, right
    // after a flap)" rather than a proportional angle at that velocity.
    expect(birdTiltRadians(-320)).toBeCloseTo((-25 * Math.PI) / 180)
  })

  it('stays level at zero velocity', () => {
    expect(birdTiltRadians(0)).toBe(0)
  })

  it('clamps to the max diving tilt at the engine fall-speed cap', () => {
    // MAX_FALL_SPEED from flappyBird.ts is 500.
    expect(birdTiltRadians(500)).toBeCloseTo((90 * Math.PI) / 180)
  })

  it('never exceeds the max diving tilt beyond the fall-speed cap', () => {
    expect(birdTiltRadians(5000)).toBeCloseTo((90 * Math.PI) / 180)
  })
})

describe('ground strip vs. floor collision', () => {
  it('stays shallow enough that the bird cannot visibly sink far into it before the engine\'s floor collision fires', () => {
    // Regression (PR #257 review): the engine's floor collision only fires once
    // the bird's bottom edge reaches FLAPPY_BIRD_HEIGHT exactly (unchanged here
    // by design), so a ground band taller than the bird would let the bird
    // appear to sink fully into "solid" ground while still alive. Keeping the
    // band well under BIRD_SIZE bounds how much pre-death overlap is visible.
    expect(GROUND_HEIGHT).toBeLessThan(BIRD_SIZE / 2)
  })
})
