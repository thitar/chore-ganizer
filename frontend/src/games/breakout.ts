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

export const STARTING_LIVES = 3
export const CAPSULE_SIZE = 22
export const WIDE_PADDLE_WIDTH = PADDLE_WIDTH * 1.6
export const WIDEN_DURATION_SECONDS = 8
export const MAX_BALLS = 6

const PADDLE_BOTTOM_GAP = 24
const BASE_BALL_SPEED = Math.sqrt(180 ** 2 + 260 ** 2)
const MAX_ANGLE_RATIO = 0.75
const RALLY_SPEEDUP = 1.02
const MAX_BALL_SPEED = BASE_BALL_SPEED * 1.6
const SERVE_VX_RATIO = 0.35

const MAX_BRICK_ROWS = 8
const TOUGH_BRICK_LEVEL = 3
const TOUGH_BRICK_CHANCE = 0.3
const BALL_LEVEL_SPEED_STEP = 15
const BALL_MAX_BASE_SPEED = MAX_BALL_SPEED * 0.85
const POWERUP_DROP_CHANCE = 0.15
const CAPSULE_FALL_SPEED = 120
const LEVEL_CLEAR_BONUS = 10
const SPLIT_ANGLE_OFFSET = 0.35

const BRICK_WIDTH =
  (BREAKOUT_WIDTH - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS

export type BreakoutStatus = 'playing' | 'game-over'
export type CapsuleType = 'WIDEN' | 'MULTIBALL'

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
  /** Hits remaining before the brick is destroyed. Destroyed once <= 0. */
  hits: number
}

export interface Capsule {
  x: number
  y: number
  width: number
  height: number
  type: CapsuleType
  vy: number
}

export interface BreakoutGame {
  paddle: BreakoutPaddle
  balls: BreakoutBall[]
  bricks: Brick[]
  capsules: Capsule[]
  score: number
  status: BreakoutStatus
  /** Wave number, starting at 1. Clearing a wave advances this and spawns a harder one. */
  level: number
  lives: number
  /** Seconds remaining on an active WIDEN capsule effect. Paddle is wide while > 0. */
  widenRemaining: number
  /** True only on the tick a wave was just cleared and the next one spawned. */
  leveledUp: boolean
  /** True only on the tick the last ball dropped and a life was spent. */
  lifeLost: boolean
}

export function brickRowsForLevel(level: number): number {
  return Math.min(BRICK_ROWS + Math.floor((level - 1) / 2), MAX_BRICK_ROWS)
}

export function ballBaseSpeedForLevel(level: number): number {
  return Math.min(BASE_BALL_SPEED + (level - 1) * BALL_LEVEL_SPEED_STEP, BALL_MAX_BASE_SPEED)
}

function centeredPaddle(): BreakoutPaddle {
  return {
    x: (BREAKOUT_WIDTH - PADDLE_WIDTH) / 2,
    y: BREAKOUT_HEIGHT - PADDLE_HEIGHT - PADDLE_BOTTOM_GAP,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  }
}

function buildBricks(level: number): Brick[] {
  const rows = brickRowsForLevel(level)
  const toughEligible = level >= TOUGH_BRICK_LEVEL
  const bricks: Brick[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const tough = toughEligible && Math.random() < TOUGH_BRICK_CHANCE
      bricks.push({
        x: BRICK_PADDING + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        hits: tough ? 2 : 1,
      })
    }
  }
  return bricks
}

function serveBall(level: number): BreakoutBall {
  const speed = ballBaseSpeedForLevel(level)
  // Angled rather than straight up: a purely vertical serve (vx===0) has no
  // horizontal component for brickBounceAxis to ever flip, so it would drill
  // straight through a column of bricks instead of bouncing.
  const vx = speed * SERVE_VX_RATIO
  return {
    x: (BREAKOUT_WIDTH - BALL_SIZE) / 2,
    y: BREAKOUT_HEIGHT - PADDLE_HEIGHT - PADDLE_BOTTOM_GAP - BALL_SIZE - 40,
    vx,
    vy: -Math.sqrt(Math.max(0, speed ** 2 - vx ** 2)),
    speed,
    size: BALL_SIZE,
  }
}

export function createBreakoutGame(): BreakoutGame {
  return {
    paddle: centeredPaddle(),
    balls: [serveBall(1)],
    bricks: buildBricks(1),
    capsules: [],
    score: 0,
    status: 'playing',
    level: 1,
    lives: STARTING_LIVES,
    widenRemaining: 0,
    leveledUp: false,
    lifeLost: false,
  }
}

