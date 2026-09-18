import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import {
  SPACE_INVADERS_HEIGHT,
  SPACE_INVADERS_WIDTH,
  advanceSpaceInvadersGame,
  createSpaceInvadersGame,
  fireShot,
  moveShip,
  type SpaceInvadersGame,
} from './spaceInvaders'

interface SpaceInvadersCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

const TAP_MAX_DISTANCE_PX = 12

function drawGame(context: CanvasRenderingContext2D, game: SpaceInvadersGame) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, SPACE_INVADERS_WIDTH, SPACE_INVADERS_HEIGHT)

  context.fillStyle = '#22c55e'
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue
    context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)
  }

  context.fillStyle = '#f5f3ff'
  if (game.playerBullet) {
    context.fillRect(game.playerBullet.x, game.playerBullet.y, game.playerBullet.width, game.playerBullet.height)
  }

  context.fillStyle = '#ef4444'
  for (const bullet of game.enemyBullets) {
    context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  }

  context.fillStyle = '#8b5cf6'
  context.fillRect(game.ship.x, game.ship.y, game.ship.width, game.ship.height)

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), SPACE_INVADERS_WIDTH / 2, 36)

  if (game.status === 'game-over' && game.cleared) {
    context.fillStyle = '#34d399'
    context.font = '700 22px Space Grotesk, sans-serif'
    context.fillText('Cleared!', SPACE_INVADERS_WIDTH / 2, SPACE_INVADERS_HEIGHT / 2)
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

    gameRef.current = createSpaceInvadersGame()
    drawGame(context, gameRef.current)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advanceSpaceInvadersGame(gameRef.current, deltaSeconds)
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

  function toGameX(clientX: number): number {
    const canvas = canvasRef.current
    if (!canvas) return NaN
    const bounds = canvas.getBoundingClientRect()
    return (clientX - bounds.left) * (SPACE_INVADERS_WIDTH / bounds.width)
  }

  // Pointer-based drag-to-move + tap-to-fire (a gesture that stays within a
  // small radius counts as a tap; anything that drifts further is a drag).
  const gestureRef = useRef<{ x: number; y: number; movedFar: boolean } | null>(null)

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = { x: event.clientX, y: event.clientY, movedFar: false }
    gameRef.current = moveShip(gameRef.current, toGameX(event.clientX))
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const gesture = gestureRef.current
    if (gesture) {
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (Math.hypot(dx, dy) > TAP_MAX_DISTANCE_PX) gesture.movedFar = true
    }
    gameRef.current = moveShip(gameRef.current, toGameX(event.clientX))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture && !gesture.movedFar) {
      gameRef.current = fireShot(gameRef.current)
    }
  }

  function handlePointerCancel() {
    gestureRef.current = null
  }

  // Fallback touch handlers for browsers that don't fire pointer events for touch
  const touchGestureRef = useRef<{ x: number; y: number; movedFar: boolean } | null>(null)

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>) {
    const t = event.touches[0]
    if (!t) return
    touchGestureRef.current = { x: t.clientX, y: t.clientY, movedFar: false }
    gameRef.current = moveShip(gameRef.current, toGameX(t.clientX))
  }

  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>) {
    const t = event.touches[0]
    if (!t) return
    const gesture = touchGestureRef.current
    if (gesture) {
      const dx = t.clientX - gesture.x
      const dy = t.clientY - gesture.y
      if (Math.hypot(dx, dy) > TAP_MAX_DISTANCE_PX) gesture.movedFar = true
    }
    gameRef.current = moveShip(gameRef.current, toGameX(t.clientX))
  }

  function handleTouchEnd() {
    const gesture = touchGestureRef.current
    touchGestureRef.current = null
    if (gesture && !gesture.movedFar) {
      gameRef.current = fireShot(gameRef.current)
    }
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={SPACE_INVADERS_WIDTH}
        height={SPACE_INVADERS_HEIGHT}
        aria-label="Space Invaders game"
        className="aspect-[8/5] w-full touch-none rounded-2xl border border-edge bg-[#11111a]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <Button variant="secondary" onClick={onRestart}>
        Restart Space Invaders
      </Button>
    </div>
  )
}
