import {
  BALL_SIZE,
  MAX_DELTA_SECONDS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PONG_HEIGHT,
  PONG_WIDTH,
  advancePongGame,
  createPongGame,
  movePaddle,
  type PongGame,
} from '../games/pong'

describe('Pong game engine', () => {
  it('creates a centered playing game with fixed dimensions', () => {
    const game = createPongGame()

    expect(PONG_WIDTH).toBe(800)
    expect(PONG_HEIGHT).toBe(500)
    expect(PADDLE_WIDTH).toBeGreaterThan(0)
    expect(PADDLE_HEIGHT).toBeGreaterThan(0)
    expect(BALL_SIZE).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.score).toBe(0)
    expect(game.ball.x).toBe((PONG_WIDTH - BALL_SIZE) / 2)
    expect(game.ball.y).toBe((PONG_HEIGHT - BALL_SIZE) / 2)
    expect(game.ball.speed).toBeGreaterThan(0)
  })

  it('clamps the player paddle to the horizontal playfield', () => {
    const game = createPongGame()

    const left = movePaddle(game, -100)
    const right = movePaddle(game, PONG_WIDTH + 100)

    expect(left.playerPaddle.x).toBe(0)
    expect(right.playerPaddle.x).toBe(
      PONG_WIDTH - PADDLE_WIDTH,
    )
    expect(game.playerPaddle.x).toBe((PONG_WIDTH - PADDLE_WIDTH) / 2)

    const nonFinite = movePaddle(game, Number.NaN)
    expect(nonFinite.playerPaddle.x).toBe(game.playerPaddle.x)
  })

  it('bounces the ball off the side wall', () => {
    const game: PongGame = {
      ...createPongGame(),
      ball: {
        ...createPongGame().ball,
        x: PONG_WIDTH - BALL_SIZE - 1,
        vx: 100,
        vy: 0,
      },
    }

    const next = advancePongGame(game, 0.05)

    expect(next.ball.vx).toBeLessThan(0)
    expect(next.ball.x).toBe(PONG_WIDTH - BALL_SIZE)
  })

  it('bounces the ball straight up off a center-hit player paddle', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBeLessThan(0)
    expect(next.ball.vx).toBeCloseTo(0, 5)
  })

  it('does not bounce off the player paddle while moving upward', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBe(-100)
  })

  it('angles the ball away from center when it hits the edge of the player paddle', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const edgeX = game.playerPaddle.x + PADDLE_WIDTH - BALL_SIZE
    const collisionBall = {
      ...game.ball,
      x: edgeX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vx).toBeGreaterThan(0)
    expect(next.ball.vy).toBeLessThan(0)
    const magnitude = Math.sqrt(next.ball.vx ** 2 + next.ball.vy ** 2)
    expect(magnitude).toBeCloseTo(next.ball.speed, 5)
  })

  it('bounces downward off the opponent paddle while moving upward', () => {
    const game = createPongGame()
    const centerX = game.opponentPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const next = advancePongGame(
      {
        ...game,
        ball: {
          ...game.ball,
          x: centerX,
          y: game.opponentPaddle.y + game.opponentPaddle.height - 1,
          vx: 0,
          vy: -100,
          speed: 100,
        },
      },
      0.05,
    )

    expect(next.score).toBe(0)
    expect(next.ball.vy).toBeGreaterThan(0)
    expect(next.ball.y).toBe(game.opponentPaddle.y + game.opponentPaddle.height)
  })

  it('opponent aim offset varies instead of always dead-centering the ball', () => {
    const game = createPongGame()

    const targets = new Set<number>()
    for (let seed = 0; seed < 20; seed += 1) {
      const direction = seed % 2 === 0 ? -50 : 50
      const ball = { ...game.ball, x: 400, vx: 0, vy: direction, speed: 50 }
      const moved = advancePongGame({ ...game, ball }, 0.001)
      targets.add(Math.round(moved.opponentPaddle.x * 100))
    }

    expect(targets.size).toBeGreaterThan(1)
  })

  it('ramps ball speed on each paddle return, capped, and resets on score', () => {
    const game = createPongGame()
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const startingSpeed = game.ball.speed

    const afterPlayerHit = advancePongGame(
      {
        ...game,
        ball: {
          ...game.ball,
          x: centerX,
          y: game.playerPaddle.y - BALL_SIZE - 1,
          vx: 0,
          vy: 100,
        },
      },
      0.05,
    )

    expect(afterPlayerHit.ball.speed).toBeGreaterThan(startingSpeed)

    let rallyGame = afterPlayerHit
    for (let i = 0; i < 50; i += 1) {
      rallyGame = {
        ...rallyGame,
        ball: {
          ...rallyGame.ball,
          x: game.opponentPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
          y: game.opponentPaddle.y + game.opponentPaddle.height - 1,
          vx: 0,
          vy: -100,
        },
      }
      rallyGame = advancePongGame(rallyGame, 0.05)
      rallyGame = {
        ...rallyGame,
        ball: {
          ...rallyGame.ball,
          x: game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
          y: game.playerPaddle.y - BALL_SIZE - 1,
          vx: 0,
          vy: 100,
        },
      }
      rallyGame = advancePongGame(rallyGame, 0.05)
    }

    expect(rallyGame.ball.speed).toBeLessThanOrEqual(1.6 * startingSpeed + 1e-6)

    const scored = advancePongGame(
      {
        ...rallyGame,
        ball: { ...rallyGame.ball, size: 20, y: 1, vx: 0, vy: -100 },
      },
      0.05,
    )

    expect(scored.ball.speed).toBeCloseTo(startingSpeed, 5)
  })

  it('awards a point and re-serves from center after the ball exits the top', () => {
    const game = createPongGame()
    const ballSize = 20
    const next = advancePongGame(
      {
        ...game,
        ball: { ...game.ball, size: ballSize, y: 1, vx: 0, vy: -100 },
      },
      0.05,
    )

    expect(next.score).toBe(1)
    expect(next.status).toBe('playing')
    expect(next.ball.x).toBe((PONG_WIDTH - ballSize) / 2)
    expect(next.ball.y).toBe((PONG_HEIGHT - ballSize) / 2)
    expect(next.ball.vy).toBeGreaterThan(0)
  })

  it('ends the game and retains the score after the ball exits the bottom', () => {
    const game = createPongGame()
    const next = advancePongGame(
      {
        ...game,
        score: 3,
        ball: { ...game.ball, y: PONG_HEIGHT - BALL_SIZE - 1, vx: 0, vy: 100 },
      },
      0.05,
    )

    expect(next.status).toBe('game-over')
    expect(next.score).toBe(3)
  })

  it('allows a player tracking the ball to eventually score', () => {
    let game = createPongGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = movePaddle(game, game.ball.x + game.ball.size / 2)
      game = advancePongGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.score).toBeGreaterThan(0)
  })

  it('clamps the simulation delta to 0.05 seconds', () => {
    const game = createPongGame()

    const long = advancePongGame(game, 1)
    const clamped = advancePongGame(game, 0.05)
    expect(long.ball).toEqual(clamped.ball)
    expect(long.score).toBe(clamped.score)
    expect(long.status).toBe(clamped.status)
    expect(long.playerPaddle).toEqual(clamped.playerPaddle)
  })
})
