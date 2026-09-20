import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import {
  FLAPPY_BIRD_HEIGHT,
  FLAPPY_BIRD_WIDTH,
  advanceFlappyBirdGame,
  createFlappyBirdGame,
  flap,
  type Bird,
  type FlappyBirdGame,
} from './flappyBird'

interface FlappyBirdCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

// 8x8 pixel-art bitmaps. Digits index into a color map (0 = transparent) so a
// single bitmap can carry body + eye markings; the wing is a separate overlay
// bitmap swapped each animation frame for the flap cycle.
type Bitmap = readonly (readonly number[])[]

const BIRD_BODY: Bitmap = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 2, 2, 0],
  [1, 1, 1, 1, 1, 2, 3, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

const BIRD_WING_UP: Bitmap = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 4, 4, 0, 0, 0, 0],
  [4, 4, 4, 4, 4, 0, 0, 0],
  [0, 4, 4, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const BIRD_WING_DOWN: Bitmap = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 4, 4, 0, 0, 0, 0],
  [4, 4, 4, 4, 4, 0, 0, 0],
  [0, 4, 4, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const BIRD_COLORS: Record<number, string> = {
  1: '#facc15',
  2: '#f8fafc',
  3: '#111827',
  4: '#ca8a04',
}

const FLAP_ANIMATION_INTERVAL_MS = 120

// Tilt clamp range from the design spec: nose-up right after a flap, nose-down
// as the bird dives. `TILT_VELOCITY_RANGE` is a render-only tuning constant
// (mirrors the engine's fall-speed cap for a natural-feeling ramp) — it's not
// read from flappyBird.ts, which doesn't export its internal physics tuning.
const TILT_MAX_UP_RAD = (-25 * Math.PI) / 180
const TILT_MAX_DOWN_RAD = (90 * Math.PI) / 180
const TILT_VELOCITY_RANGE = 500

const GROUND_HEIGHT = 28
const PIPE_CAP_HEIGHT = 24
const PIPE_CAP_OVERHANG = 6

const CLOUDS = [
  { x: 90, y: 80, r: 18 },
  { x: 340, y: 55, r: 14 },
  { x: 560, y: 100, r: 20 },
  { x: 720, y: 65, r: 12 },
]

// Fixed dirt-clump texture for the ground strip — deterministic and cheap to
// redraw every frame, same technique as Space Invaders' STARS array.
const GROUND_TEXTURE = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 41) % FLAPPY_BIRD_WIDTH,
  width: 8 + (i % 3) * 4,
}))

function drawColorBitmap(
  context: CanvasRenderingContext2D,
  bitmap: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: Record<number, string>,
) {
  const rows = bitmap.length
  const cols = bitmap[0].length
  const cellWidth = width / cols
  const cellHeight = height / rows
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = bitmap[row][col]
      if (!value) continue
      context.fillStyle = colors[value]
      context.fillRect(x + col * cellWidth, y + row * cellHeight, cellWidth + 0.5, cellHeight + 0.5)
    }
  }
}

function drawBeak(context: CanvasRenderingContext2D, size: number) {
  const cell = size / 8
  context.fillStyle = '#f97316'
  context.fillRect(8 * cell, 3 * cell, cell * 1.5, cell * 1.5)
  context.fillRect(8 * cell, 4.5 * cell, cell, cell)
}

export function birdTiltRadians(vy: number): number {
  const ratio = vy / TILT_VELOCITY_RANGE
  return Math.max(TILT_MAX_UP_RAD, Math.min(TILT_MAX_DOWN_RAD, ratio * TILT_MAX_DOWN_RAD))
}

function drawBird(context: CanvasRenderingContext2D, bird: Bird, timestamp: number) {
  const centerX = bird.x + bird.size / 2
  const centerY = bird.y + bird.size / 2
  const angle = birdTiltRadians(bird.vy)
  const wingFrame = Math.floor(timestamp / FLAP_ANIMATION_INTERVAL_MS) % 2

  context.save()
  context.translate(centerX, centerY)
  context.rotate(angle)
  context.translate(-bird.size / 2, -bird.size / 2)
  drawColorBitmap(context, BIRD_BODY, 0, 0, bird.size, bird.size, BIRD_COLORS)
  drawColorBitmap(context, wingFrame === 0 ? BIRD_WING_UP : BIRD_WING_DOWN, 0, 0, bird.size, bird.size, BIRD_COLORS)
  drawBeak(context, bird.size)
  context.restore()
}

