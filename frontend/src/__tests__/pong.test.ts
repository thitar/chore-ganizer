import {
  BALL_SIZE,
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

  it('bounces off the player paddle only while moving downward', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const collisionBall = {
      ...game.ball,
      x: game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
    }

    const downward = advancePongGame(
      { ...game, ball: { ...collisionBall, vy: 100 } },
      0.05,
    )
    const upward = advancePongGame(
      { ...game, ball: { ...collisionBall, vy: -100 } },
      0.05,
    )

    expect(downward.ball.vy).toBeLessThan(0)
    expect(upward.ball.vy).toBe(-100)
  })

  it('bounces downward off the opponent paddle while moving upward', () => {
    const game = createPongGame()
    const next = advancePongGame(
      {
        ...game,
        ball: {
          ...game.ball,
          x: game.opponentPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
          y: game.opponentPaddle.y + game.opponentPaddle.height - 1,
          vx: 0,
          vy: -100,
        },
      },
      0.05,
    )

    expect(next.score).toBe(0)
    expect(next.ball.vy).toBeGreaterThan(0)
    expect(next.ball.y).toBe(game.opponentPaddle.y + game.opponentPaddle.height)
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

  it('clamps the simulation delta to 0.05 seconds', () => {
    const game = createPongGame()

    expect(advancePongGame(game, 1)).toEqual(advancePongGame(game, 0.05))
  })
})
