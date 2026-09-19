export const FLAPPY_BIRD_WIDTH = 800
export const FLAPPY_BIRD_HEIGHT = 500
export const BIRD_SIZE = 24
export const BIRD_X = 150
export const MAX_DELTA_SECONDS = 0.05

export const PIPE_WIDTH = 70
export const PIPE_GAP_HEIGHT = 150
export const PIPE_SPAWN_INTERVAL_SECONDS = 1.6
export const PIPE_EDGE_MARGIN = 40

const GRAVITY = 900
const FLAP_VELOCITY = -320
const MAX_FALL_SPEED = 500
const PIPE_SPEED = 200

export type FlappyBirdStatus = 'playing' | 'game-over'

export interface Bird {
  x: number
  y: number
  vy: number
  size: number
}

export interface PipePair {
  x: number
  width: number
  gapY: number
  gapHeight: number
  scored: boolean
}

export interface FlappyBirdGame {
  bird: Bird
  pipes: PipePair[]
  score: number
  status: FlappyBirdStatus
  spawnElapsed: number
}

function createPipe(x: number): PipePair {
  const minGapY = PIPE_EDGE_MARGIN
  const maxGapY = FLAPPY_BIRD_HEIGHT - PIPE_EDGE_MARGIN - PIPE_GAP_HEIGHT
  const gapY = minGapY + Math.random() * (maxGapY - minGapY)
  return { x, width: PIPE_WIDTH, gapY, gapHeight: PIPE_GAP_HEIGHT, scored: false }
}

export function createFlappyBirdGame(): FlappyBirdGame {
  return {
    bird: {
      x: BIRD_X,
      y: (FLAPPY_BIRD_HEIGHT - BIRD_SIZE) / 2,
      vy: 0,
      size: BIRD_SIZE,
    },
    pipes: [createPipe(FLAPPY_BIRD_WIDTH)],
    score: 0,
    status: 'playing',
    spawnElapsed: 0,
  }
}

export function flap(game: FlappyBirdGame): FlappyBirdGame {
  if (game.status === 'game-over') {
    return { ...game, bird: { ...game.bird } }
  }

  return { ...game, bird: { ...game.bird, vy: FLAP_VELOCITY } }
}

function overlapsRect(bird: Bird, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    bird.x < rect.x + rect.width &&
    bird.x + bird.size > rect.x &&
    bird.y < rect.y + rect.height &&
    bird.y + bird.size > rect.y
  )
}

function hitsPipe(bird: Bird, pipe: PipePair): boolean {
  const top = { x: pipe.x, y: 0, width: pipe.width, height: pipe.gapY }
  const bottom = {
    x: pipe.x,
    y: pipe.gapY + pipe.gapHeight,
    width: pipe.width,
    height: FLAPPY_BIRD_HEIGHT - (pipe.gapY + pipe.gapHeight),
  }
  return overlapsRect(bird, top) || overlapsRect(bird, bottom)
}

export function advanceFlappyBirdGame(game: FlappyBirdGame, deltaSeconds: number): FlappyBirdGame {
  if (game.status === 'game-over') {
    return game
  }

  const seconds = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds)) : 0

  const vy = Math.min(game.bird.vy + GRAVITY * seconds, MAX_FALL_SPEED)
  const y = game.bird.y + vy * seconds
  const bird: Bird = { ...game.bird, y, vy }

  let pipes = game.pipes
    .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED * seconds }))
    .filter(pipe => pipe.x + pipe.width > 0)

  let spawnElapsed = game.spawnElapsed + seconds
  if (spawnElapsed >= PIPE_SPAWN_INTERVAL_SECONDS) {
    spawnElapsed -= PIPE_SPAWN_INTERVAL_SECONDS
    pipes = [...pipes, createPipe(FLAPPY_BIRD_WIDTH)]
  }

  let score = game.score
  pipes = pipes.map(pipe => {
    if (!pipe.scored && pipe.x + pipe.width < bird.x) {
      score += 1
      return { ...pipe, scored: true }
    }
    return pipe
  })

  const outOfBounds = y <= 0 || y + bird.size >= FLAPPY_BIRD_HEIGHT
  const collided = outOfBounds || pipes.some(pipe => hitsPipe(bird, pipe))

  return {
    bird,
    pipes,
    score,
    status: collided ? 'game-over' : 'playing',
    spawnElapsed,
  }
}
