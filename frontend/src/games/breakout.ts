export const BREAKOUT_WIDTH = 800
export const BREAKOUT_HEIGHT = 500
export const PADDLE_WIDTH = 120
export const PADDLE_HEIGHT = 16
export const BALL_SIZE = 14
export const MAX_DELTA_SECONDS = 0.05

export const BRICK_ROWS = 5
export const BRICK_COLS = 10
export const BRICK_PADDING = 8
export const BRICK_HEIGHT = 24
export const BRICK_TOP_OFFSET = 60

const PADDLE_BOTTOM_GAP = 24
const BASE_BALL_SPEED = Math.sqrt(180 ** 2 + 260 ** 2)
const MAX_ANGLE_RATIO = 0.75
const RALLY_SPEEDUP = 1.02
const MAX_BALL_SPEED = BASE_BALL_SPEED * 1.6
const SERVE_VX = BASE_BALL_SPEED * 0.35

const BRICK_WIDTH =
  (BREAKOUT_WIDTH - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS

export type BreakoutStatus = 'playing' | 'game-over'

export interface BreakoutPaddle {
  x: number
  y: number
  width: number
  height: number
}

export interface BreakoutBall {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  size: number
}

export interface Brick {
  x: number
  y: number
  width: number
  height: number
  alive: boolean
}

export interface BreakoutGame {
  paddle: BreakoutPaddle
  ball: BreakoutBall
  bricks: Brick[]
  score: number
  status: BreakoutStatus
  /** True when every brick was cleared (a distinct way to end the run, still reported via status 'game-over'). */
  cleared: boolean
}

function centeredPaddle(): BreakoutPaddle {
  return {
    x: (BREAKOUT_WIDTH - PADDLE_WIDTH) / 2,
    y: BREAKOUT_HEIGHT - PADDLE_HEIGHT - PADDLE_BOTTOM_GAP,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  }
}

function buildBricks(): Brick[] {
  const bricks: Brick[] = []
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_PADDING + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        alive: true,
      })
    }
  }
  return bricks
}

export function createBreakoutGame(): BreakoutGame {
  return {
    paddle: centeredPaddle(),
    ball: {
      x: (BREAKOUT_WIDTH - BALL_SIZE) / 2,
      y: BREAKOUT_HEIGHT - PADDLE_HEIGHT - PADDLE_BOTTOM_GAP - BALL_SIZE - 40,
      // Angled rather than straight up: a purely vertical serve (vx===0) has
      // no horizontal component for brickBounceAxis to ever flip, so it would
      // drill straight through a column of bricks instead of bouncing.
      vx: SERVE_VX,
      vy: -Math.sqrt(Math.max(0, BASE_BALL_SPEED ** 2 - SERVE_VX ** 2)),
      speed: BASE_BALL_SPEED,
      size: BALL_SIZE,
    },
    bricks: buildBricks(),
    score: 0,
    status: 'playing',
    cleared: false,
  }
}

export function movePaddle(game: BreakoutGame, pointerX: number): BreakoutGame {
  if (!Number.isFinite(pointerX)) {
    return { ...game, paddle: { ...game.paddle } }
  }

  const x = Math.max(0, Math.min(BREAKOUT_WIDTH - PADDLE_WIDTH, pointerX - PADDLE_WIDTH / 2))

  return {
    ...game,
    paddle: { ...game.paddle, x },
  }
}

function overlapsRect(ball: BreakoutBall, rect: { x: number; y: number; width: number; height: number }): boolean {
  return (
    ball.x < rect.x + rect.width &&
    ball.x + ball.size > rect.x &&
    ball.y < rect.y + rect.height &&
    ball.y + ball.size > rect.y
  )
}

function bounceOffPaddle(ball: BreakoutBall, paddle: BreakoutPaddle): { vx: number; vy: number } {
  const paddleCenter = paddle.x + paddle.width / 2
  const ballCenter = ball.x + ball.size / 2
  const offset = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (paddle.width / 2)))
  const vx = offset * MAX_ANGLE_RATIO * ball.speed
  const vy = -Math.sqrt(Math.max(0, ball.speed ** 2 - vx ** 2))
  return { vx, vy }
}

