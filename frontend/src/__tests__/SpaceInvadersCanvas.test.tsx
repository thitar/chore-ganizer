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
    fireShot: vi.fn(actual.fireShot),
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

    expect(context.fillRect).toHaveBeenCalledWith(
      600 - SHIP_WIDTH / 2,
      expect.any(Number),
      SHIP_WIDTH,
      expect.any(Number),
    )
  })

  it('fires a shot on a tap that stays within the tap radius', async () => {
    const { fireShot } = await import('../games/spaceInvaders')
    const { container } = render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    const down = new Event('pointerdown', { bubbles: true })
    Object.defineProperty(down, 'pointerId', { value: 1 })
    Object.defineProperty(down, 'clientX', { value: 200 })
    Object.defineProperty(down, 'clientY', { value: 100 })
    fireEvent(canvas, down)

    const up = new Event('pointerup', { bubbles: true })
    Object.defineProperty(up, 'clientX', { value: 202 })
    Object.defineProperty(up, 'clientY', { value: 101 })
    fireEvent(canvas, up)

    expect(fireShot).toHaveBeenCalled()
  })

  it('does not fire when the pointer drags beyond the tap radius', async () => {
    const { fireShot } = await import('../games/spaceInvaders')
    const { container } = render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    const down = new Event('pointerdown', { bubbles: true })
    Object.defineProperty(down, 'pointerId', { value: 1 })
    Object.defineProperty(down, 'clientX', { value: 200 })
    Object.defineProperty(down, 'clientY', { value: 100 })
    fireEvent(canvas, down)

    const move = new Event('pointermove', { bubbles: true })
    Object.defineProperty(move, 'clientX', { value: 260 })
    Object.defineProperty(move, 'clientY', { value: 100 })
    fireEvent(canvas, move)

    const up = new Event('pointerup', { bubbles: true })
    Object.defineProperty(up, 'clientX', { value: 260 })
    Object.defineProperty(up, 'clientY', { value: 100 })
    fireEvent(canvas, up)

    expect(fireShot).not.toHaveBeenCalled()
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

  it('reports game-over once when the board is cleared', () => {
    const onGameOver = vi.fn()
    spaceInvadersTestState.nextGame = { ...createSpaceInvadersGame(), score: 32, status: 'game-over', cleared: true }
    render(<SpaceInvadersCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()

    expect(onGameOver).toHaveBeenCalledOnce()
    expect(onGameOver).toHaveBeenCalledWith(32)
  })

  it('exposes restart during an active run', () => {
    const onRestart = vi.fn()
    render(<SpaceInvadersCanvas onGameOver={vi.fn()} onRestart={onRestart} runId={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart Space Invaders' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })
})
