import {
  BALL_SIZE,
  BREAKOUT_HEIGHT,
  BREAKOUT_WIDTH,
  BRICK_COLS,
  BRICK_ROWS,
  CAPSULE_SIZE,
  MAX_BALLS,
  MAX_DELTA_SECONDS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  STARTING_LIVES,
  WIDE_PADDLE_WIDTH,
  WIDEN_DURATION_SECONDS,
  advanceBreakoutGame,
  ballBaseSpeedForLevel,
  brickRowsForLevel,
  createBreakoutGame,
  movePaddle,
  type BreakoutGame,
  type Capsule,
} from '../games/breakout'

describe('Breakout game engine', () => {
  it('creates a centered playing game at level 1 with a full brick grid and fixed dimensions', () => {
    const game = createBreakoutGame()

    expect(BREAKOUT_WIDTH).toBe(800)
    expect(BREAKOUT_HEIGHT).toBe(500)
    expect(PADDLE_WIDTH).toBeGreaterThan(0)
    expect(PADDLE_HEIGHT).toBeGreaterThan(0)
    expect(BALL_SIZE).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.level).toBe(1)
    expect(game.lives).toBe(STARTING_LIVES)
    expect(game.score).toBe(0)
    expect(game.bricks).toHaveLength(BRICK_ROWS * BRICK_COLS)
    expect(game.bricks.every(b => b.hits === 1)).toBe(true)
    expect(game.paddle.x).toBe((BREAKOUT_WIDTH - PADDLE_WIDTH) / 2)
    expect(game.paddle.width).toBe(PADDLE_WIDTH)
    expect(game.balls).toHaveLength(1)
    expect(game.balls[0].speed).toBeGreaterThan(0)
    expect(game.capsules).toEqual([])
    expect(game.widenRemaining).toBe(0)
    expect(game.leveledUp).toBe(false)
    expect(game.lifeLost).toBe(false)
  })

  it('clamps the paddle to the horizontal playfield using its current width', () => {
    const game = createBreakoutGame()

    const left = movePaddle(game, -100)
    const right = movePaddle(game, BREAKOUT_WIDTH + 100)

    expect(left.paddle.x).toBe(0)
    expect(right.paddle.x).toBe(BREAKOUT_WIDTH - PADDLE_WIDTH)
    expect(game.paddle.x).toBe((BREAKOUT_WIDTH - PADDLE_WIDTH) / 2)

    const nonFinite = movePaddle(game, Number.NaN)
    expect(nonFinite.paddle.x).toBe(game.paddle.x)

    // Regression: the clamp must read the paddle's current width, not the
    // PADDLE_WIDTH constant, or a widened paddle draws off the right edge.
    const widened: BreakoutGame = { ...game, paddle: { ...game.paddle, width: WIDE_PADDLE_WIDTH } }
    const widenedRight = movePaddle(widened, BREAKOUT_WIDTH + 100)
    expect(widenedRight.paddle.x).toBe(BREAKOUT_WIDTH - WIDE_PADDLE_WIDTH)
  })

  it('bounces the ball off the side wall', () => {
    const game = createBreakoutGame()
    const ball = { ...game.balls[0], x: BREAKOUT_WIDTH - BALL_SIZE - 1, y: 300, vx: 100, vy: 0 }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.balls[0].vx).toBeLessThan(0)
    expect(next.balls[0].x).toBe(BREAKOUT_WIDTH - BALL_SIZE)
  })

  it('bounces the ball off the top wall', () => {
    const game = createBreakoutGame()
    // y=1 moving up clamps to y=0 well above the brick grid (BRICK_TOP_OFFSET),
    // so this can't collide with a brick in one frame — no need to (and must
    // not) zero out bricks here, since a fully-cleared board triggers a level-up
    // that would replace this ball with a freshly served one.
    const ball = { ...game.balls[0], x: 400, y: 1, vx: 0, vy: -100 }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.balls[0].vy).toBeGreaterThan(0)
    expect(next.balls[0].y).toBe(0)
  })

  it('bounces straight up off a center-hit paddle', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const centerX = game.paddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const ball = { ...game.balls[0], x: centerX, y: paddleY - BALL_SIZE - 1, vx: 0, vy: 100, speed: 100 }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.balls[0].vy).toBeLessThan(0)
    expect(next.balls[0].vx).toBeCloseTo(0, 5)
    expect(next.status).toBe('playing')
  })

  it('angles the ball away from center when it hits the edge of the paddle', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const edgeX = game.paddle.x + PADDLE_WIDTH - BALL_SIZE
    const ball = { ...game.balls[0], x: edgeX, y: paddleY - BALL_SIZE - 1, vx: 0, vy: 100, speed: 100 }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.balls[0].vx).toBeGreaterThan(0)
    expect(next.balls[0].vy).toBeLessThan(0)
  })

  it('does not bounce off the paddle while moving upward', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const centerX = game.paddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const ball = { ...game.balls[0], x: centerX, y: paddleY - BALL_SIZE - 1, vx: 0, vy: -100, speed: 100 }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.balls[0].vy).toBe(-100)
  })

  it('breaks a single-hit brick on impact, bounces vertically off its top face, and increments the score', () => {
    const game = createBreakoutGame()
    const targetBrick = game.bricks[0]
    const ball = {
      ...game.balls[0],
      x: targetBrick.x + targetBrick.width / 2 - BALL_SIZE / 2,
      y: targetBrick.y + targetBrick.height - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.score).toBe(1)
    expect(next.bricks[0].hits).toBe(0)
    expect(next.balls[0].vy).toBeGreaterThan(0)
    expect(next.status).toBe('playing')
  })

  it('bounces horizontally off the side face of a brick', () => {
    const game = createBreakoutGame()
    const targetBrick = game.bricks[1]
    const ball = {
      ...game.balls[0],
      x: targetBrick.x - BALL_SIZE + 1,
      y: targetBrick.y + targetBrick.height / 2 - BALL_SIZE / 2,
      vx: 100,
      vy: 0,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, balls: [ball] }, 0.05)

    expect(next.bricks[1].hits).toBe(0)
    expect(next.balls[0].vx).toBeLessThan(0)
  })

  it('requires two hits to destroy a tough brick, scoring once per hit', () => {
    const game = createBreakoutGame()
    const toughBrick = { ...game.bricks[0], hits: 2 }
    const bricks = game.bricks.map((b, i) => (i === 0 ? toughBrick : b))
    const ball = {
      ...game.balls[0],
      x: toughBrick.x + toughBrick.width / 2 - BALL_SIZE / 2,
      y: toughBrick.y + toughBrick.height - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const afterFirstHit = advanceBreakoutGame({ ...game, bricks, balls: [ball] }, 0.05)

    expect(afterFirstHit.bricks[0].hits).toBe(1)
    expect(afterFirstHit.score).toBe(1)

    const secondBall = {
      ...afterFirstHit.balls[0],
      x: toughBrick.x + toughBrick.width / 2 - BALL_SIZE / 2,
      y: toughBrick.y + toughBrick.height - 1,
      vx: 0,
      vy: -100,
    }

    const afterSecondHit = advanceBreakoutGame({ ...afterFirstHit, balls: [secondBall] }, 0.05)

    expect(afterSecondHit.bricks[0].hits).toBe(0)
    expect(afterSecondHit.score).toBe(2)
  })

  describe('lives', () => {
    it('does not lose a life while at least one other ball is still in play', () => {
      const game = createBreakoutGame()
      const dropped = { ...game.balls[0], x: 0, y: BREAKOUT_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 }
      const stillFlying = { ...game.balls[0], x: 400, y: 100, vx: 0, vy: -100 }

      const next = advanceBreakoutGame({ ...game, balls: [dropped, stillFlying] }, 0.05)

      expect(next.lives).toBe(STARTING_LIVES)
      expect(next.lifeLost).toBe(false)
      expect(next.balls).toHaveLength(1)
      expect(next.status).toBe('playing')
    })

    it('loses a life and respawns a single ball once every ball has dropped', () => {
      const game = createBreakoutGame()
      const dropped = { ...game.balls[0], x: 0, y: BREAKOUT_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 }

      const next = advanceBreakoutGame({ ...game, balls: [dropped] }, 0.05)

      expect(next.lives).toBe(STARTING_LIVES - 1)
      expect(next.lifeLost).toBe(true)
      expect(next.status).toBe('playing')
      expect(next.balls).toHaveLength(1)
      expect(next.bricks).toEqual(game.bricks)
      expect(next.score).toBe(game.score)
    })

    it('clears an active widen effect when a life is lost', () => {
      const game: BreakoutGame = { ...createBreakoutGame(), widenRemaining: 5 }
      const dropped = { ...game.balls[0], x: 0, y: BREAKOUT_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 }

      const next = advanceBreakoutGame({ ...game, balls: [dropped] }, 0.05)

      expect(next.widenRemaining).toBe(0)
    })

    it('ends the game once the last life is lost', () => {
      const game: BreakoutGame = { ...createBreakoutGame(), lives: 1 }
      const dropped = { ...game.balls[0], x: 0, y: BREAKOUT_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 }

      const next = advanceBreakoutGame({ ...game, balls: [dropped] }, 0.05)

      expect(next.status).toBe('game-over')
      expect(next.lives).toBe(0)
      expect(next.lifeLost).toBe(true)
    })
  })

  describe('levels', () => {
    it('advances to the next level instead of ending the run when every brick is destroyed', () => {
      const game = createBreakoutGame()
      const lastBrick = game.bricks[game.bricks.length - 1]
      const bricks = game.bricks.map((b, i) => (i === game.bricks.length - 1 ? b : { ...b, hits: 0 }))
      const ball = {
        ...game.balls[0],
        x: lastBrick.x + lastBrick.width / 2 - BALL_SIZE / 2,
        y: lastBrick.y + lastBrick.height - 1,
        vx: 0,
        vy: -100,
        speed: 100,
      }

      const next = advanceBreakoutGame({ ...game, bricks, balls: [ball], score: 49 }, 0.05)

      expect(next.status).toBe('playing')
      expect(next.level).toBe(2)
      expect(next.score).toBe(50 + 10 * 1)
      expect(next.leveledUp).toBe(true)
      expect(next.bricks.length).toBeGreaterThan(0)
      expect(next.bricks.every(b => b.hits > 0)).toBe(true)
      expect(next.balls).toHaveLength(1)
      expect(next.capsules).toEqual([])
    })

    it('builds a harder wave (more rows) once past the row-increase threshold', () => {
      expect(brickRowsForLevel(1)).toBe(BRICK_ROWS)
      expect(brickRowsForLevel(3)).toBeGreaterThan(BRICK_ROWS)
    })

    it('caps row count and increases ball base speed with level, within a cap', () => {
      expect(brickRowsForLevel(100)).toBeLessThanOrEqual(8)
      expect(ballBaseSpeedForLevel(5)).toBeGreaterThan(ballBaseSpeedForLevel(1))
      expect(ballBaseSpeedForLevel(100)).toBeLessThanOrEqual(ballBaseSpeedForLevel(1) * 10)
    })
  })

  describe('power-up capsules', () => {
    it('widens the paddle for its duration when a WIDEN capsule is caught, then reverts', () => {
      const game = createBreakoutGame()
      const capsule: Capsule = {
        x: game.paddle.x + game.paddle.width / 2 - CAPSULE_SIZE / 2,
        y: game.paddle.y - 1,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: 'WIDEN',
        vy: 1,
      }

      const caught = advanceBreakoutGame({ ...game, capsules: [capsule] }, 0.01)

      expect(caught.widenRemaining).toBeCloseTo(WIDEN_DURATION_SECONDS, 5)
      expect(caught.paddle.width).toBe(WIDE_PADDLE_WIDTH)
      expect(caught.capsules).toEqual([])

      const expired = advanceBreakoutGame({ ...caught, widenRemaining: 0.001 }, 0.01)
      expect(expired.widenRemaining).toBe(0)
      expect(expired.paddle.width).toBe(PADDLE_WIDTH)
    })

    it('refreshes rather than stacks the widen duration on a repeat catch', () => {
      const game: BreakoutGame = { ...createBreakoutGame(), widenRemaining: 2 }
      const capsule: Capsule = {
        x: game.paddle.x + game.paddle.width / 2 - CAPSULE_SIZE / 2,
        y: game.paddle.y - 1,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: 'WIDEN',
        vy: 1,
      }

      const next = advanceBreakoutGame({ ...game, capsules: [capsule] }, 0.01)

      expect(next.widenRemaining).toBeCloseTo(WIDEN_DURATION_SECONDS, 5)
    })

    it('clones every ball into two more when a MULTIBALL capsule is caught', () => {
      const game = createBreakoutGame()
      const capsule: Capsule = {
        x: game.paddle.x + game.paddle.width / 2 - CAPSULE_SIZE / 2,
        y: game.paddle.y - 1,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: 'MULTIBALL',
        vy: 1,
      }

      const next = advanceBreakoutGame({ ...game, capsules: [capsule] }, 0.01)

      expect(next.balls).toHaveLength(3)
      expect(next.capsules).toEqual([])
    })

    it('caps the total ball count at MAX_BALLS on repeated multiball catches', () => {
      const game = createBreakoutGame()
      const manyBalls = Array.from({ length: MAX_BALLS - 1 }, () => ({ ...game.balls[0] }))
      const capsule: Capsule = {
        x: game.paddle.x + game.paddle.width / 2 - CAPSULE_SIZE / 2,
        y: game.paddle.y - 1,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: 'MULTIBALL',
        vy: 1,
      }

      const next = advanceBreakoutGame({ ...game, balls: manyBalls, capsules: [capsule] }, 0.01)

      expect(next.balls.length).toBe(MAX_BALLS)
    })

    it('discards a capsule that falls past the paddle with no effect', () => {
      const game = createBreakoutGame()
      const capsule: Capsule = {
        x: 10,
        y: BREAKOUT_HEIGHT + 1,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: 'WIDEN',
        vy: 1,
      }

      const next = advanceBreakoutGame({ ...game, capsules: [capsule] }, 0.01)

      expect(next.capsules).toEqual([])
      expect(next.widenRemaining).toBe(0)
    })
  })

  it('does not advance a game-over game', () => {
    const game: BreakoutGame = { ...createBreakoutGame(), status: 'game-over', score: 5 }

    const next = advanceBreakoutGame(game, 0.05)

    expect(next.status).toBe('game-over')
    expect(next.score).toBe(5)
    expect(next.balls).toEqual(game.balls)
  })

  it('does not leak a stale one-shot leveledUp/lifeLost flag on a game-over game', () => {
    // Regression: leveledUp/lifeLost are documented as true only on the tick
    // the event happened. A game-over game that was terminated by the tick
    // that lost the last life still has lifeLost: true baked into it; a
    // second advance() call on that same object must not keep reporting it.
    const game: BreakoutGame = { ...createBreakoutGame(), status: 'game-over', lifeLost: true, leveledUp: true }

    const next = advanceBreakoutGame(game, 0.05)

    expect(next.leveledUp).toBe(false)
    expect(next.lifeLost).toBe(false)
  })

  it('reaches a terminal state within a bounded number of frames when the paddle never moves', () => {
    let game = createBreakoutGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = advanceBreakoutGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.status).toBe('game-over')
    expect(game.lives).toBe(0)
  })

  it('clamps large frame deltas', () => {
    const game = createBreakoutGame()
    const next = advanceBreakoutGame(game, 10)
    const clamped = advanceBreakoutGame(game, MAX_DELTA_SECONDS)

    expect(next.balls[0].x).toBeCloseTo(clamped.balls[0].x, 5)
    expect(next.balls[0].y).toBeCloseTo(clamped.balls[0].y, 5)
  })
})
