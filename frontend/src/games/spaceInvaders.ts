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

export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 16

const SHIP_BOTTOM_GAP = 24
const PLAYER_BULLET_SPEED = 480
const ENEMY_BULLET_SPEED = 220
const ENEMY_BASE_SPEED = 30
const ENEMY_SPEED_PER_KILL = 4
const ENEMY_DROP_DISTANCE = 20

const ENEMY_WIDTH =
  (SPACE_INVADERS_WIDTH - ENEMY_PADDING * (ENEMY_COLS + 1)) / ENEMY_COLS
const TOTAL_ENEMIES = ENEMY_ROWS * ENEMY_COLS

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
  cleared: boolean
  /** Accumulated time since the last enemy shot, in seconds */
  fireElapsed: number
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function buildEnemies(): Enemy[] {
  const enemies: Enemy[] = []
  for (let row = 0; row < ENEMY_ROWS; row++) {
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

export function createSpaceInvadersGame(): SpaceInvadersGame {
  return {
    ship: {
      x: (SPACE_INVADERS_WIDTH - SHIP_WIDTH) / 2,
      y: SPACE_INVADERS_HEIGHT - SHIP_HEIGHT - SHIP_BOTTOM_GAP,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
    },
    playerBullet: null,
    enemies: buildEnemies(),
    enemyBullets: [],
    direction: 1,
    score: 0,
    status: 'playing',
    cleared: false,
    fireElapsed: 0,
  }
}

export function moveShip(game: SpaceInvadersGame, pointerX: number): SpaceInvadersGame {
  if (!Number.isFinite(pointerX)) {
    return { ...game, ship: { ...game.ship } }
  }

  const x = Math.max(0, Math.min(SPACE_INVADERS_WIDTH - SHIP_WIDTH, pointerX - SHIP_WIDTH / 2))

  return { ...game, ship: { ...game.ship, x } }
}

export function fireShot(game: SpaceInvadersGame): SpaceInvadersGame {
  if (game.status === 'game-over' || game.playerBullet) {
    return { ...game, ship: { ...game.ship } }
  }

  return {
    ...game,
    playerBullet: {
      x: game.ship.x + game.ship.width / 2 - BULLET_WIDTH / 2,
      y: game.ship.y - BULLET_HEIGHT,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      vy: -PLAYER_BULLET_SPEED,
    },
  }
}

function moveEnemies(
  enemies: Enemy[],
  direction: 1 | -1,
  seconds: number,
): { enemies: Enemy[]; direction: 1 | -1 } {
  const alive = enemies.filter(e => e.alive)
  if (alive.length === 0) return { enemies, direction }

  const speed = ENEMY_BASE_SPEED + (TOTAL_ENEMIES - alive.length) * ENEMY_SPEED_PER_KILL
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

export function advanceSpaceInvadersGame(game: SpaceInvadersGame, deltaSeconds: number): SpaceInvadersGame {
  if (game.status === 'game-over') {
    return game
  }

  const seconds = Number.isFinite(deltaSeconds) ? Math.max(0, Math.min(MAX_DELTA_SECONDS, deltaSeconds)) : 0

  const { enemies: movedEnemies, direction } = moveEnemies(game.enemies, game.direction, seconds)

  let playerBullet = game.playerBullet
  if (playerBullet) {
    const y = playerBullet.y + playerBullet.vy * seconds
    playerBullet = y + playerBullet.height < 0 ? null : { ...playerBullet, y }
  }

  let enemyBullets = game.enemyBullets
    .map(b => ({ ...b, y: b.y + b.vy * seconds }))
    .filter(b => b.y < SPACE_INVADERS_HEIGHT)

  let fireElapsed = game.fireElapsed + seconds
  const aliveEnemies = movedEnemies.filter(e => e.alive)
  if (fireElapsed >= ENEMY_FIRE_INTERVAL_SECONDS && aliveEnemies.length > 0) {
    fireElapsed -= ENEMY_FIRE_INTERVAL_SECONDS
    const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]
    enemyBullets = [
      ...enemyBullets,
      {
        x: shooter.x + shooter.width / 2 - BULLET_WIDTH / 2,
        y: shooter.y + shooter.height,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: ENEMY_BULLET_SPEED,
      },
    ]
  }

  let enemies = movedEnemies
  let score = game.score
  if (playerBullet) {
    const hitIndex = enemies.findIndex(e => e.alive && overlaps(playerBullet!, e))
    if (hitIndex !== -1) {
      enemies = enemies.map((e, i) => (i === hitIndex ? { ...e, alive: false } : e))
      score += 1
      playerBullet = null
    }
  }

  const shipHit = enemyBullets.some(b => overlaps(b, game.ship))
  const enemiesReachedShip = enemies.some(e => e.alive && e.y + e.height >= game.ship.y)
  const cleared = enemies.every(e => !e.alive)

  return {
    ship: { ...game.ship },
    playerBullet,
    enemies,
    enemyBullets,
    direction,
    score,
    status: shipHit || enemiesReachedShip || cleared ? 'game-over' : 'playing',
    cleared,
    fireElapsed,
  }
}
