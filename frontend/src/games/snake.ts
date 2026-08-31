export const SNAKE_GRID_WIDTH = 20
export const SNAKE_GRID_HEIGHT = 20
export const SNAKE_TICK_SECONDS = 0.12
export const SNAKE_CANVAS_SIZE = 400
export const SNAKE_INITIAL_LENGTH = 3

export type SnakeDirection = 'up' | 'down' | 'left' | 'right'
export type SnakeStatus = 'playing' | 'game-over'

export interface SnakePoint {
  x: number
  y: number
}

export interface SnakeGame {
  snake: SnakePoint[]
  direction: SnakeDirection
  nextDirection: SnakeDirection
  apple: SnakePoint
  score: number
  status: SnakeStatus
  /** Accumulated time since last tick, in seconds */
  elapsed: number
}

const OPPOSITE: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

function isOpposite(a: SnakeDirection, b: SnakeDirection): boolean {
  return OPPOSITE[a] === b
}

function randomApple(snake: SnakePoint[]): SnakePoint {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`))
  const free: SnakePoint[] = []
  for (let y = 0; y < SNAKE_GRID_HEIGHT; y++) {
    for (let x = 0; x < SNAKE_GRID_WIDTH; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) {
    // Board full — shouldn't happen in normal play; return head as fallback
    return { ...snake[0] }
  }
  const idx = Math.floor(Math.random() * free.length)
  return free[idx]
}

export function placeApple(snake: SnakePoint[]): SnakePoint {
  return randomApple(snake)
}

export function createSnakeGame(): SnakeGame {
  const cx = Math.floor(SNAKE_GRID_WIDTH / 2)
  const cy = Math.floor(SNAKE_GRID_HEIGHT / 2)
  // Snake of length 3 at center moving right: head at center, tail to the left
  const snake: SnakePoint[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  return {
    snake,
    direction: 'right',
    nextDirection: 'right',
    apple: randomApple(snake),
    score: 0,
    status: 'playing',
    elapsed: 0,
  }
}

export function steerSnake(game: SnakeGame, direction: SnakeDirection): SnakeGame {
  if (game.status === 'game-over') {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }
  if (!direction || (direction !== 'up' && direction !== 'down' && direction !== 'left' && direction !== 'right')) {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }
  // Prevent 180-degree reversal
  if (isOpposite(game.direction, direction)) {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }
  // Also prevent reversing the queued direction if it already differs from current
  if (isOpposite(game.nextDirection, direction) && game.nextDirection !== game.direction) {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }
  // If trying to reverse current direction, ignore; otherwise queue it
  if (game.nextDirection === direction) {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }
  // Queue the new direction — it takes effect on next tick
  return {
    ...game,
    snake: game.snake.map(p => ({ ...p })),
    apple: { ...game.apple },
    nextDirection: direction,
  }
}

function stepOnce(game: SnakeGame): SnakeGame {
  if (game.status === 'game-over') {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }

  // Apply queued direction (if not opposite to current, it was already validated)
  const effectiveDirection: SnakeDirection = isOpposite(game.direction, game.nextDirection)
    ? game.direction
    : game.nextDirection

  const head = game.snake[0]
  let nextHead: SnakePoint
  switch (effectiveDirection) {
    case 'up':
      nextHead = { x: head.x, y: head.y - 1 }
      break
    case 'down':
      nextHead = { x: head.x, y: head.y + 1 }
      break
    case 'left':
      nextHead = { x: head.x - 1, y: head.y }
      break
    case 'right':
      nextHead = { x: head.x + 1, y: head.y }
      break
  }

  // Wall collision
  if (
    nextHead.x < 0 ||
    nextHead.x >= SNAKE_GRID_WIDTH ||
    nextHead.y < 0 ||
    nextHead.y >= SNAKE_GRID_HEIGHT
  ) {
    return {
      ...game,
      snake: game.snake.map(p => ({ ...p })),
      apple: { ...game.apple },
      direction: effectiveDirection,
      nextDirection: effectiveDirection,
      status: 'game-over',
    }
  }

  const ateApple = nextHead.x === game.apple.x && nextHead.y === game.apple.y

  // Self collision: check against body excluding tail if not growing (tail will vacate)
  const bodyToCheck = ateApple ? game.snake : game.snake.slice(0, -1)
  const hitSelf = bodyToCheck.some(p => p.x === nextHead.x && p.y === nextHead.y)
  if (hitSelf) {
    return {
      ...game,
      snake: game.snake.map(p => ({ ...p })),
      apple: { ...game.apple },
      direction: effectiveDirection,
      nextDirection: effectiveDirection,
      status: 'game-over',
    }
  }

  let nextSnake: SnakePoint[]
  let nextApple = { ...game.apple }
  let nextScore = game.score

  if (ateApple) {
    nextSnake = [nextHead, ...game.snake.map(p => ({ ...p }))]
    nextScore += 1
    nextApple = randomApple(nextSnake)
  } else {
    nextSnake = [nextHead, ...game.snake.slice(0, -1).map(p => ({ ...p }))]
  }

  return {
    snake: nextSnake,
    direction: effectiveDirection,
    nextDirection: effectiveDirection,
    apple: nextApple,
    score: nextScore,
    status: 'playing',
    elapsed: game.elapsed,
  }
}

export function advanceSnakeGame(game: SnakeGame, deltaSeconds?: number): SnakeGame {
  if (game.status === 'game-over') {
    return { ...game, snake: game.snake.map(p => ({ ...p })), apple: { ...game.apple } }
  }

  // Deterministic single-step mode: when delta is not a finite number, step once.
  // This keeps unit tests simple: advanceSnakeGame(game) === one tick.
  if (!Number.isFinite(deltaSeconds as number)) {
    const stepped = stepOnce({ ...game, elapsed: game.elapsed })
    return { ...stepped, elapsed: 0 }
  }

  const delta = Math.max(0, deltaSeconds as number)
  let elapsed = game.elapsed + delta
  let current: SnakeGame = {
    ...game,
    snake: game.snake.map(p => ({ ...p })),
    apple: { ...game.apple },
    elapsed,
  }

  // Consume whole ticks; leftover fractional time carries over
  let stepped = false
  while (elapsed >= SNAKE_TICK_SECONDS) {
    elapsed -= SNAKE_TICK_SECONDS
    current = stepOnce({ ...current, elapsed })
    current.elapsed = elapsed
    stepped = true
    if (current.status === 'game-over') {
      current.elapsed = 0
      break
    }
  }

  if (!stepped) {
    // No tick consumed — preserve elapsed for next frame
    return { ...current, elapsed }
  }

  return current
}