/**
 * Resolves which axis the ball crossed into a brick on. Primarily gated on
 * which axis the ball is actually travelling into the brick along (a ball
 * moving straight up, vx===0, can never have crossed a brick's left/right
 * face no matter how much x-overlap the AABB check reports). Falls back to
 * comparing penetration depth only when both or neither axis qualify.
 */
function brickBounceAxis(ball: BreakoutBall, brick: Brick): 'x' | 'y' {
  const ballCenterX = ball.x + ball.size / 2
  const ballCenterY = ball.y + ball.size / 2
  const brickCenterX = brick.x + brick.width / 2
  const brickCenterY = brick.y + brick.height / 2

  const approachingX = ball.vx !== 0 && Math.sign(ball.vx) === Math.sign(brickCenterX - ballCenterX)
  const approachingY = ball.vy !== 0 && Math.sign(ball.vy) === Math.sign(brickCenterY - ballCenterY)

  if (approachingX && !approachingY) return 'x'
  if (approachingY && !approachingX) return 'y'

  const overlapX = ball.size / 2 + brick.width / 2 - Math.abs(ballCenterX - brickCenterX)
  const overlapY = ball.size / 2 + brick.height / 2 - Math.abs(ballCenterY - brickCenterY)

  return overlapX < overlapY ? 'x' : 'y'
}

export function advanceBreakoutGame(game: BreakoutGame, deltaSeconds: number): BreakoutGame {
  if (game.status === 'game-over') {
    return {
      ...game,
      paddle: { ...game.paddle },
      ball: { ...game.ball },
    }
  }

  const seconds = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds)) : 0

  let nextX = game.ball.x + game.ball.vx * seconds
  let nextY = game.ball.y + game.ball.vy * seconds
  let vx = game.ball.vx
  let vy = game.ball.vy

  if (nextX <= 0) {
    nextX = 0
    vx = Math.abs(vx)
  } else if (nextX + game.ball.size >= BREAKOUT_WIDTH) {
    nextX = BREAKOUT_WIDTH - game.ball.size
    vx = -Math.abs(vx)
  }

  if (nextY <= 0) {
    nextY = 0
    vy = Math.abs(vy)
  }

  const movingDownward = vy > 0
  const candidateBall: BreakoutBall = { ...game.ball, x: nextX, y: nextY, vx, vy }
  const crossedPaddle =
    movingDownward &&
    game.ball.y + game.ball.size <= game.paddle.y &&
    nextY + game.ball.size >= game.paddle.y &&
    overlapsRect(candidateBall, game.paddle)

  if (crossedPaddle) {
    const bounce = bounceOffPaddle(candidateBall, game.paddle)
    const speed = Math.min(game.ball.speed * RALLY_SPEEDUP, MAX_BALL_SPEED)
    const ratio = speed / game.ball.speed
    return {
      ...game,
      ball: {
        ...game.ball,
        x: nextX,
        y: game.paddle.y - game.ball.size,
        vx: bounce.vx * ratio,
        vy: bounce.vy * ratio,
        speed,
      },
    }
  }

  const hitBrickIndex = game.bricks.findIndex(brick => brick.alive && overlapsRect(candidateBall, brick))

  if (hitBrickIndex !== -1) {
    const brick = game.bricks[hitBrickIndex]
    const axis = brickBounceAxis(candidateBall, brick)
    const bricks = game.bricks.map((b, i) => (i === hitBrickIndex ? { ...b, alive: false } : b))
    const cleared = bricks.every(b => !b.alive)

    return {
      ...game,
      bricks,
      score: game.score + 1,
      status: cleared ? 'game-over' : 'playing',
      cleared,
      ball: {
        ...game.ball,
        x: nextX,
        y: nextY,
        vx: axis === 'x' ? -vx : vx,
        vy: axis === 'y' ? -vy : vy,
      },
    }
  }

  if (nextY + game.ball.size >= BREAKOUT_HEIGHT) {
    return {
      ...game,
      ball: { ...game.ball, x: nextX, y: nextY, vx, vy },
      status: 'game-over',
    }
  }

  return {
    ...game,
    ball: { ...game.ball, x: nextX, y: nextY, vx, vy },
  }
}
