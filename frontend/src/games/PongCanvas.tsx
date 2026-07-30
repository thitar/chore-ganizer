import { useEffect, useRef } from 'react'
import {
  PONG_HEIGHT,
  PONG_WIDTH,
  PongGame,
  advancePongGame,
  createPongGame,
  movePaddle,
} from './pong'

interface PongCanvasProps {
  onGameOver: (score: number) => void
  runId?: number
}

function drawGame(context: CanvasRenderingContext2D, game: PongGame) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, PONG_WIDTH, PONG_HEIGHT)

  context.setLineDash([8, 12])
  context.strokeStyle = '#2b2b3a'
  context.beginPath()
  context.moveTo(0, PONG_HEIGHT / 2)
  context.lineTo(PONG_WIDTH, PONG_HEIGHT / 2)
  context.stroke()
  context.setLineDash([])

  context.fillStyle = '#8b5cf6'
  context.fillRect(
    game.playerPaddle.x,
    game.playerPaddle.y,
    game.playerPaddle.width,
    game.playerPaddle.height,
  )
  context.fillStyle = '#38bdf8'
  context.fillRect(
    game.opponentPaddle.x,
    game.opponentPaddle.y,
    game.opponentPaddle.width,
    game.opponentPaddle.height,
  )

  context.fillStyle = '#f5f3ff'
  context.fillRect(game.ball.x, game.ball.y, game.ball.size, game.ball.size)

  context.fillStyle = '#a1a1aa'
  context.font = '600 18px Space Grotesk, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(game.score), PONG_WIDTH / 2, PONG_HEIGHT / 2 - 18)
}

export function PongCanvas({ onGameOver, runId = 0 }: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<PongGame>(createPongGame())
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

    gameRef.current = createPongGame()
    drawGame(context, gameRef.current)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advancePongGame(gameRef.current, deltaSeconds)
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
    const pointerX = (pointerEvent.clientX - bounds.left) * (PONG_WIDTH / bounds.width)
    gameRef.current = movePaddle(gameRef.current, pointerX)
  }

  function handlePointerDown(pointerEvent: React.PointerEvent<HTMLCanvasElement>) {
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
    movePlayer(pointerEvent)
  }

  return (
    <canvas
      ref={canvasRef}
      width={PONG_WIDTH}
      height={PONG_HEIGHT}
      aria-label="Pong game"
      className="aspect-[8/5] w-full touch-none rounded-2xl border border-edge bg-[#11111a]"
      onPointerDown={handlePointerDown}
      onPointerMove={movePlayer}
    />
  )
}
