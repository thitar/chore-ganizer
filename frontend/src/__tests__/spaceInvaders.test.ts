import {
  AUTO_FIRE_INTERVAL_SECONDS,
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
  enemyFireIntervalForLevel,
  enemyRowsForLevel,
  enemySpeedForLevel,
  enemyVolleyForLevel,
  fireShot,
  moveShip,
  type SpaceInvadersGame,
} from '../games/spaceInvaders'

describe('Space Invaders game engine', () => {
  it('creates a centered playing game at level 1 with a full enemy grid and fixed dimensions', () => {
    const game = createSpaceInvadersGame()

    expect(SPACE_INVADERS_WIDTH).toBe(800)
    expect(SPACE_INVADERS_HEIGHT).toBe(500)
    expect(SHIP_WIDTH).toBeGreaterThan(0)
    expect(SHIP_HEIGHT).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.level).toBe(1)
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
    // The enemy has already moved this tick by the time it's hit, so compare
    // against its post-move resting position rather than its pre-advance x.
    expect(next.lastKilled).toEqual({
      x: next.enemies[0].x,
      y: next.enemies[0].y,
      width: next.enemies[0].width,
      height: next.enemies[0].height,
    })
    expect(next.leveledUp).toBe(false)
  })

  it('reports no kill and no level-up on a frame where nothing happens', () => {
    const game = createSpaceInvadersGame()

    const next = advanceSpaceInvadersGame(game, 0.01)

    expect(next.lastKilled).toBeNull()
    expect(next.leveledUp).toBe(false)
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

  it('fires more enemy bullets per volley at higher levels', () => {
    const level7 = enemyVolleyForLevel(7)
    expect(level7).toBeGreaterThan(1)

    const game: SpaceInvadersGame = {
      ...createSpaceInvadersGame(),
      level: 7,
      fireElapsed: enemyFireIntervalForLevel(7) - 0.001,
    }

    const next = advanceSpaceInvadersGame(game, 0.01)

    expect(next.enemyBullets).toHaveLength(level7)
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

  it('reaches a terminal state within a bounded number of frames when the ship never moves', () => {
    let game = createSpaceInvadersGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = advanceSpaceInvadersGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.status).toBe('game-over')
  })

  describe('auto-fire', () => {
    it('fires automatically once the auto-fire interval elapses, without any explicit fire input', () => {
      const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), playerFireElapsed: AUTO_FIRE_INTERVAL_SECONDS - 0.001 }

      const next = advanceSpaceInvadersGame(game, 0.01)

      expect(next.playerBullet).not.toBeNull()
      expect(next.playerBullet!.vy).toBeLessThan(0)
    })

    it('does not auto-fire before the interval elapses', () => {
      const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), playerFireElapsed: 0 }

      const next = advanceSpaceInvadersGame(game, 0.01)

      expect(next.playerBullet).toBeNull()
    })

    it('does not auto-fire a second bullet while one is already active', () => {
      const game: SpaceInvadersGame = {
        ...createSpaceInvadersGame(),
        playerFireElapsed: AUTO_FIRE_INTERVAL_SECONDS + 1,
        playerBullet: { x: 100, y: 50, width: BULLET_WIDTH, height: BULLET_HEIGHT, vy: -480 },
      }

      const next = advanceSpaceInvadersGame(game, 0.01)

      expect(next.playerBullet!.y).toBeCloseTo(game.playerBullet!.y - 480 * 0.01, 5)
    })
  })

  describe('levels', () => {
    it('advances to the next level instead of ending the run when a wave is fully cleared', () => {
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

      expect(next.status).toBe('playing')
      expect(next.level).toBe(2)
      expect(next.score).toBe(32 + 10 * 1)
      expect(next.enemies.length).toBeGreaterThan(0)
      expect(next.enemies.every(e => e.alive)).toBe(true)
      expect(next.leveledUp).toBe(true)
      expect(next.lastKilled).not.toBeNull()
    })

    it('builds a harder wave (more rows) once past the row-increase threshold', () => {
      const game: SpaceInvadersGame = { ...createSpaceInvadersGame(), level: 3 }

      const rebuilt = createSpaceInvadersGame()
      expect(enemyRowsForLevel(1)).toBe(ENEMY_ROWS)
      expect(enemyRowsForLevel(3)).toBeGreaterThan(ENEMY_ROWS)
      expect(rebuilt.enemies).toHaveLength(ENEMY_ROWS * ENEMY_COLS)
      void game
    })

    it('caps row count, enemy speed, fire interval, and volley size at high levels', () => {
      expect(enemyRowsForLevel(100)).toBeLessThanOrEqual(6)
      expect(enemySpeedForLevel(100)).toBeLessThanOrEqual(enemySpeedForLevel(1) * 10)
      expect(enemyFireIntervalForLevel(100)).toBeGreaterThanOrEqual(0.5)
      expect(enemyVolleyForLevel(100)).toBeLessThanOrEqual(3)
    })

    it('increases enemy speed with level', () => {
      expect(enemySpeedForLevel(5)).toBeGreaterThan(enemySpeedForLevel(1))
    })

    it('decreases enemy fire interval with level', () => {
      expect(enemyFireIntervalForLevel(5)).toBeLessThan(enemyFireIntervalForLevel(1))
      expect(enemyFireIntervalForLevel(1)).toBe(ENEMY_FIRE_INTERVAL_SECONDS)
    })

    it('caps total enemy speed at the level cap even when a large wave is nearly wiped out', () => {
      // A high level's wave has more rows, so the within-wave per-kill speed bonus
      // (uncapped on its own) must not be allowed to push the total past
      // enemySpeedForLevel's own cap once most of a large wave is dead.
      const level = 20
      const rows = enemyRowsForLevel(level)
      const totalEnemies = rows * ENEMY_COLS
      const game: SpaceInvadersGame = {
        ...createSpaceInvadersGame(),
        level,
        enemies: Array.from({ length: totalEnemies }, (_, i) => ({
          x: 100 + i,
          y: 50,
          width: 10,
          height: 10,
          alive: i === 0,
        })),
      }

      const next = advanceSpaceInvadersGame(game, 1)

      const actualSpeed = Math.abs(next.enemies[0].x - game.enemies[0].x)
      expect(actualSpeed).toBeLessThanOrEqual(enemySpeedForLevel(level) + 1e-9)
    })
  })
})
