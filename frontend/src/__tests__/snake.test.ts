import {
  SNAKE_GRID_HEIGHT,
  SNAKE_GRID_WIDTH,
  SNAKE_TICK_SECONDS,
  advanceSnakeGame,
  createSnakeGame,
  placeApple,
  stepSnake,
  steerSnake,
  type SnakeGame,
} from '../games/snake'

describe('Snake game engine', () => {
  it('creates a centered snake of length 3 moving right', () => {
    const game = createSnakeGame()
    const cx = Math.floor(SNAKE_GRID_WIDTH / 2)
    const cy = Math.floor(SNAKE_GRID_HEIGHT / 2)

    expect(SNAKE_GRID_WIDTH).toBe(20)
    expect(SNAKE_GRID_HEIGHT).toBe(20)
    expect(game.status).toBe('playing')
    expect(game.score).toBe(0)
    expect(game.direction).toBe('right')
    expect(game.nextDirection).toBe('right')
    expect(game.snake).toHaveLength(3)
    expect(game.snake[0]).toEqual({ x: cx, y: cy })
    expect(game.snake[1]).toEqual({ x: cx - 1, y: cy })
    expect(game.snake[2]).toEqual({ x: cx - 2, y: cy })
    expect(game.elapsed).toBe(0)
    // Apple not on snake
    expect(game.snake.some(p => p.x === game.apple.x && p.y === game.apple.y)).toBe(false)
  })

  it('moves the snake one cell in current direction each tick', () => {
    const game = createSnakeGame()
    const head = { ...game.snake[0] }
    // Ensure apple is away from the imminent head position
    const away: SnakeGame = { ...game, apple: { x: 0, y: 0 }, snake: game.snake.map(p => ({ ...p })), elapsed: 0 }
    const next = stepSnake(away)

    expect(next.snake[0]).toEqual({ x: head.x + 1, y: head.y })
    expect(next.snake).toHaveLength(away.snake.length)
    expect(next.direction).toBe('right')
    expect(next.status).toBe('playing')
  })

  it('steers the snake with queued direction taking effect on next tick', () => {
    const game = createSnakeGame()
    const steered = steerSnake(game, 'up')
    // still moving right before tick
    expect(steered.direction).toBe('right')
    expect(steered.nextDirection).toBe('up')

    const awayApple: SnakeGame = { ...steered, apple: { x: 0, y: 0 }, snake: steered.snake.map(p => ({ ...p })) }
    const next = stepSnake(awayApple)
    expect(next.direction).toBe('up')
    expect(next.snake[0]).toEqual({ x: game.snake[0].x, y: game.snake[0].y - 1 })
  })

  it('prevents 180-degree reversal', () => {
    const game = createSnakeGame() // moving right
    const reversed = steerSnake(game, 'left')
    expect(reversed.nextDirection).toBe('right') // ignored

    // Also cannot reverse via queued direction
    const upQueued = steerSnake(game, 'up')
    const reversedQueued = steerSnake(upQueued, 'down') // down is opposite of up (queued)
    expect(reversedQueued.nextDirection).toBe('up')
  })

  it('ignores steering when game is over', () => {
    const game: SnakeGame = { ...createSnakeGame(), status: 'game-over', snake: createSnakeGame().snake.map(p => ({ ...p })), apple: { ...createSnakeGame().apple } }
    const steered = steerSnake(game, 'up')
    expect(steered.status).toBe('game-over')
    expect(steered.nextDirection).toBe(game.nextDirection)
  })

  it('eats apple, grows, increments score, and respawns apple off snake', () => {
    const game = createSnakeGame()
    const head = game.snake[0]
    // Place apple directly in front of head (moving right)
    const appleAhead = { x: head.x + 1, y: head.y }
    const withApple: SnakeGame = {
      ...game,
      apple: appleAhead,
      snake: game.snake.map(p => ({ ...p })),
    }
    const beforeLen = withApple.snake.length
    const next = stepSnake(withApple)

    expect(next.status).toBe('playing')
    expect(next.score).toBe(1)
    expect(next.snake).toHaveLength(beforeLen + 1)
    expect(next.snake[0]).toEqual(appleAhead)
    // New apple not on snake
    expect(next.snake.some(p => p.x === next.apple.x && p.y === next.apple.y)).toBe(false)
    // Tail did not vacate (growth)
    expect(next.snake[next.snake.length - 1]).toEqual(game.snake[game.snake.length - 1])
  })

  it('does not grow when apple not eaten', () => {
    const game = createSnakeGame()
    const withDistantApple: SnakeGame = { ...game, apple: { x: 0, y: 0 }, snake: game.snake.map(p => ({ ...p })) }
    const next = stepSnake(withDistantApple)
    expect(next.score).toBe(0)
    expect(next.snake).toHaveLength(game.snake.length)
  })

  it('ends game on wall collision (right wall)', () => {
    // Place snake near right wall moving right
    const game: SnakeGame = {
      snake: [{ x: SNAKE_GRID_WIDTH - 1, y: 10 }, { x: SNAKE_GRID_WIDTH - 2, y: 10 }, { x: SNAKE_GRID_WIDTH - 3, y: 10 }],
      direction: 'right',
      nextDirection: 'right',
      apple: { x: 0, y: 0 },
      score: 2,
      status: 'playing',
      elapsed: 0,
    }
    const next = stepSnake(game)
    expect(next.status).toBe('game-over')
    expect(next.score).toBe(2)
    expect(next.direction).toBe('right')
  })

  it('ends game on wall collision (top wall)', () => {
    const game: SnakeGame = {
      snake: [{ x: 10, y: 0 }, { x: 10, y: 1 }, { x: 10, y: 2 }],
      direction: 'up',
      nextDirection: 'up',
      apple: { x: 0, y: 0 },
      score: 0,
      status: 'playing',
      elapsed: 0,
    }
    const next = stepSnake(game)
    expect(next.status).toBe('game-over')
  })

  it('ends game on self collision', () => {
    // Snake in a loop shape where head moving down collides with body
    // Head at (5,5) moving down into (5,6) which is body segment
    const game: SnakeGame = {
      snake: [
        { x: 5, y: 5 }, // head
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 }, // collision target (body, not tail)
        { x: 4, y: 6 },
      ],
      direction: 'down',
      nextDirection: 'down',
      apple: { x: 0, y: 0 },
      score: 3,
      status: 'playing',
      elapsed: 0,
    }
    const next = stepSnake(game)
    expect(next.status).toBe('game-over')
    expect(next.score).toBe(3)
  })

  it('does not self-collide when head moves into vacating tail position', () => {
    // Length 4 snake moving right where tail is directly behind head loop tail vacate
    // Shape: head (5,5), second (4,5), third (4,6), tail (5,6)
    // Moving down from head (5,5) to (5,6) would be tail position - but tail will vacate, so not collision
    // Need direction down, so head goes to tail spot
    const game: SnakeGame = {
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
      ],
      direction: 'down',
      nextDirection: 'down',
      apple: { x: 0, y: 0 },
      score: 0,
      status: 'playing',
      elapsed: 0,
    }
    const next = stepSnake(game)
    expect(next.status).toBe('playing')
    expect(next.snake[0]).toEqual({ x: 5, y: 6 })
    expect(next.snake).toHaveLength(4)
  })

  it('stops advancing after game-over and remains immutable', () => {
    const game: SnakeGame = {
      snake: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      direction: 'left',
      nextDirection: 'left',
      apple: { x: 5, y: 5 },
      score: 5,
      status: 'game-over',
      elapsed: 0,
    }
    const next = stepSnake(game)
    expect(next.status).toBe('game-over')
    expect(next.score).toBe(5)
    expect(next.snake).toEqual(game.snake)
    // Original not mutated
    expect(game.status).toBe('game-over')

    const advanced = advanceSnakeGame(game, 0.5)
    expect(advanced.status).toBe('game-over')
  })

  it('restart creates a fresh playing game', () => {
    const gameOver: SnakeGame = {
      snake: [{ x: 0, y: 0 }],
      direction: 'right',
      nextDirection: 'right',
      apple: { x: 1, y: 1 },
      score: 9,
      status: 'game-over',
      elapsed: 0,
    }
    // Restart is modeled as createSnakeGame() — same as canvas runId reset
    const fresh = createSnakeGame()
    expect(fresh.status).toBe('playing')
    expect(fresh.score).toBe(0)
    expect(fresh.snake).toHaveLength(3)
    expect(fresh.direction).toBe('right')
    // Ensure fresh is not reference-equal to game over
    expect(fresh.snake).not.toBe(gameOver.snake)
  })

  it('is deterministic: advanceSnakeGame() with no delta steps exactly one tick', () => {
    const game = createSnakeGame()
    const withApple: SnakeGame = { ...game, apple: { x: 0, y: 0 }, snake: game.snake.map(p => ({ ...p })) }
    const a = advanceSnakeGame(withApple)
    const b = stepSnake(withApple)
    expect(a.snake).toEqual(b.snake)
    expect(a.score).toEqual(b.score)
    expect(a.status).toEqual(b.status)
    expect(a.direction).toEqual(b.direction)
  })

  it('accumulates deltaSeconds and steps on 0.12s tick interval', () => {
    const game = createSnakeGame()
    const base: SnakeGame = { ...game, apple: { x: 0, y: 0 }, snake: game.snake.map(p => ({ ...p })), elapsed: 0 }
    // Half tick should not move
    const half = advanceSnakeGame(base, SNAKE_TICK_SECONDS / 2)
    expect(half.snake).toEqual(base.snake)
    expect(half.elapsed).toBeCloseTo(SNAKE_TICK_SECONDS / 2, 5)

    // Another half tick should consume one tick and reset elapsed remainder
    const full = advanceSnakeGame(half, SNAKE_TICK_SECONDS / 2)
    expect(full.snake[0].x).toBe(base.snake[0].x + 1)
    expect(full.elapsed).toBeCloseTo(0, 5)
  })

  it('clamps large deltas and advances at most one frame of ticks', () => {
    const game = createSnakeGame()
    const base: SnakeGame = { ...game, apple: { x: 0, y: 0 }, snake: game.snake.map(p => ({ ...p })), elapsed: 0 }
    // Huge delta is clamped to 0.5s max (~4 ticks)
    const clamped = advanceSnakeGame(base, 10)
    const small = advanceSnakeGame(base, 0.5)
    expect(clamped.snake).toEqual(small.snake)
  })

  it('placeApple never places on snake and returns within grid', () => {
    // Fill almost entire board except one cell
    const snake: { x: number; y: number }[] = []
    for (let y = 0; y < SNAKE_GRID_HEIGHT; y++) {
      for (let x = 0; x < SNAKE_GRID_WIDTH; x++) {
        if (x === 7 && y === 7) continue // leave one free
        snake.push({ x, y })
      }
    }
    const apple = placeApple(snake)
    expect(apple).toEqual({ x: 7, y: 7 })
  })

  it('does not mutate the original game on advance', () => {
    const game = createSnakeGame()
    const snapshot = JSON.stringify(game)
    const steered = steerSnake(game, 'up')
    const stepped = stepSnake({ ...game, apple: { x: 0, y: 0 } })
    // Original unchanged
    expect(JSON.stringify(game)).toBe(snapshot)
    expect(steered).not.toBe(game)
    expect(stepped).not.toBe(game)
  })
})
