import { useEffect, useRef } from 'react'
import { Button } from '../components/ui/Button'
import {
  FLAPPY_BIRD_HEIGHT,
  FLAPPY_BIRD_WIDTH,
  advanceFlappyBirdGame,
  createFlappyBirdGame,
  flap,
  type FlappyBirdGame,
} from './flappyBird'

interface FlappyBirdCanvasProps {
  onGameOver: (score: number) => void
  onRestart: () => void
  runId: number
}

function drawGame(context: CanvasRenderingContext2D, game: FlappyBirdGame) {
  context.fillStyle = '#11111a'
  context.fillRect(0, 0, FLAPPY_BIRD_WIDTH, FLAPPY_BIRD_HEIGHT)

  context.fillStyle = '#22c55e'
  for (const pipe of game.pipes) {
    context.fillRect(pipe.x, 0, pipe.width, pipe.gapY)
    context.fillRect(
      pipe.x,
      pipe.gapY + pipe.gapHeight,
      pipe.width,
      FLAPPY_BIRD_HEIGHT - (pipe.gapY + pipe.gapHeight),
    )
  }

  context.fillStyle = '#facc15'
  context.fillRect(game.bird.x, game.bird.y, game.bird.size, game.bird.size)

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
    drawGame(context, gameRef.current)

    const frame = (timestamp: number) => {
      if (!active) return
      const deltaSeconds = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      gameRef.current = advanceFlappyBirdGame(gameRef.current, deltaSeconds)
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
