import { useEffect, useRef } from 'react'
import {
  BREAKOUT_HEIGHT,
  BREAKOUT_WIDTH,
  BreakoutGame,
  advanceBreakoutGame,
  createBreakoutGame,
  movePaddle,
} from './breakout'
import { Button } from '../components/ui/Button'

interface BreakoutCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

const LEVEL_FLASH_DURATION_MS = 1000
const LIFE_LOST_FLASH_DURATION_MS = 1000

const CAPSULE_COLORS: Record<string, string> = {
  WIDEN: '#22d3ee',
  MULTIBALL: '#fbbf24',
}
const CAPSULE_LETTERS: Record<string, string> = {
  WIDEN: 'W',
  MULTIBALL: 'M',
}

function drawGame(
  context: CanvasRenderingContext2D,
  game: BreakoutGame,
  timestamp: number,
  levelFlashUntil: number,
  lifeLostFlashUntil: number,
) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT)

  for (const brick of game.bricks) {
    if (brick.hits <= 0) continue
    // A tough brick (hits >= 2) is darker until its first hit brings it down
    // to 1 remaining hit, at which point it looks identical to a normal brick
    // — a visible "damage" cue with no extra state needed.
    context.fillStyle = brick.hits >= 2 ? '#0369a1' : '#38bdf8'
    context.fillRect(brick.x, brick.y, brick.width, brick.height)
  }

  context.fillStyle = '#8b5cf6'
  context.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height)

  context.fillStyle = '#f5f3ff'
  for (const ball of game.balls) {
    context.fillRect(ball.x, ball.y, ball.size, ball.size)
  }

  context.textAlign = 'center'
  context.font = '700 13px Space Grotesk, sans-serif'
  for (const capsule of game.capsules) {
    context.fillStyle = CAPSULE_COLORS[capsule.type]
    context.fillRect(capsule.x, capsule.y, capsule.width, capsule.height)
    context.fillStyle = '#11111a'
    context.fillText(CAPSULE_LETTERS[capsule.type], capsule.x + capsule.width / 2, capsule.y + capsule.height / 2 + 4)
  }

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), BREAKOUT_WIDTH / 2, 36)

  context.textAlign = 'left'
  context.font = '600 14px Space Grotesk, sans-serif'
  context.fillText(`LVL ${game.level}`, 16, 26)
  context.textAlign = 'right'
  context.fillText('❤'.repeat(Math.max(0, game.lives)), BREAKOUT_WIDTH - 16, 26)

  // Both flashes share the same duration, so if both are active the one with
  // the later deadline is the one that was triggered more recently — show
  // that one rather than always favoring level-up, or a life lost during an
  // active level-up flash would get no visible feedback at all.
  const levelFlashActive = timestamp < levelFlashUntil
  const lifeLostFlashActive = timestamp < lifeLostFlashUntil
  if (levelFlashActive && (!lifeLostFlashActive || levelFlashUntil >= lifeLostFlashUntil)) {
    context.fillStyle = '#34d399'
    context.font = '700 26px Space Grotesk, sans-serif'
    context.textAlign = 'center'
    context.fillText(`Level ${game.level}!`, BREAKOUT_WIDTH / 2, BREAKOUT_HEIGHT / 2)
  } else if (lifeLostFlashActive) {
    context.fillStyle = '#f87171'
    context.font = '700 22px Space Grotesk, sans-serif'
    context.textAlign = 'center'
    context.fillText('Life lost!', BREAKOUT_WIDTH / 2, BREAKOUT_HEIGHT / 2)
  }
}

export function BreakoutCanvas({ onGameOver, onRestart, runId }: BreakoutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<BreakoutGame>(createBreakoutGame())
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
    let levelFlashUntil = 0
    let lifeLostFlashUntil = 0

    gameRef.current = createBreakoutGame()
    drawGame(context, gameRef.current, 0, levelFlashUntil, lifeLostFlashUntil)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      gameRef.current = advanceBreakoutGame(gameRef.current, deltaSeconds)

      // Read directly off engine-reported fields rather than diffing frames —
      // the Space Invaders overhaul's canvas originally inferred these kinds of
      // events by comparing frames and missed the wave-clearing kill's effect
      // because the engine rebuilds a full new wave in the same tick it
      // reports the win.
      if (gameRef.current.leveledUp) {
        levelFlashUntil = timestamp + LEVEL_FLASH_DURATION_MS
      }
      if (gameRef.current.lifeLost) {
        lifeLostFlashUntil = timestamp + LIFE_LOST_FLASH_DURATION_MS
      }

      drawGame(context, gameRef.current, timestamp, levelFlashUntil, lifeLostFlashUntil)

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

  function movePlayer(pointerEvent: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const pointerX = (pointerEvent.clientX - bounds.left) * (BREAKOUT_WIDTH / bounds.width)
    gameRef.current = movePaddle(gameRef.current, pointerX)
  }

  function handlePointerDown(pointerEvent: React.PointerEvent<HTMLCanvasElement>) {
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
    movePlayer(pointerEvent)
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={BREAKOUT_WIDTH}
        height={BREAKOUT_HEIGHT}
        aria-label="Breakout game"
        className="aspect-[8/5] w-full touch-none rounded-2xl border border-edge bg-[#11111a]"
        onPointerDown={handlePointerDown}
        onPointerMove={movePlayer}
      />
      <Button variant="secondary" onClick={onRestart}>Restart Breakout</Button>
    </div>
  )
}
