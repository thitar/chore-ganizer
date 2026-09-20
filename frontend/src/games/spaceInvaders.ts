export const SPACE_INVADERS_WIDTH = 800
export const SPACE_INVADERS_HEIGHT = 500
export const SHIP_WIDTH = 60
export const SHIP_HEIGHT = 20
export const MAX_DELTA_SECONDS = 0.05

export const ENEMY_ROWS = 4
export const ENEMY_COLS = 8
export const ENEMY_PADDING = 16
export const ENEMY_HEIGHT = 32
export const ENEMY_TOP_OFFSET = 50
export const ENEMY_FIRE_INTERVAL_SECONDS = 1.2
export const AUTO_FIRE_INTERVAL_SECONDS = 0.45

export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 16

const SHIP_BOTTOM_GAP = 24
const PLAYER_BULLET_SPEED = 480
const ENEMY_BULLET_SPEED = 220
const ENEMY_BASE_SPEED = 22
const ENEMY_SPEED_PER_KILL = 2
const ENEMY_DROP_DISTANCE = 12

const MAX_ENEMY_ROWS = 6
const ENEMY_LEVEL_SPEED_STEP = 4
const ENEMY_MAX_SPEED = 70
const ENEMY_MIN_FIRE_INTERVAL = 0.5
const ENEMY_FIRE_INTERVAL_STEP = 0.08
const ENEMY_MAX_VOLLEY = 3
const LEVEL_CLEAR_BONUS = 10

const ENEMY_WIDTH =
  (SPACE_INVADERS_WIDTH - ENEMY_PADDING * (ENEMY_COLS + 1)) / ENEMY_COLS

export type SpaceInvadersStatus = 'playing' | 'game-over'

export interface Ship {
  x: number
  y: number
  width: number
  height: number
}

export interface Bullet {
  x: number
  y: number
  width: number
  height: number
  vy: number
}

export interface Enemy {
  x: number
  y: number
  width: number
  height: number
  alive: boolean
}

export interface SpaceInvadersGame {
  ship: Ship
  playerBullet: Bullet | null
  enemies: Enemy[]
  enemyBullets: Bullet[]
  direction: 1 | -1
  score: number
  status: SpaceInvadersStatus
  /** Wave number, starting at 1. Clearing a wave advances this and spawns a harder one. */
  level: number
  /** Accumulated time since the last enemy volley, in seconds */
  fireElapsed: number
  /** Accumulated time since the last player auto-fire shot, in seconds */
  playerFireElapsed: number
  /** The enemy destroyed this tick (for a renderer's explosion effect), or null. Not persisted across ticks. */
  lastKilled: { x: number; y: number; width: number; height: number } | null
  /** True only on the tick a wave was just cleared and the next one spawned (for a renderer's flash effect). */
  leveledUp: boolean
}

export function enemyRowsForLevel(level: number): number {
  return Math.min(ENEMY_ROWS + Math.floor((level - 1) / 2), MAX_ENEMY_ROWS)
}

export function enemySpeedForLevel(level: number): number {
  return Math.min(ENEMY_BASE_SPEED + (level - 1) * ENEMY_LEVEL_SPEED_STEP, ENEMY_MAX_SPEED)
}

export function enemyFireIntervalForLevel(level: number): number {
  return Math.max(ENEMY_MIN_FIRE_INTERVAL, ENEMY_FIRE_INTERVAL_SECONDS - (level - 1) * ENEMY_FIRE_INTERVAL_STEP)
}

export function enemyVolleyForLevel(level: number): number {
  return Math.min(1 + Math.floor((level - 1) / 3), ENEMY_MAX_VOLLEY)
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function buildEnemies(level: number): Enemy[] {
  const rows = enemyRowsForLevel(level)
  const enemies: Enemy[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: ENEMY_PADDING + col * (ENEMY_WIDTH + ENEMY_PADDING),
        y: ENEMY_TOP_OFFSET + row * (ENEMY_HEIGHT + ENEMY_PADDING),
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        alive: true,
      })
    }
  }
  return enemies
}

function spawnPlayerBullet(ship: Ship): Bullet {
  return {
    x: ship.x + ship.width / 2 - BULLET_WIDTH / 2,
    y: ship.y - BULLET_HEIGHT,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    vy: -PLAYER_BULLET_SPEED,
  }
}

export function createSpaceInvadersGame(): SpaceInvadersGame {
  return {
    ship: {
      x: (SPACE_INVADERS_WIDTH - SHIP_WIDTH) / 2,
      y: SPACE_INVADERS_HEIGHT - SHIP_HEIGHT - SHIP_BOTTOM_GAP,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
    },
    playerBullet: null,
    enemies: buildEnemies(1),
    enemyBullets: [],
    direction: 1,
    score: 0,
    status: 'playing',
    level: 1,
    fireElapsed: 0,
    playerFireElapsed: 0,
    lastKilled: null,
    leveledUp: false,
  }
}

export function moveShip(game: SpaceInvadersGame, pointerX: number): SpaceInvadersGame {
  if (!Number.isFinite(pointerX)) {
    return { ...game, ship: { ...game.ship } }
  }

  const x = Math.max(0, Math.min(SPACE_INVADERS_WIDTH - SHIP_WIDTH, pointerX - SHIP_WIDTH / 2))

  return { ...game, ship: { ...game.ship, x } }
}

