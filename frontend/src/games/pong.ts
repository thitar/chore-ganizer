export const PONG_WIDTH = 800
export const PONG_HEIGHT = 500
export const PADDLE_WIDTH = 120
export const PADDLE_HEIGHT = 16
export const BALL_SIZE = 14
export const MAX_DELTA_SECONDS = 0.05

const PLAYER_PADDLE_BOTTOM_GAP = 24
const OPPONENT_PADDLE_TOP_GAP = 24
const BALL_SPEED_X = 180
const BALL_SPEED_Y = 260
const OPPONENT_SPEED = 120

export type PongStatus = 'playing' | 'game-over'

export interface PongPaddle {
  x: number
  y: number
  width: number
  height: number
}

export interface PongBall {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

export interface PongGame {
  playerPaddle: PongPaddle
  opponentPaddle: PongPaddle
  ball: PongBall
  score: number
  status: PongStatus
}

function centeredPaddle(y: number): PongPaddle {
  return {
    x: (PONG_WIDTH - PADDLE_WIDTH) / 2,
    y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  }
}

export function createPongGame(): PongGame {
  return {
    playerPaddle: centeredPaddle(PONG_HEIGHT - PADDLE_HEIGHT - PLAYER_PADDLE_BOTTOM_GAP),
    opponentPaddle: centeredPaddle(OPPONENT_PADDLE_TOP_GAP),
    ball: {
      x: (PONG_WIDTH - BALL_SIZE) / 2,
      y: (PONG_HEIGHT - BALL_SIZE) / 2,
      vx: BALL_SPEED_X,
      vy: BALL_SPEED_Y,
      size: BALL_SIZE,
    },
    score: 0,
    status: 'playing',
  }
}

export function movePaddle(game: PongGame, pointerX: number): PongGame {
  if (!Number.isFinite(pointerX)) {
    return {
      ...game,
      playerPaddle: { ...game.playerPaddle },
    }
  }

  const x = Math.max(0, Math.min(PONG_WIDTH - PADDLE_WIDTH, pointerX - PADDLE_WIDTH / 2))

  return {
    ...game,
    playerPaddle: {
      ...game.playerPaddle,
      x,
    },
  }
}

function moveOpponent(paddle: PongPaddle, ball: PongBall, deltaSeconds: number): PongPaddle {
  const targetX = ball.x + ball.size / 2 - paddle.width / 2
  const maximumTravel = OPPONENT_SPEED * deltaSeconds
  const distance = targetX - paddle.x
  const movement = Math.max(-maximumTravel, Math.min(maximumTravel, distance))
  const x = Math.max(0, Math.min(PONG_WIDTH - paddle.width, paddle.x + movement))

  return { ...paddle, x }
}

function overlapsPaddle(ball: PongBall, paddle: PongPaddle): boolean {
  return (
    ball.x < paddle.x + paddle.width &&
    ball.x + ball.size > paddle.x &&
    ball.y < paddle.y + paddle.height &&
    ball.y + ball.size > paddle.y
  )
}

export function advancePongGame(game: PongGame, deltaSeconds: number): PongGame {
  if (game.status === 'game-over') {
    return {
      ...game,
      playerPaddle: { ...game.playerPaddle },
      opponentPaddle: { ...game.opponentPaddle },
      ball: { ...game.ball },
    }
  }

  const seconds = Number.isFinite(deltaSeconds)
    ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds))
    : 0
  const opponentPaddle = moveOpponent(game.opponentPaddle, game.ball, seconds)
  let nextX = game.ball.x + game.ball.vx * seconds
  const nextY = game.ball.y + game.ball.vy * seconds
  let vx = game.ball.vx

  if (nextX <= 0) {
    nextX = 0
    vx = Math.abs(vx)
  } else if (nextX + game.ball.size >= PONG_WIDTH) {
    nextX = PONG_WIDTH - game.ball.size
    vx = -Math.abs(vx)
  }

  const movingDownward = game.ball.vy > 0
  const crossedPlayerPaddle =
    movingDownward &&
    game.ball.y + game.ball.size <= game.playerPaddle.y &&
    nextY + game.ball.size >= game.playerPaddle.y &&
    overlapsPaddle(
      { ...game.ball, x: nextX, y: nextY, vx },
      game.playerPaddle,
    )

  if (crossedPlayerPaddle) {
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: game.playerPaddle.y - game.ball.size,
        vx,
        vy: -Math.abs(game.ball.vy),
      },
    }
  }

  const movingUpward = game.ball.vy < 0
  const hitOpponentPaddle =
    movingUpward &&
    overlapsPaddle(
      { ...game.ball, x: nextX, y: nextY, vx },
      opponentPaddle,
    )

  if (hitOpponentPaddle) {
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: opponentPaddle.y + opponentPaddle.height,
        vx,
        vy: Math.abs(game.ball.vy),
      },
    }
  }

  if (nextY <= 0 && game.ball.vy < 0) {
    return {
      ...game,
      opponentPaddle,
      score: game.score + 1,
      ball: {
        ...game.ball,
        x: (PONG_WIDTH - game.ball.size) / 2,
        y: (PONG_HEIGHT - game.ball.size) / 2,
        vx: BALL_SPEED_X,
        vy: BALL_SPEED_Y,
      },
    }
  }

  if (nextY + game.ball.size >= PONG_HEIGHT && game.ball.vy > 0) {
    return {
      ...game,
      opponentPaddle,
      ball: { ...game.ball, x: nextX, y: nextY, vx },
      status: 'game-over',
    }
  }

  return {
    ...game,
    opponentPaddle,
    ball: { ...game.ball, x: nextX, y: nextY, vx },
  }
}