export function movePaddle(game: BreakoutGame, pointerX: number): BreakoutGame {
  if (!Number.isFinite(pointerX)) {
    return { ...game, paddle: { ...game.paddle } }
  }

  const width = game.paddle.width
  const x = Math.max(0, Math.min(BREAKOUT_WIDTH - width, pointerX - width / 2))

  return {
    ...game,
    paddle: { ...game.paddle, x },
  }
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function overlapsRect(ball: BreakoutBall, rect: { x: number; y: number; width: number; height: number }): boolean {
  return rectsOverlap({ x: ball.x, y: ball.y, width: ball.size, height: ball.size }, rect)
}

function bounceOffPaddle(ball: BreakoutBall, paddle: BreakoutPaddle): { vx: number; vy: number } {
  const paddleCenter = paddle.x + paddle.width / 2
  const ballCenter = ball.x + ball.size / 2
  const offset = Math.max(-1, Math.min(1, (ballCenter - paddleCenter) / (paddle.width / 2)))
  const vx = offset * MAX_ANGLE_RATIO * ball.speed
  const vy = -Math.sqrt(Math.max(0, ball.speed ** 2 - vx ** 2))
  return { vx, vy }
}

/** Clones a ball with its launch angle nudged by `direction`, for multiball. */
function splitBall(ball: BreakoutBall, direction: 1 | -1): BreakoutBall {
  const speed = ball.speed
  const currentAngleRatio = Math.max(-1, Math.min(1, ball.vx / speed))
  const angleRatio = Math.max(-MAX_ANGLE_RATIO, Math.min(MAX_ANGLE_RATIO, currentAngleRatio + direction * SPLIT_ANGLE_OFFSET))
  const vx = angleRatio * speed
  const verticalSign = ball.vy === 0 ? -1 : Math.sign(ball.vy)
  const vy = verticalSign * Math.sqrt(Math.max(0, speed ** 2 - vx ** 2))
  return { ...ball, vx, vy }
}

function applyMultiball(balls: BreakoutBall[]): BreakoutBall[] {
  const result = [...balls]
  for (const ball of balls) {
    if (result.length >= MAX_BALLS) break
    result.push(splitBall(ball, 1))
    if (result.length >= MAX_BALLS) break
    result.push(splitBall(ball, -1))
  }
  return result
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

interface BallStepResult {
  /** null means the ball dropped past the paddle this tick. */
  ball: BreakoutBall | null
  bricks: Brick[]
  scoreDelta: number
  capsule: Capsule | null
}

function advanceBall(ball: BreakoutBall, paddle: BreakoutPaddle, bricks: Brick[], seconds: number): BallStepResult {
  let nextX = ball.x + ball.vx * seconds
  let nextY = ball.y + ball.vy * seconds
  let vx = ball.vx
  let vy = ball.vy

  if (nextX <= 0) {
    nextX = 0
    vx = Math.abs(vx)
  } else if (nextX + ball.size >= BREAKOUT_WIDTH) {
    nextX = BREAKOUT_WIDTH - ball.size
    vx = -Math.abs(vx)
  }

  if (nextY <= 0) {
    nextY = 0
    vy = Math.abs(vy)
  }

  const movingDownward = vy > 0
  const candidateBall: BreakoutBall = { ...ball, x: nextX, y: nextY, vx, vy }
  const crossedPaddle =
    movingDownward &&
    ball.y + ball.size <= paddle.y &&
    nextY + ball.size >= paddle.y &&
    overlapsRect(candidateBall, paddle)

  if (crossedPaddle) {
    const bounce = bounceOffPaddle(candidateBall, paddle)
    const speed = Math.min(ball.speed * RALLY_SPEEDUP, MAX_BALL_SPEED)
    const ratio = speed / ball.speed
    return {
      ball: {
        ...ball,
        x: nextX,
        y: paddle.y - ball.size,
        vx: bounce.vx * ratio,
        vy: bounce.vy * ratio,
        speed,
      },
      bricks,
      scoreDelta: 0,
      capsule: null,
    }
  }

  const hitBrickIndex = bricks.findIndex(brick => brick.hits > 0 && overlapsRect(candidateBall, brick))

  if (hitBrickIndex !== -1) {
    const brick = bricks[hitBrickIndex]
    const axis = brickBounceAxis(candidateBall, brick)
    const hits = brick.hits - 1
    const destroyed = hits <= 0
    const nextBricks = bricks.map((b, i) => (i === hitBrickIndex ? { ...b, hits } : b))

    let capsule: Capsule | null = null
    if (destroyed && Math.random() < POWERUP_DROP_CHANCE) {
      capsule = {
        x: brick.x + brick.width / 2 - CAPSULE_SIZE / 2,
        y: brick.y + brick.height / 2 - CAPSULE_SIZE / 2,
        width: CAPSULE_SIZE,
        height: CAPSULE_SIZE,
        type: Math.random() < 0.5 ? 'WIDEN' : 'MULTIBALL',
        vy: CAPSULE_FALL_SPEED,
      }
    }

    return {
      ball: {
        ...ball,
        x: nextX,
        y: nextY,
        vx: axis === 'x' ? -vx : vx,
        vy: axis === 'y' ? -vy : vy,
      },
      bricks: nextBricks,
      scoreDelta: 1,
      capsule,
    }
  }

  if (nextY + ball.size >= BREAKOUT_HEIGHT) {
    return { ball: null, bricks, scoreDelta: 0, capsule: null }
  }

  return { ball: { ...ball, x: nextX, y: nextY, vx, vy }, bricks, scoreDelta: 0, capsule: null }
}

function paddleAtWidth(paddle: BreakoutPaddle, width: number): BreakoutPaddle {
  return { ...paddle, width, x: Math.min(paddle.x, BREAKOUT_WIDTH - width) }
}

export function advanceBreakoutGame(game: BreakoutGame, deltaSeconds: number): BreakoutGame {
  if (game.status === 'game-over') {
    // leveledUp/lifeLost are documented as true only on the tick the event
    // happened - returning `game` unchanged would leak a stale true forever
    // on a game object that already reported it on a prior tick.
    return { ...game, leveledUp: false, lifeLost: false }
  }

  const seconds = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds)) : 0

  let widenRemaining = Math.max(0, game.widenRemaining - seconds)
  // Ball/capsule collisions this tick resolve against the paddle's width as of
  // the start of the tick (correct causality: a capsule can't retroactively
  // widen the paddle that's about to catch it). The paddle actually returned
  // is recomputed from the post-catch widenRemaining (paddleAtWidth, below) so
  // a catch reads as instant rather than lagging a frame behind.
  const paddleForCollisions = paddleAtWidth(game.paddle, widenRemaining > 0 ? WIDE_PADDLE_WIDTH : PADDLE_WIDTH)

  let bricks = game.bricks
  let score = game.score
  let balls: BreakoutBall[] = []
  const newCapsules: Capsule[] = []

  for (const ball of game.balls) {
    const result = advanceBall(ball, paddleForCollisions, bricks, seconds)
    bricks = result.bricks
    score += result.scoreDelta
    if (result.ball) balls.push(result.ball)
    if (result.capsule) newCapsules.push(result.capsule)
  }

  const movedCapsules = [...game.capsules, ...newCapsules].map(c => ({ ...c, y: c.y + c.vy * seconds }))
  const remainingCapsules: Capsule[] = []
  for (const capsule of movedCapsules) {
    if (rectsOverlap(capsule, paddleForCollisions)) {
      if (capsule.type === 'WIDEN') {
        widenRemaining = WIDEN_DURATION_SECONDS
      } else {
        balls = applyMultiball(balls)
      }
      continue
    }
    if (capsule.y > BREAKOUT_HEIGHT) continue
    remainingCapsules.push(capsule)
  }

  let lives = game.lives
  let lifeLost = false
  if (balls.length === 0) {
    lives -= 1
    lifeLost = true
    if (lives > 0) {
      balls = [serveBall(game.level)]
      widenRemaining = 0
    }
  }

  let level = game.level
  let capsules = remainingCapsules
  let leveledUp = false
  // A tick can't both lose the last ball and clear the last brick: a ball
  // either hits a brick (returns non-null) or drops (returns null), never
  // both, so this is only ever reachable while still alive.
  const waveCleared = lives > 0 && bricks.every(b => b.hits <= 0)
  if (waveCleared) {
    score += LEVEL_CLEAR_BONUS * level
    level += 1
    bricks = buildBricks(level)
    balls = [serveBall(level)]
    capsules = []
    widenRemaining = 0
    leveledUp = true
  }

  return {
    paddle: paddleAtWidth(paddleForCollisions, widenRemaining > 0 ? WIDE_PADDLE_WIDTH : PADDLE_WIDTH),
    balls,
    bricks,
    capsules,
    score,
    status: lives <= 0 ? 'game-over' : 'playing',
    level,
    lives: Math.max(0, lives),
    widenRemaining,
    leveledUp,
    lifeLost,
  }
}