/** Manual fire, kept for direct testing. The canvas no longer calls this — see AUTO_FIRE_INTERVAL_SECONDS. */
export function fireShot(game: SpaceInvadersGame): SpaceInvadersGame {
  if (game.status === 'game-over' || game.playerBullet) {
    return { ...game, ship: { ...game.ship } }
  }

  return {
    ...game,
    playerBullet: spawnPlayerBullet(game.ship),
  }
}

function moveEnemies(
  enemies: Enemy[],
  direction: 1 | -1,
  seconds: number,
  level: number,
): { enemies: Enemy[]; direction: 1 | -1 } {
  const alive = enemies.filter(e => e.alive)
  if (alive.length === 0) return { enemies, direction }

  // Capped at the same ceiling as the level's base speed — otherwise the
  // within-wave per-kill bonus alone can exceed ENEMY_MAX_SPEED once a wave
  // is large enough (higher levels have more rows), reintroducing the
  // "accelerates out of control late in a wave" problem this cap exists to prevent.
  const speed = Math.min(
    enemySpeedForLevel(level) + (enemies.length - alive.length) * ENEMY_SPEED_PER_KILL,
    ENEMY_MAX_SPEED,
  )
  const delta = direction * speed * seconds
  const minX = Math.min(...alive.map(e => e.x))
  const maxX = Math.max(...alive.map(e => e.x + e.width))

  if (minX + delta <= 0 || maxX + delta >= SPACE_INVADERS_WIDTH) {
    return {
      enemies: enemies.map(e => ({ ...e, y: e.y + ENEMY_DROP_DISTANCE })),
      direction: direction === 1 ? -1 : 1,
    }
  }

  return {
    enemies: enemies.map(e => ({ ...e, x: e.x + delta })),
    direction,
  }
}

function pickShooters(alive: Enemy[], count: number): Enemy[] {
  if (count >= alive.length) return alive
  if (count === 1) return [alive[Math.floor(Math.random() * alive.length)]]

  const pool = [...alive]
  const shooters: Enemy[] = []
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length)
    shooters.push(pool[index])
    pool.splice(index, 1)
  }
  return shooters
}

export function advanceSpaceInvadersGame(game: SpaceInvadersGame, deltaSeconds: number): SpaceInvadersGame {
  if (game.status === 'game-over') {
    return game
  }

  const seconds = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds)) : 0

  const { enemies: movedEnemies, direction: movedDirection } = moveEnemies(game.enemies, game.direction, seconds, game.level)

  let playerBullet = game.playerBullet
  if (playerBullet) {
    const y = playerBullet.y + playerBullet.vy * seconds
    playerBullet = y + playerBullet.height < 0 ? null : { ...playerBullet, y }
  }

  let playerFireElapsed = game.playerFireElapsed + seconds
  if (!playerBullet && playerFireElapsed >= AUTO_FIRE_INTERVAL_SECONDS) {
    playerFireElapsed -= AUTO_FIRE_INTERVAL_SECONDS
    playerBullet = spawnPlayerBullet(game.ship)
  }

  let enemyBullets = game.enemyBullets
    .map(b => ({ ...b, y: b.y + b.vy * seconds }))
    .filter(b => b.y < SPACE_INVADERS_HEIGHT)

  let fireElapsed = game.fireElapsed + seconds
  const fireInterval = enemyFireIntervalForLevel(game.level)
  const aliveBeforeFire = movedEnemies.filter(e => e.alive)
  if (fireElapsed >= fireInterval && aliveBeforeFire.length > 0) {
    fireElapsed -= fireInterval
    const shooters = pickShooters(aliveBeforeFire, enemyVolleyForLevel(game.level))
    enemyBullets = [
      ...enemyBullets,
      ...shooters.map(shooter => ({
        x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
        y: shooter.y + shooter.height,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: ENEMY_BULLET_SPEED,
      })),
    ]
  }

  let enemies = movedEnemies
  let score = game.score
  let lastKilled: SpaceInvadersGame['lastKilled'] = null
  if (playerBullet) {
    const hitIndex = enemies.findIndex(e => e.alive && overlaps(playerBullet!, e))
    if (hitIndex !== -1) {
      const hit = enemies[hitIndex]
      lastKilled = { x: hit.x, y: hit.y, width: hit.width, height: hit.height }
      enemies = enemies.map((e, i) => (i === hitIndex ? { ...e, alive: false } : e))
      score += 1
      playerBullet = null
    }
  }

  const shipHit = enemyBullets.some(b => overlaps(b, game.ship))
  const enemiesReachedShip = enemies.some(e => e.alive && e.y + e.height >= game.ship.y)

  const base = {
    ship: { ...game.ship },
    playerBullet,
    enemyBullets,
    fireElapsed,
    playerFireElapsed,
    lastKilled,
  }

  if (shipHit || enemiesReachedShip) {
    return {
      ...base,
      enemies,
      direction: movedDirection,
      score,
      status: 'game-over',
      level: game.level,
      leveledUp: false,
    }
  }

  let level = game.level
  let direction = movedDirection
  const waveCleared = enemies.every(e => !e.alive)
  if (waveCleared) {
    score += LEVEL_CLEAR_BONUS * level
    level += 1
    enemies = buildEnemies(level)
    direction = 1
  }

  return {
    ...base,
    enemies,
    enemyBullets: waveCleared ? [] : base.enemyBullets,
    fireElapsed: waveCleared ? 0 : base.fireElapsed,
    direction,
    score,
    status: 'playing',
    level,
    leveledUp: waveCleared,
  }
}
