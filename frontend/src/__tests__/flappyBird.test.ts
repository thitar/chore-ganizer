import {
  BIRD_SIZE,
  BIRD_X,
  FLAPPY_BIRD_HEIGHT,
  FLAPPY_BIRD_WIDTH,
  MAX_DELTA_SECONDS,
  PIPE_GAP_HEIGHT,
  PIPE_SPAWN_INTERVAL_SECONDS,
  PIPE_WIDTH,
  advanceFlappyBirdGame,
  createFlappyBirdGame,
  flap,
  type FlappyBirdGame,
} from '../games/flappyBird'

describe('Flappy Bird game engine', () => {
  it('creates a centered playing game with a pre-spawned pipe and fixed dimensions', () => {
    const game = createFlappyBirdGame()

    expect(FLAPPY_BIRD_WIDTH).toBe(800)
    expect(FLAPPY_BIRD_HEIGHT).toBe(500)
    expect(BIRD_SIZE).toBeGreaterThan(0)
    expect(game.status).toBe('playing')
    expect(game.score).toBe(0)
    expect(game.bird.x).toBe(BIRD_X)
    expect(game.bird.y).toBe((FLAPPY_BIRD_HEIGHT - BIRD_SIZE) / 2)
    expect(game.bird.vy).toBe(0)
    expect(game.pipes).toHaveLength(1)
    expect(game.pipes[0].x).toBe(FLAPPY_BIRD_WIDTH)
    expect(game.pipes[0].width).toBe(PIPE_WIDTH)
    expect(game.pipes[0].gapHeight).toBe(PIPE_GAP_HEIGHT)
    expect(game.pipes[0].scored).toBe(false)
  })

  it('gives the bird an upward impulse on flap', () => {
    const game = createFlappyBirdGame()

    const next = flap(game)

    expect(next.bird.vy).toBeLessThan(0)
  })

  it('ignores a flap once the game is over', () => {
    const game: FlappyBirdGame = { ...createFlappyBirdGame(), status: 'game-over', bird: { ...createFlappyBirdGame().bird, vy: 42 } }

    const next = flap(game)

    expect(next.bird.vy).toBe(42)
    expect(next.status).toBe('game-over')
  })

  it('applies gravity to increase downward velocity and move the bird down', () => {
    const game = createFlappyBirdGame()

    const next = advanceFlappyBirdGame(game, 0.1)

    expect(next.bird.vy).toBeGreaterThan(game.bird.vy)
    expect(next.bird.y).toBeGreaterThan(game.bird.y)
  })

  it('caps the fall speed', () => {
    const game: FlappyBirdGame = { ...createFlappyBirdGame(), bird: { ...createFlappyBirdGame().bird, vy: 10_000 } }

    const next = advanceFlappyBirdGame(game, MAX_DELTA_SECONDS)

    expect(next.bird.vy).toBeLessThan(10_000)
  })

  it('ends the game when the bird falls past the ground', () => {
    const game: FlappyBirdGame = {
      ...createFlappyBirdGame(),
      bird: { ...createFlappyBirdGame().bird, y: FLAPPY_BIRD_HEIGHT - 1, vy: 1000 },
    }

    const next = advanceFlappyBirdGame(game, 0.05)

    expect(next.status).toBe('game-over')
  })

  it('ends the game when the bird rises above the ceiling', () => {
    const game: FlappyBirdGame = {
      ...createFlappyBirdGame(),
      bird: { ...createFlappyBirdGame().bird, y: 1, vy: -1000 },
    }

    const next = advanceFlappyBirdGame(game, 0.05)

    expect(next.status).toBe('game-over')
  })

  it('ends the game when the bird collides with a pipe', () => {
    const game = createFlappyBirdGame()
    const collidingPipe = { x: BIRD_X, width: PIPE_WIDTH, gapY: 0, gapHeight: 0, scored: false }
    const armed: FlappyBirdGame = { ...game, pipes: [collidingPipe] }

    const next = advanceFlappyBirdGame(armed, 0)

    expect(next.status).toBe('game-over')
  })

  it('does not collide while the bird is inside the gap', () => {
    const game = createFlappyBirdGame()
    const safePipe = {
      x: BIRD_X,
      width: PIPE_WIDTH,
      gapY: game.bird.y - 50,
      gapHeight: 150,
      scored: false,
    }
    const armed: FlappyBirdGame = { ...game, pipes: [safePipe] }

    const next = advanceFlappyBirdGame(armed, 0)

    expect(next.status).toBe('playing')
  })

  it('scores once a pipe passes behind the bird, and only once', () => {
    const game = createFlappyBirdGame()
    const passingPipe = {
      x: BIRD_X - PIPE_WIDTH - 1,
      width: PIPE_WIDTH,
      gapY: game.bird.y - 50,
      gapHeight: 150,
      scored: false,
    }
    const armed: FlappyBirdGame = { ...game, pipes: [passingPipe] }

    const next = advanceFlappyBirdGame(armed, 0)
    expect(next.score).toBe(1)
    expect(next.pipes[0].scored).toBe(true)

    const again = advanceFlappyBirdGame(next, 0)
    expect(again.score).toBe(1)
  })

  it('moves pipes leftward and despawns them once fully offscreen', () => {
    const game = createFlappyBirdGame()
    const offscreenSoon = { x: -PIPE_WIDTH + 1, width: PIPE_WIDTH, gapY: 100, gapHeight: 150, scored: true }
    const armed: FlappyBirdGame = { ...game, pipes: [offscreenSoon], spawnElapsed: 0 }

    const next = advanceFlappyBirdGame(armed, 0.05)

    expect(next.pipes.some(p => p.x === offscreenSoon.x)).toBe(false)
  })

  it('spawns a new pipe once the spawn interval elapses', () => {
    const game: FlappyBirdGame = {
      ...createFlappyBirdGame(),
      pipes: [],
      spawnElapsed: PIPE_SPAWN_INTERVAL_SECONDS - 0.001,
    }

    const next = advanceFlappyBirdGame(game, 0.01)

    expect(next.pipes).toHaveLength(1)
    expect(next.pipes[0].x).toBeLessThanOrEqual(FLAPPY_BIRD_WIDTH)
    expect(next.spawnElapsed).toBeLessThan(PIPE_SPAWN_INTERVAL_SECONDS)
  })

  it('does not spawn a pipe before the spawn interval elapses', () => {
    const game: FlappyBirdGame = { ...createFlappyBirdGame(), pipes: [], spawnElapsed: 0 }

    const next = advanceFlappyBirdGame(game, 0.01)

    expect(next.pipes).toEqual([])
  })

  it('does not advance a game-over game', () => {
    const game: FlappyBirdGame = { ...createFlappyBirdGame(), status: 'game-over', score: 3 }

    const next = advanceFlappyBirdGame(game, 0.05)

    expect(next).toBe(game)
  })

  it('clamps large frame deltas', () => {
    const game = createFlappyBirdGame()
    const next = advanceFlappyBirdGame(game, 10)
    const clamped = advanceFlappyBirdGame(game, MAX_DELTA_SECONDS)

    expect(next.bird.y).toBeCloseTo(clamped.bird.y, 5)
    expect(next.bird.vy).toBeCloseTo(clamped.bird.vy, 5)
  })

  it('reaches a terminal state within a bounded number of frames when the bird never flaps', () => {
    let game = createFlappyBirdGame()

    for (let frame = 0; frame < 20_000 && game.status === 'playing'; frame += 1) {
      game = advanceFlappyBirdGame(game, MAX_DELTA_SECONDS)
    }

    expect(game.status).toBe('game-over')
  })
})
