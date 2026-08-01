export const PONG_WIDTH = 800
export const PONG_HEIGHT = 500
export const PADDLE_WIDTH = 120
export const PADDLE_HEIGHT = 16
export const BALL_SIZE = 14
export const MAX_DELTA_SECONDS = 0.05

const PLAYER_PADDLE_BOTTOM_GAP = 24
const OPPONENT_PADDLE_TOP_GAP = 24
// Preserves the pre-angling serve speed, which was a fixed vx=180, vy=260 vector.
const BASE_BALL_SPEED = Math.sqrt(180 ** 2 + 260 ** 2)
const MAX_ANGLE_RATIO = 0.75
const RALLY_SPEEDUP = 1.04
const MAX_BALL_SPEED = BASE_BALL_SPEED * 1.6
const OPPONENT_SPEED = 175
const OPPONENT_AIM_RANGE = 0.5

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
  speed: number
  size: number
}

export interface PongGame {
  playerPaddle: PongPaddle
  opponentPaddle: PongPaddle
  ball: PongBall
  score: number
  status: PongStatus
  opponentAimOffset: number
  opponentAimDirection: 1 | -1 | 0
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
      vx: 0,
      vy: BASE_BALL_SPEED,
      speed: BASE_BALL_SPEED,
      size: BALL_SIZE,
    },
    score: 0,
    status: 'playing',
    opponentAimOffset: 0,
    opponentAimDirection: 0,
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

function moveOpponent(
  paddle: PongPaddle,
  ball: PongBall,
  deltaSeconds: number,
  aimOffset: number,
  aimDirection: 1 | -1 | 0,
): { paddle: PongPaddle; aimOffset: number; aimDirection: 1 | -1 | 0 } {
  const direction: 1 | -1 = ball.vy < 0 ? -1 : 1
  let nextAimOffset = aimOffset
  let nextAimDirection: 1 | -1 | 0 = aimDirection
  if (direction !== aimDirection) {
    nextAimDirection = direction
    nextAimOffset = (Math.random() * 2 - 1) * OPPONENT_AIM_RANGE * (paddle.width / 2)
  }

  const targetX = ball.x + ball.size / 2 - paddle.width / 2 + nextAimOffset
  const maximumTravel = OPPONENT_SPEED * deltaSeconds
  const distance = targetX - paddle.x
  const movement = Math.max(-maximumTravel, Math.min(maximumTravel, distance))
  const x = Math.max(0, Math.min(PONG_WIDTH - paddle.width, paddle.x + movement))

  return { paddle: { ...paddle, x }, aimOffset: nextAimOffset, aimDirection: nextAimDirection }
}

function overlapsPaddle(ball: PongBall, paddle: PongPaddle): boolean {
  return (
    ball.x < paddle.x + paddle.width &&
    ball.x + ball.size > paddle.x &&
    ball.y < paddle.y + paddle.height &&
    ball.y + ball.size > paddle.y
  )
}

function bounceOffPaddle(
  ball: PongBall,
  paddle: PongPaddle,
  direction: 1 | -1,
): { vx: number; vy: number } {
  const paddleCenter = paddle.x + paddle.width / 2
  const ballCenter = ball.x + ball.size / 2
  const offset = Math.max(
    -1,
    Math.min(1, (ballCenter - paddleCenter) / (paddle.width / 2)),
  )
  const vx = offset * MAX_ANGLE_RATIO * ball.speed
  const vy = direction * Math.sqrt(Math.max(0, ball.speed ** 2 - vx ** 2))
  return { vx, vy }
}

function ballAfterPaddleBounce(
  ball: PongBall,
  paddle: PongPaddle,
  direction: 1 | -1,
  nextX: number,
  y: number,
): PongBall {
  const speed = Math.min(ball.speed * RALLY_SPEEDUP, MAX_BALL_SPEED)
  const { vx, vy } = bounceOffPaddle({ ...ball, x: nextX, speed }, paddle, direction)
  return { ...ball, x: nextX, y, vx, vy, speed }
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
  const {
    paddle: opponentPaddle,
    aimOffset: opponentAimOffset,
    aimDirection: opponentAimDirection,
  } = moveOpponent(
    game.opponentPaddle,
    game.ball,
    seconds,
    game.opponentAimOffset,
    game.opponentAimDirection,
  )
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
      opponentAimOffset,
      opponentAimDirection,
      ball: ballAfterPaddleBounce(
        game.ball,
        game.playerPaddle,
        -1,
        nextX,
        game.playerPaddle.y - game.ball.size,
      ),
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
      opponentAimOffset,
      opponentAimDirection,
      ball: ballAfterPaddleBounce(
        game.ball,
        opponentPaddle,
        1,
        nextX,
        opponentPaddle.y + opponentPaddle.height,
      ),
    }
  }

  if (nextY <= 0 && game.ball.vy < 0) {
    return {
      ...game,
      opponentPaddle,
      opponentAimOffset,
      opponentAimDirection,
      score: game.score + 1,
      ball: {
        ...game.ball,
        x: (PONG_WIDTH - game.ball.size) / 2,
        y: (PONG_HEIGHT - game.ball.size) / 2,
        vx: 0,
        vy: BASE_BALL_SPEED,
        speed: BASE_BALL_SPEED,
      },
    }
  }

  if (nextY + game.ball.size >= PONG_HEIGHT && game.ball.vy > 0) {
    return {
      ...game,
      opponentPaddle,
      opponentAimOffset,
      opponentAimDirection,
      ball: { ...game.ball, x: nextX, y: nextY, vx },
      status: 'game-over',
    }
  }

  return {
    ...game,
    opponentPaddle,
    opponentAimOffset,
    opponentAimDirection,
    ball: { ...game.ball, x: nextX, y: nextY, vx },
  }
}
