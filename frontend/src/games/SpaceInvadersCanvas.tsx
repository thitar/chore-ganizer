import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import {
  ENEMY_COLS,
  SPACE_INVADERS_HEIGHT,
  SPACE_INVADERS_WIDTH,
  advanceSpaceInvadersGame,
  createSpaceInvadersGame,
  moveShip,
  type SpaceInvadersGame,
} from './spaceInvaders'

interface SpaceInvadersCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

// 8x8 pixel-art bitmaps, two animation frames per enemy variant (alternating
// "legs" pose), scaled up to each enemy's actual width/height at draw time.
type Bitmap = readonly (readonly number[])[]

const SQUID_FRAME_A: Bitmap = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 1, 1, 0, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1],
]

const SQUID_FRAME_B: Bitmap = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
]

const CRAB_FRAME_A: Bitmap = [
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 1, 0, 1],
  [0, 0, 1, 0, 0, 1, 0, 0],
]

const CRAB_FRAME_B: Bitmap = [
  [0, 0, 1, 0, 0, 1, 0, 0],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 0, 1, 1, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1],
]

const SHIP_BITMAP: Bitmap = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
]

const ANIMATION_FRAME_INTERVAL_MS = 500
const LEVEL_FLASH_DURATION_MS = 1000
const EXPLOSION_DURATION_MS = 350

interface Explosion {
  x: number
  y: number
  startedAt: number
}

// Fixed starfield, generated once — deterministic and cheap to redraw every frame.
const STARS = Array.from({ length: 70 }, (_, i) => {
  const seed = i * 9973
  return {
    x: (seed * 1.618) % SPACE_INVADERS_WIDTH,
    y: (seed * 2.718) % SPACE_INVADERS_HEIGHT,
    size: (i % 3) + 1,
  }
})

function drawBitmap(
  context: CanvasRenderingContext2D,
  bitmap: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  const rows = bitmap.length
  const cols = bitmap[0].length
  const cellWidth = width / cols
  const cellHeight = height / rows
  context.fillStyle = color
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!bitmap[row][col]) continue
      context.fillRect(x + col * cellWidth, y + row * cellHeight, cellWidth + 0.5, cellHeight + 0.5)
    }
  }
}

function drawGame(
  context: CanvasRenderingContext2D,
  game: SpaceInvadersGame,
  timestamp: number,
  explosions: Explosion[],
  levelFlashUntil: number,
) {
  context.fillStyle = '#0a0a12'
  context.fillRect(0, 0, SPACE_INVADERS_WIDTH, SPACE_INVADERS_HEIGHT)

  context.fillStyle = '#3f3f5c'
  for (const star of STARS) {
    context.fillRect(star.x, star.y, star.size, star.size)
  }

  const animFrame = Math.floor(timestamp / ANIMATION_FRAME_INTERVAL_MS) % 2
  game.enemies.forEach((enemy, index) => {
    if (!enemy.alive) return
    // Row is derived from spawn order (not current y), so a variant never
    // changes mid-drop as the formation descends.
    const isSquidRow = Math.floor(index / ENEMY_COLS) < 2
    const bitmap = isSquidRow
      ? animFrame === 0 ? SQUID_FRAME_A : SQUID_FRAME_B
      : animFrame === 0 ? CRAB_FRAME_A : CRAB_FRAME_B
    const color = isSquidRow ? '#5eead4' : '#22c55e'
    drawBitmap(context, bitmap, enemy.x, enemy.y, enemy.width, enemy.height, color)
  })

  for (const explosion of explosions) {
    const age = timestamp - explosion.startedAt
    const progress = Math.min(1, age / EXPLOSION_DURATION_MS)
    const radius = 4 + progress * 14
    context.fillStyle = `rgba(251, 191, 36, ${1 - progress})`
    context.beginPath()
    context.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.fillStyle = '#f5f3ff'
  if (game.playerBullet) {
    context.fillRect(game.playerBullet.x, game.playerBullet.y, game.playerBullet.width, game.playerBullet.height)
    context.fillStyle = 'rgba(245, 243, 255, 0.35)'
    context.fillRect(game.playerBullet.x - 1.5, game.playerBullet.y, game.playerBullet.width + 3, game.playerBullet.height)
  }

  context.fillStyle = '#f87171'
  for (const bullet of game.enemyBullets) {
    context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  }

  drawBitmap(context, SHIP_BITMAP, game.ship.x, game.ship.y, game.ship.width, game.ship.height, '#a78bfa')

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), SPACE_INVADERS_WIDTH / 2, 36)

  context.textAlign = 'left'
  context.font = '600 14px Space Grotesk, sans-serif'
  context.fillText(`LVL ${game.level}`, 16, 26)

  if (timestamp < levelFlashUntil) {
    context.fillStyle = '#34d399'
    context.font = '700 26px Space Grotesk, sans-serif'
    context.textAlign = 'center'
    context.fillText(`Level ${game.level}!`, SPACE_INVADERS_WIDTH / 2, SPACE_INVADERS_HEIGHT / 2)
  }
}

export function SpaceInvadersCanvas({ onGameOver, onRestart, runId }: SpaceInvadersCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<SpaceInvadersGame>(createSpaceInvadersGame())
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
    let explosions: Explosion[] = []
    let levelFlashUntil = 0

    gameRef.current = createSpaceInvadersGame()
    drawGame(context, gameRef.current, 0, explosions, levelFlashUntil)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      gameRef.current = advanceSpaceInvadersGame(gameRef.current, deltaSeconds)

      // The engine reports these directly (lastKilled/leveledUp) rather than the
      // canvas inferring them by diffing frames, which used to silently miss the
      // wave-clearing kill (enemies get rebuilt to a full new wave in the same
      // tick) and could misfire after a restart if it compared against stale state.
      if (gameRef.current.lastKilled) {
        const { x, y, width, height } = gameRef.current.lastKilled
        explosions.push({ x: x + width / 2, y: y + height / 2, startedAt: timestamp })
      }

      if (gameRef.current.leveledUp) {
        levelFlashUntil = timestamp + LEVEL_FLASH_DURATION_MS
      }

      explosions = explosions.filter(e => timestamp - e.startedAt < EXPLOSION_DURATION_MS)

      drawGame(context, gameRef.current, timestamp, explosions, levelFlashUntil)

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

  function toGameX(clientX: number): number {
    const canvas = canvasRef.current
    if (!canvas) return NaN
    const bounds = canvas.getBoundingClientRect()
    return (clientX - bounds.left) * (SPACE_INVADERS_WIDTH / bounds.width)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    gameRef.current = moveShip(gameRef.current, toGameX(event.clientX))
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    gameRef.current = moveShip(gameRef.current, toGameX(event.clientX))
  }

  // Fallback touch handler for browsers that don't fire pointer events for touch
  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>) {
    const t = event.touches[0]
    if (!t) return
    gameRef.current = moveShip(gameRef.current, toGameX(t.clientX))
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={SPACE_INVADERS_WIDTH}
        height={SPACE_INVADERS_HEIGHT}
        aria-label="Space Invaders game"
        className="aspect-[8/5] w-full touch-none rounded-2xl border border-edge bg-[#0a0a12]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
      />
      <Button variant="secondary" onClick={onRestart}>
        Restart Space Invaders
      </Button>
    </div>
  )
}
