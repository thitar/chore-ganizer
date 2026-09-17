import {
  BULLET_HEIGHT,
  BULLET_WIDTH,
  ENEMY_COLS,
  ENEMY_FIRE_INTERVAL_SECONDS,
  ENEMY_ROWS,
  MAX_DELTA_SECONDS,
  SHIP_HEIGHT,
  SHIP_WIDTH,
  SPACE_INVADERS_HEIGHT,
  SPACE_INVADERS_WIDTH,
  advanceSpaceInvadersGame,
  createSpaceInvadersGame,
  fireShot,
  moveShip,
  type SpaceInvadersGame,
} from '../games/spaceInvaders'

describe('Space Invaders game engine', () => {
  it('creates a centered playing game with a full enemy grid and fixed dimensions', () => {
    const game = createSpaceInvadersGame()

    expect(SPACE_INVADERS_WIDTH).toBe(800)
    expect(SPACE_INVADERS_HEIGHT).toBe(500)
    expect(SHIP_WIDTH).toBeGreaterThan(0)
    expect(SHIP_HEIGHT).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.cleared).toBe(false)
    expect(game.score).toBe(0)
    expect(game.playerBullet).toBeNull()
    expect(game.enemyBullets).toEqual([])
    expect(game.enemies).toHaveLength(ENEMY_ROWS * ENEMY_COLS)
    expect(game.enemies.every(e => e.alive)).toBe(true)
    expect(game.ship.x).toBe((SPACE_INVADERS_WIDTH - SHIP_WIDTH) / 2)
  })

  it('clamps the ship to the horizontal playfield', () => {
    const game = createSpaceInvadersGame()

    const left = moveShip(game, -100)
    const right = moveShip(game, SPACE_INVADERS_WIDTH + 100)

    expect(left.ship.x).toBe(0)
    expect(right.ship.x).toBe(SPACE_INVADERS_WIDTH - SHIP_WIDTH)
    expect(game.ship.x).toBe((SPACE_INVADERS_WIDTH - SHIP_WIDTH) / 2)

    const nonFinite = moveShip(game, Number.NaN)
    expect(nonFinite.ship.x).toBe(game.ship.x)
  })

  it('fires a player bullet from the ship when none is active', () => {
    const game = createSpaceInvadersGame()

    const next = fireShot(game)

    expect(next.playerBullet).not.toBeNull()
    expect(next.playerBullet!.vy).toBeLessThan(0)
    expect(next.playerBullet!.x).toBeCloseTo(game.ship.x + SHIP_WIDTH / 2 - BULLET_WIDTH / 2, 5)
  })

  it('ignores a fire request while a player bullet is already active', () => {
    const game = fireShot(createSpaceInvadersGame())

    const next = fireShot(game)

    expect(next.playerBullet).toBe(game.playerBullet)
  })

  it('ignores a fire request once the game is over', () => {
    const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), status: 'game-over' }

    const next = fireShot(game)

    expect(next.playerBullet).toBeNull()
  })

  it('moves the player bullet upward and despawns it above the field', () => {
    const game: SpaceInvadersGame = {
      ...createSpaceInvadersGame(),
      playerBullet: { x: 100, y: 1, width: BULLET_WIDTH, height: BULLET_HEIGHT, vy: -1000 },
    }

    const next = advanceSpaceInvadersGame(game, 0.05)

    expect(next.playerBullet).toBeNull()
  })

  it('destroys an enemy on bullet impact, clears the bullet, and increments the score', () => {
    const game = createSpaceInvadersGame()
    const target = game.enemies[0]
    const armed: SpaceInvadersGame = {
      ...game,
      playerBullet: {
        x: target.x + target.width / 2 - BULLET_WIDTH / 2,
        y: target.y + target.height - 1,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: -1,
      },
    }

    const next = advanceSpaceInvadersGame(armed, 0.001)

    expect(next.score).toBe(1)
    expect(next.enemies[0].alive).toBe(false)
    expect(next.playerBullet).toBeNull()
    expect(next.status).toBe('playing')
  })

  it('ends the game when an enemy bullet hits the ship', () => {
    const game = createSpaceInvadersGame()
    const hit: SpaceInvadersGame = {
      ...game,
      enemyBullets: [
        { x: game.ship.x + 1, y: game.ship.y + 1, width: BULLET_WIDTH, height: BULLET_HEIGHT, vy: 0 },
      ],
    }

    const next = advanceSpaceInvadersGame(hit, 0.001)

    expect(next.status).toBe('game-over')
    expect(next.cleared).toBe(false)
  })

  it('removes an enemy bullet once it passes below the field', () => {
    const game = createSpaceInvadersGame()
    const passed: SpaceInvadersGame = {
      ...game,
      enemyBullets: [
        { x: 10, y: SPACE_INVADERS_HEIGHT - 1, width: BULLET_WIDTH, height: BULLET_HEIGHT, vy: 1000 },
      ],
    }

    const next = advanceSpaceInvadersGame(passed, 0.05)

    expect(next.enemyBullets).toEqual([])
  })

  it('ends the game when an enemy reaches the ship line', () => {
    const game = createSpaceInvadersGame()
    const advancing: SpaceInvadersGame = {
      ...game,
      enemies: game.enemies.map((e, i) => (i === 0 ? { ...e, y: game.ship.y - 1 } : { ...e, alive: false })),
    }

    const next = advanceSpaceInvadersGame(advancing, 0.001)

    expect(next.status).toBe('game-over')
    expect(next.cleared).toBe(false)
  })

  it('clears the board and ends the game once every enemy is destroyed', () => {
    const game = createSpaceInvadersGame()
    const lastAlive = game.enemies[game.enemies.length - 1]
    const armed: SpaceInvadersGame = {
      ...game,
      score: 31,
      enemies: game.enemies.map((e, i) => (i === game.enemies.length - 1 ? e : { ...e, alive: false })),
      playerBullet: {
        x: lastAlive.x + lastAlive.width / 2 - BULLET_WIDTH / 2,
        y: lastAlive.y + lastAlive.height - 1,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        vy: -1,
      },
    }

    const next = advanceSpaceInvadersGame(armed, 0.001)

    expect(next.score).toBe(32)
    expect(next.status).toBe('game-over')
    expect(next.cleared).toBe(true)
    expect(next.enemies.every(e => !e.alive)).toBe(true)
  })

  it('reverses direction and drops the formation when it reaches the horizontal edge', () => {
    const game = createSpaceInvadersGame()
    const rightmost = Math.max(...game.enemies.map(e => e.x + e.width))
    const pushedRight: SpaceInvadersGame = {
      ...game,
      direction: 1,
      enemies: game.enemies.map(e => ({ ...e, x: e.x + (SPACE_INVADERS_WIDTH - rightmost) - 1 })),
    }

    const next = advanceSpaceInvadersGame(pushedRight, 1)

    expect(next.direction).toBe(-1)
    expect(next.enemies[0].y).toBeGreaterThan(pushedRight.enemies[0].y)
    expect(next.enemies[0].x).toBe(pushedRight.enemies[0].x)
  })

  it('speeds up horizontal movement as fewer enemies remain', () => {
    const full = createSpaceInvadersGame()
    const sparse: SpaceInvadersGame = {
      ...full,
      enemies: full.enemies.map((e, i) => (i === 0 ? e : { ...e, alive: false })),
    }

    const nextFull = advanceSpaceInvadersGame(full, 0.05)
    const nextSparse = advanceSpaceInvadersGame(sparse, 0.05)

    const fullDelta = Math.abs(nextFull.enemies[0].x - full.enemies[0].x)
    const sparseDelta = Math.abs(nextSparse.enemies[0].x - sparse.enemies[0].x)

    expect(sparseDelta).toBeGreaterThan(fullDelta)
  })

  it('fires an enemy bullet once the fire interval elapses', () => {
    const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), fireElapsed: ENEMY_FIRE_INTERVAL_SECONDS - 0.001 }

    const next = advanceSpaceInvadersGame(game, 0.01)

    expect(next.enemyBullets).toHaveLength(1)
    expect(next.enemyBullets[0].vy).toBeGreaterThan(0)
    expect(next.fireElapsed).toBeLessThan(ENEMY_FIRE_INTERVAL_SECONDS)
  })

  it('does not fire an enemy bullet before the fire interval elapses', () => {
    const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), fireElapsed: 0 }

    const next = advanceSpaceInvadersGame(game, 0.01)

    expect(next.enemyBullets).toEqual([])
  })

  it('does not advance a game-over game', () => {
    const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), status: 'game-over', score: 5 }

    const next = advanceSpaceInvadersGame(game, 0.05)

    expect(next.status).toBe('game-over')
    expect(next.score).toBe(5)
    expect(next.ship).toEqual(game.ship)
  })

  it('clamps large frame deltas', () => {
    const game = createSpaceInvadersGame()
    const next = advanceSpaceInvadersGame(game, 10)
    const clamped = advanceSpaceInvadersGame(game, MAX_DELTA_SECONDS)

    expect(next.enemies[0].x).toBeCloseTo(clamped.enemies[0].x, 5)
    expect(next.enemies[0].y).toBeCloseTo(clamped.enemies[0].y, 5)
  })

  it('reaches a terminal state within a bounded number of frames when the ship never moves or fires', () => {
    let game = createSpaceInvadersGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = advanceSpaceInvadersGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.status).toBe('game-over')
  })
})
