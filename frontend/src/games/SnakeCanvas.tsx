import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import {
  SNAKE_CANVAS_SIZE,
  SNAKE_GRID_HEIGHT,
  SNAKE_GRID_WIDTH,
  advanceSnakeGame,
  createSnakeGame,
  steerSnake,
  type SnakeDirection,
  type SnakeGame,
} from './snake'

interface SnakeCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

const CELL = SNAKE_CANVAS_SIZE / SNAKE_GRID_WIDTH
const SWIPE_THRESHOLD_PX = 20

function directionFromSwipe(dx: number, dy: number): SnakeDirection | null {
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return null
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  }
  return dy > 0 ? 'down' : 'up'
}

function drawGame(context: CanvasRenderingContext2D, game: SnakeGame) {
  // Background
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE)

  // Subtle grid
  context.strokeStyle = '#1e1e2e'
  context.lineWidth = 1
  for (let x = 1; x < SNAKE_GRID_WIDTH; x++) {
    const px = x * CELL
    context.beginPath()
    context.moveTo(px, 0)
    context.lineTo(px, SNAKE_CANVAS_SIZE)
    context.stroke()
  }
  for (let y = 1; y < SNAKE_GRID_HEIGHT; y++) {
    const py = y * CELL
    context.beginPath()
    context.moveTo(0, py)
    context.lineTo(SNAKE_CANVAS_SIZE, py)
    context.stroke()
  }

  // Apple
  context.fillStyle = '#ef4444'
  const applePad = 3
  context.fillRect(
    game.apple.x * CELL + applePad,
    game.apple.y * CELL + applePad,
    CELL - applePad * 2,
    CELL - applePad * 2,
  )

  // Snake
  game.snake.forEach((segment, idx) => {
    context.fillStyle = idx === 0 ? '#22c55e' : '#16a34a'
    const pad = idx === 0 ? 1 : 2
    context.fillRect(segment.x * CELL + pad, segment.y * CELL + pad, CELL - pad * 2, CELL - pad * 2)
  })

  // Score
  context.fillStyle = '#a1a1aa'
  context.font = '600 16px Space Grotesk, sans-serif'
  context.textAlign = 'left'
  context.fillText(`Score: ${game.score}`, 10, 20)

  // Game over overlay text baked into canvas for immediate feedback
  if (game.status === 'game-over') {
    context.fillStyle = 'rgba(17, 17, 26, 0.85)'
    context.fillRect(0, 0, SNAKE_CANVAS_SIZE, SNAKE_CANVAS_SIZE)
    context.fillStyle = '#f5f3ff'
    context.font = '700 28px Space Grotesk, sans-serif'
    context.textAlign = 'center'
    context.fillText('Game Over', SNAKE_CANVAS_SIZE / 2, SNAKE_CANVAS_SIZE / 2 - 10)
    context.fillStyle = '#a1a1aa'
    context.font = '500 16px Space Grotesk, sans-serif'
    context.fillText(`Score: ${game.score}`, SNAKE_CANVAS_SIZE / 2, SNAKE_CANVAS_SIZE / 2 + 18)
  }
}

export function SnakeCanvas({ onGameOver, onRestart, runId }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<SnakeGame>(createSnakeGame())
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let animationFrame = 0
    let lastTimestamp: number | null = null
    let active = true
    let gameOverReported = false

    gameRef.current = createSnakeGame()
    drawGame(context, gameRef.current)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advanceSnakeGame(gameRef.current, deltaSeconds)
      drawGame(context, gameRef.current)

      if (gameRef.current.status === 'game-over') {
        if (!gameOverReported) {
          gameOverReported = true
          onGameOverRef.current(gameRef.current.score)
        }
        return
      }

      animationFrame = requestAnimationFrame(frame)
    }

    animationFrame = requestAnimationFrame(frame)

    return () => {
      active = false
      cancelAnimationFrame(animationFrame)
    }
  }, [runId])

  function handleSwipe(direction: SnakeDirection) {
    gameRef.current = steerSnake(gameRef.current, direction)
  }

  // Pointer-based swipe (covers touch + mouse drag); threshold defined above
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    swipeStartRef.current = { x: event.clientX, y: event.clientY }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const dir = directionFromSwipe(dx, dy)
    if (dir) handleSwipe(dir)
  }

  function handlePointerCancel() {
    swipeStartRef.current = null
  }

  // Fallback touch handlers for browsers that don't fire pointer events for touch
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>) {
    const t = event.touches[0]
    if (!t) return
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLCanvasElement>) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const t = event.changedTouches[0]
    if (!t) return
    const dir = directionFromSwipe(t.clientX - start.x, t.clientY - start.y)
    if (dir) handleSwipe(dir)
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={SNAKE_CANVAS_SIZE}
        height={SNAKE_CANVAS_SIZE}
        aria-label="Snake game"
        className="aspect-square w-full touch-none rounded-2xl border border-edge bg-[#11111a]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <Button variant="secondary" onClick={onRestart}>
        Restart Snake
      </Button>
    </div>
  )
}
