import {
  BALL_SIZE,
  BREAKOUT_HEIGHT,
  BREAKOUT_WIDTH,
  BRICK_COLS,
  BRICK_ROWS,
  MAX_DELTA_SECONDS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  advanceBreakoutGame,
  createBreakoutGame,
  movePaddle,
  type BreakoutGame,
} from '../games/breakout'

describe('Breakout game engine', () => {
  it('creates a centered playing game with a full brick grid and fixed dimensions', () => {
    const game = createBreakoutGame()

    expect(BREAKOUT_WIDTH).toBe(800)
    expect(BREAKOUT_HEIGHT).toBe(500)
    expect(PADDLE_WIDTH).toBeGreaterThan(0)
    expect(PADDLE_HEIGHT).toBeGreaterThan(0)
    expect(BALL_SIZE).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.cleared).toBe(false)
    expect(game.score).toBe(0)
    expect(game.bricks).toHaveLength(BRICK_ROWS * BRICK_COLS)
    expect(game.bricks.every(b => b.alive)).toBe(true)
    expect(game.paddle.x).toBe((BREAKOUT_WIDTH - PADDLE_WIDTH) / 2)
    expect(game.ball.speed).toBeGreaterThan(0)
  })

  it('clamps the paddle to the horizontal playfield', () => {
    const game = createBreakoutGame()

    const left = movePaddle(game, -100)
    const right = movePaddle(game, BREAKOUT_WIDTH + 100)

    expect(left.paddle.x).toBe(0)
    expect(right.paddle.x).toBe(BREAKOUT_WIDTH - PADDLE_WIDTH)
    expect(game.paddle.x).toBe((BREAKOUT_WIDTH - PADDLE_WIDTH) / 2)

    const nonFinite = movePaddle(game, Number.NaN)
    expect(nonFinite.paddle.x).toBe(game.paddle.x)
  })

  it('bounces the ball off the side wall', () => {
    const game: BreakoutGame = {
      ...createBreakoutGame(),
      ball: {
        ...createBreakoutGame().ball,
        x: BREAKOUT_WIDTH - BALL_SIZE - 1,
        y: 300,
        vx: 100,
        vy: 0,
      },
    }

    const next = advanceBreakoutGame(game, 0.05)

    expect(next.ball.vx).toBeLessThan(0)
    expect(next.ball.x).toBe(BREAKOUT_WIDTH - BALL_SIZE)
  })

  it('bounces the ball off the top wall', () => {
    const game: BreakoutGame = {
      ...createBreakoutGame(),
      bricks: createBreakoutGame().bricks.map(b => ({ ...b, alive: false })),
      ball: {
        ...createBreakoutGame().ball,
        x: 400,
        y: 1,
        vx: 0,
        vy: -100,
      },
    }

    const next = advanceBreakoutGame(game, 0.05)

    expect(next.ball.vy).toBeGreaterThan(0)
    expect(next.ball.y).toBe(0)
  })

  it('bounces straight up off a center-hit paddle', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const centerX = game.paddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: paddleY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBeLessThan(0)
    expect(next.ball.vx).toBeCloseTo(0, 5)
    expect(next.status).toBe('playing')
  })

  it('angles the ball away from center when it hits the edge of the paddle', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const edgeX = game.paddle.x + PADDLE_WIDTH - BALL_SIZE
    const collisionBall = {
      ...game.ball,
      x: edgeX,
      y: paddleY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vx).toBeGreaterThan(0)
    expect(next.ball.vy).toBeLessThan(0)
  })

  it('does not bounce off the paddle while moving upward', () => {
    const game = createBreakoutGame()
    const paddleY = game.paddle.y
    const centerX = game.paddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: paddleY - BALL_SIZE - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBe(-100)
  })

  it('ends the game when the ball passes the paddle', () => {
    const game = createBreakoutGame()
    const next = advanceBreakoutGame(
      {
        ...game,
        score: 3,
        bricks: game.bricks.map(b => ({ ...b, alive: false })),
        ball: { ...game.ball, x: 0, y: BREAKOUT_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 },
      },
      0.05,
    )

    expect(next.status).toBe('game-over')
    expect(next.cleared).toBe(false)
    expect(next.score).toBe(3)
  })

  it('breaks a brick on impact, bounces vertically off its top face, and increments the score', () => {
    const game = createBreakoutGame()
    const targetBrick = game.bricks[0]
    const ball = {
      ...game.ball,
      x: targetBrick.x + targetBrick.width / 2 - BALL_SIZE / 2,
      y: targetBrick.y + targetBrick.height - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, ball }, 0.05)

    expect(next.score).toBe(1)
    expect(next.bricks[0].alive).toBe(false)
    expect(next.ball.vy).toBeGreaterThan(0)
    expect(next.status).toBe('playing')
  })

  it('bounces horizontally off the side face of a brick', () => {
    const game = createBreakoutGame()
    const targetBrick = game.bricks[1]
    const ball = {
      ...game.ball,
      x: targetBrick.x - BALL_SIZE + 1,
      y: targetBrick.y + targetBrick.height / 2 - BALL_SIZE / 2,
      vx: 100,
      vy: 0,
      speed: 100,
    }

    const next = advanceBreakoutGame({ ...game, ball }, 0.05)

    expect(next.bricks[1].alive).toBe(false)
    expect(next.ball.vx).toBeLessThan(0)
  })

  it('ends the run and reports the final score when the last brick is cleared', () => {
    const game = createBreakoutGame()
    const lastBrick = game.bricks[game.bricks.length - 1]
    const bricks = game.bricks.map((b, i) => (i === game.bricks.length - 1 ? b : { ...b, alive: false }))
    const ball = {
      ...game.ball,
      x: lastBrick.x + lastBrick.width / 2 - BALL_SIZE / 2,
      y: lastBrick.y + lastBrick.height - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const clearedGame = advanceBreakoutGame({ ...game, bricks, ball, score: 49 }, 0.05)

    expect(clearedGame.score).toBe(50)
    expect(clearedGame.status).toBe('game-over')
    expect(clearedGame.cleared).toBe(true)
    expect(clearedGame.bricks.every(b => !b.alive)).toBe(true)
  })

  it('does not advance a game-over game', () => {
    const game: BreakoutGame = { ...createBreakoutGame(), status: 'game-over', score: 5 }

    const next = advanceBreakoutGame(game, 0.05)

    expect(next.status).toBe('game-over')
    expect(next.score).toBe(5)
    expect(next.ball).toEqual(game.ball)
  })

  it('reaches a terminal state within a bounded number of frames when the paddle never moves', () => {
    let game = createBreakoutGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = advanceBreakoutGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.status).toBe('game-over')
    expect(game.cleared).toBe(false)
  })

  it('clamps large frame deltas', () => {
    const game = createBreakoutGame()
    const next = advanceBreakoutGame(game, 10)
    const clamped = advanceBreakoutGame(game, MAX_DELTA_SECONDS)

    expect(next.ball.x).toBeCloseTo(clamped.ball.x, 5)
    expect(next.ball.y).toBeCloseTo(clamped.ball.y, 5)
  })
})