function drawClouds(context: CanvasRenderingContext2D) {
  context.fillStyle = 'rgba(245, 243, 255, 0.07)'
  for (const cloud of CLOUDS) {
    context.beginPath()
    context.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2)
    context.arc(cloud.x + cloud.r * 0.9, cloud.y + cloud.r * 0.2, cloud.r * 0.7, 0, Math.PI * 2)
    context.arc(cloud.x - cloud.r * 0.9, cloud.y + cloud.r * 0.3, cloud.r * 0.6, 0, Math.PI * 2)
    context.fill()
  }
}

function drawHills(context: CanvasRenderingContext2D) {
  const baseY = FLAPPY_BIRD_HEIGHT - GROUND_HEIGHT
  context.fillStyle = '#1a1a2e'
  context.beginPath()
  context.moveTo(0, baseY)
  for (let x = 0; x <= FLAPPY_BIRD_WIDTH; x += 40) {
    context.lineTo(x, baseY - (30 + 20 * Math.sin(x / 90)))
  }
  context.lineTo(FLAPPY_BIRD_WIDTH, baseY)
  context.closePath()
  context.fill()
}

function drawGround(context: CanvasRenderingContext2D) {
  const groundY = FLAPPY_BIRD_HEIGHT - GROUND_HEIGHT
  context.fillStyle = '#78350f'
  context.fillRect(0, groundY, FLAPPY_BIRD_WIDTH, GROUND_HEIGHT)
  context.fillStyle = '#4ade80'
  context.fillRect(0, groundY, FLAPPY_BIRD_WIDTH, 4)

  context.fillStyle = '#5c2d0c'
  for (const patch of GROUND_TEXTURE) {
    context.fillRect(patch.x, groundY + 12, patch.width, 3)
  }
}

function drawPipe(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  capAt: 'top' | 'bottom',
) {
  context.fillStyle = '#22c55e'
  context.fillRect(x, y, width, height)

  context.fillStyle = '#4ade80'
  context.fillRect(x + width * 0.15, y, width * 0.2, height)

  context.fillStyle = '#15803d'
  const capY = capAt === 'bottom' ? y + height - PIPE_CAP_HEIGHT : y
  context.fillRect(x - PIPE_CAP_OVERHANG, capY, width + PIPE_CAP_OVERHANG * 2, PIPE_CAP_HEIGHT)
}

function drawGame(context: CanvasRenderingContext2D, game: FlappyBirdGame, timestamp: number) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, FLAPPY_BIRD_WIDTH, FLAPPY_BIRD_HEIGHT)

  drawClouds(context)
  drawHills(context)

  for (const pipe of game.pipes) {
    drawPipe(context, pipe.x, 0, pipe.width, pipe.gapY, 'bottom')
    drawPipe(
      context,
      pipe.x,
      pipe.gapY + pipe.gapHeight,
      pipe.width,
      FLAPPY_BIRD_HEIGHT - (pipe.gapY + pipe.gapHeight),
      'top',
    )
  }

  drawGround(context)
  drawBird(context, game.bird, timestamp)

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), FLAPPY_BIRD_WIDTH / 2, 36)
}

export function FlappyBirdCanvas({ onGameOver, onRestart, runId }: FlappyBirdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<FlappyBirdGame>(createFlappyBirdGame())
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

    gameRef.current = createFlappyBirdGame()
    drawGame(context, gameRef.current, 0)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advanceFlappyBirdGame(gameRef.current, deltaSeconds)
      drawGame(context, gameRef.current, timestamp)

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

  function handleFlap() {
    gameRef.current = flap(gameRef.current)
  }

  // Fallback touch handler for browsers that don't fire pointer events for touch
  function handleTouchStart() {
    handleFlap()
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={FLAPPY_BIRD_WIDTH}
        height={FLAPPY_BIRD_HEIGHT}
        aria-label="Flappy Bird game"
        className="aspect-[8/5] w-full touch-none rounded-2xl border border-edge bg-[#11111a]"
        onPointerDown={handleFlap}
        onTouchStart={handleTouchStart}
      />
      <Button variant="secondary" onClick={onRestart}>
        Restart Flappy Bird
      </Button>
    </div>
  )
}
