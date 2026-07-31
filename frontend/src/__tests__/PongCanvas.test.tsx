import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { PADDLE_HEIGHT, PADDLE_WIDTH, PONG_HEIGHT, createPongGame, type PongGame } from '../games/pong'
import { PongCanvas } from '../games/PongCanvas'

const pongTestState = vi.hoisted(() => ({
  nextGame: null as PongGame | null,
}))

vi.mock('../games/pong', async () => {
  const actual = await vi.importActual<typeof import('../games/pong')>('../games/pong')
  return {
    ...actual,
    advancePongGame: vi.fn((game: PongGame, deltaSeconds: number) =>
      pongTestState.nextGame ?? actual.advancePongGame(game, deltaSeconds)),
  }
})

const context = {
  fillStyle: '',
  fillRect: vi.fn(),
  setLineDash: vi.fn(),
  strokeStyle: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
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

describe('PongCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pongTestState.nextGame = null
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
    const { container } = render(<PongCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)
    const canvas = container.querySelector('canvas')!

    const pointerMove = new Event('pointermove', { bubbles: true })
    Object.defineProperty(pointerMove, 'clientX', { value: 310 })
    fireEvent(canvas, pointerMove)
    runNextFrame()

    expect(context.fillRect).toHaveBeenCalledWith(
      540,
      PONG_HEIGHT - PADDLE_HEIGHT - 24,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    )
  })

  it('cancels the active animation frame on unmount', () => {
    const { unmount } = render(<PongCanvas onGameOver={vi.fn()} onRestart={vi.fn()} runId={0} />)

    unmount()

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('stops animation and reports game-over only once', () => {
    const onGameOver = vi.fn()
    pongTestState.nextGame = { ...createPongGame(), score: 7, status: 'game-over' }
    const { unmount } = render(<PongCanvas onGameOver={onGameOver} onRestart={vi.fn()} runId={0} />)

    runNextFrame()
    runNextFrame(32)

    expect(onGameOver).toHaveBeenCalledOnce()
    expect(onGameOver).toHaveBeenCalledWith(7)
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('exposes restart during an active run', () => {
    const onRestart = vi.fn()
    render(<PongCanvas onGameOver={vi.fn()} onRestart={onRestart} runId={0} />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart Pong' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })
})
