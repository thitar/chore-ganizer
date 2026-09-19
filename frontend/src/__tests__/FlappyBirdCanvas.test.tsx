import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createFlappyBirdGame, type FlappyBirdGame } from '../games/flappyBird'
import { FlappyBirdCanvas } from '../games/FlappyBirdCanvas'

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
