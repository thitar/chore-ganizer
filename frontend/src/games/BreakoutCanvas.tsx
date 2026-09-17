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

function drawGame(context: CanvasRenderingContext2D, game: BreakoutGame) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, BREAKOUT_WIDTH, BREAKOUT_HEIGHT)

  for (const brick of game.bricks) {
    if (!brick.alive) continue
    context.fillStyle = '#38bdf8'
    context.fillRect(brick.x, brick.y, brick.width, brick.height)
  }

  context.fillStyle = '#8b5cf6'
  context.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height)

  context.fillStyle = '#f5f3ff'
  context.fillRect(game.ball.x, game.ball.y, game.ball.size, game.ball.size)

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), BREAKOUT_WIDTH / 2, 36)

  if (game.status === 'game-over' && game.cleared) {
    context.fillStyle = '#34d399'
    context.font = '700 22px Space Grotesk, sans-serif'
    context.fillText('Cleared!', BREAKOUT_WIDTH / 2, BREAKOUT_HEIGHT / 2)
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

    gameRef.current = createBreakoutGame()
    drawGame(context, gameRef.current)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advanceBreakoutGame(gameRef.current, deltaSeconds)
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
