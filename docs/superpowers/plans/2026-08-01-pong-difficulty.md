# Pong Difficulty & Angle Mechanic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pong opponent genuinely challenging (real rallies, occasional misses instead of the player winning in 2 bounces) by adding rally-based ball speed ramping and a hit-position angle mechanic on both paddles, with the opponent aiming its returns instead of always centering the ball.

**Architecture:** All changes are confined to the pure game-logic module `frontend/src/games/pong.ts` — the `PongBall` type gains a `speed` field, paddle-bounce logic is unified into one angle-computing helper used by both the player-paddle and opponent-paddle collision branches of `advancePongGame`, and `moveOpponent` gains a per-incoming-ball randomized aim offset. No changes to `PongCanvas.tsx` rendering, backend, or scoring — verified that no other file imports the ball-speed/opponent-speed constants being replaced.

**Tech Stack:** TypeScript, Vitest (`frontend/src/__tests__/pong.test.ts`), no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-01-pong-difficulty-design.md`
- Confined to `frontend/src/games/pong.ts` (plus its test file); no backend, no scoring/leaderboard, no `PongCanvas.tsx` changes needed since it only imports `PADDLE_HEIGHT`, `PADDLE_WIDTH`, `PONG_HEIGHT`, `createPongGame`, `PongGame` — none of which change shape or name.
- Starting constants (tunable, confirm via manual playtest per Task 5): `OPPONENT_SPEED = 175`, `BASE_BALL_SPEED ≈ 316` (replaces `BALL_SPEED_X`/`BALL_SPEED_Y`), `RALLY_SPEEDUP = 1.04`, `MAX_BALL_SPEED = 1.6 * BASE_BALL_SPEED`, `MAX_ANGLE_RATIO = 0.75`, opponent aim offset range up to ±50% of paddle half-width, re-rolled once per incoming ball (not every frame).
- `APP_VERSION` must be bumped in both `backend/package.json` and `frontend/package.json` per `docs/OPERATIONS.md#version-bumps` — this is a behavior change (gameplay difficulty), not a docs-only change.

---

## Current State (for reference — do not re-derive)

`frontend/src/games/pong.ts` today (91 lines shown, full file is 204 lines):

```ts
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

export interface PongBall {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}
```

`moveOpponent` (pong.ts:83-91) chases `ball.x` exactly every frame:

```ts
function moveOpponent(paddle: PongPaddle, ball: PongBall, deltaSeconds: number): PongPaddle {
  const targetX = ball.x + ball.size / 2 - paddle.width / 2
  const maximumTravel = OPPONENT_SPEED * deltaSeconds
  const distance = targetX - paddle.x
  const movement = Math.max(-maximumTravel, Math.min(maximumTravel, distance))
  const x = Math.max(0, Math.min(PONG_WIDTH - paddle.width, paddle.x + movement))
  return { ...paddle, x }
}
```

`advancePongGame` (pong.ts:102-203) has two near-identical paddle-bounce branches (player at 138-150, opponent at 160-172) that only flip `vy`'s sign and leave `vx` untouched. Full current source was captured during brainstorming and is not repeated here in full — read the file directly before starting Task 1.

---

## Task 1: Ball gains a `speed` field, angle-computing helper replaces flat bounce logic

**Files:**
- Modify: `frontend/src/games/pong.ts`
- Test: `frontend/src/__tests__/pong.test.ts`

**Interfaces:**
- Produces: `PongBall.speed: number` (new field, magnitude of velocity vector, independent of `vx`/`vy` sign). `bounceOffPaddle(ball: PongBall, paddle: PongPaddle, direction: 1 | -1): { vx: number; vy: number }` — pure helper, `direction` is `1` for "send ball downward" (opponent hit) or `-1` for "send ball upward" (player hit). Consumed by Task 2 (opponent aiming) and Task 3 (rally speedup) — do not change this signature later without updating those tasks.
- Consumes: existing `PongPaddle`, `PongBall` types (only `PongBall` changes shape, gaining `speed`).

- [ ] **Step 1: Write the failing tests for angle-based bouncing**

Replace the two existing bounce tests (`bounces off the player paddle only while moving downward`, `bounces downward off the opponent paddle while moving upward`) in `frontend/src/__tests__/pong.test.ts` with angle-aware versions. Insert this block in place of both (lines 62-104 in the current file):

```ts
  it('bounces the ball straight up off a center-hit player paddle', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBeLessThan(0)
    expect(next.ball.vx).toBeCloseTo(0, 5)
  })

  it('does not bounce off the player paddle while moving upward', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const collisionBall = {
      ...game.ball,
      x: centerX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: -100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vy).toBe(-100)
  })

  it('angles the ball away from center when it hits the edge of the player paddle', () => {
    const game = createPongGame()
    const playerY = game.playerPaddle.y
    const edgeX = game.playerPaddle.x + PADDLE_WIDTH - BALL_SIZE
    const collisionBall = {
      ...game.ball,
      x: edgeX,
      y: playerY - BALL_SIZE - 1,
      vx: 0,
      vy: 100,
      speed: 100,
    }

    const next = advancePongGame({ ...game, ball: collisionBall }, 0.05)

    expect(next.ball.vx).toBeGreaterThan(0)
    expect(next.ball.vy).toBeLessThan(0)
    const magnitude = Math.sqrt(next.ball.vx ** 2 + next.ball.vy ** 2)
    expect(magnitude).toBeCloseTo(next.ball.speed, 5)
  })

  it('bounces downward off the opponent paddle while moving upward', () => {
    const game = createPongGame()
    const centerX = game.opponentPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const next = advancePongGame(
      {
        ...game,
        ball: {
          ...game.ball,
          x: centerX,
          y: game.opponentPaddle.y + game.opponentPaddle.height - 1,
          vx: 0,
          vy: -100,
          speed: 100,
        },
      },
      0.05,
    )

    expect(next.score).toBe(0)
    expect(next.ball.vy).toBeGreaterThan(0)
    expect(next.ball.y).toBe(game.opponentPaddle.y + game.opponentPaddle.height)
  })
```

Also update the top-of-file test (`creates a centered playing game with fixed dimensions`, lines 15-27) to assert the new field exists — add this line right after `expect(game.ball.y).toBe((PONG_HEIGHT - BALL_SIZE) / 2)` (line 26):

```ts
    expect(game.ball.speed).toBeGreaterThan(0)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: FAIL — `speed` is not a known property of `PongBall`, and/or angle assertions fail against the old flat-bounce logic.

- [ ] **Step 3: Implement `speed` field and `bounceOffPaddle` helper**

In `frontend/src/games/pong.ts`, replace the two speed constants (lines 10-11) with:

```ts
const BASE_BALL_SPEED = Math.sqrt(180 ** 2 + 260 ** 2)
const MAX_ANGLE_RATIO = 0.75
```

Add `speed: number` to the `PongBall` interface (after `size: number`):

```ts
export interface PongBall {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  size: number
}
```

In `createPongGame` (around line 52-58), set initial velocity from the base speed, straight up:

```ts
    ball: {
      x: (PONG_WIDTH - BALL_SIZE) / 2,
      y: (PONG_HEIGHT - BALL_SIZE) / 2,
      vx: 0,
      vy: BASE_BALL_SPEED,
      speed: BASE_BALL_SPEED,
      size: BALL_SIZE,
    },
```

Add the shared bounce helper right before `moveOpponent` (before line 83):

```ts
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
```

Replace the player-paddle bounce branch (`if (crossedPlayerPaddle) { ... }`, lines 138-150) with:

```ts
  if (crossedPlayerPaddle) {
    const { vx: bouncedVx, vy: bouncedVy } = bounceOffPaddle(
      { ...game.ball, x: nextX },
      game.playerPaddle,
      -1,
    )
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: game.playerPaddle.y - game.ball.size,
        vx: bouncedVx,
        vy: bouncedVy,
      },
    }
  }
```

Replace the opponent-paddle bounce branch (`if (hitOpponentPaddle) { ... }`, lines 160-172) with:

```ts
  if (hitOpponentPaddle) {
    const { vx: bouncedVx, vy: bouncedVy } = bounceOffPaddle(
      { ...game.ball, x: nextX },
      opponentPaddle,
      1,
    )
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: opponentPaddle.y + opponentPaddle.height,
        vx: bouncedVx,
        vy: bouncedVy,
      },
    }
  }
```

Update the two score-reset ball objects (in the "point scored" branch around line 179-185, and nowhere else — the game-over branch doesn't reset the ball) to carry `speed`:

```ts
      ball: {
        ...game.ball,
        x: (PONG_WIDTH - game.ball.size) / 2,
        y: (PONG_HEIGHT - game.ball.size) / 2,
        vx: 0,
        vy: BASE_BALL_SPEED,
        speed: BASE_BALL_SPEED,
      },
```

Note: `vx` on serve is `0` (straight down toward opponent... wait, check sign — serve direction must match existing convention: after a point is scored, ball re-serves and the existing code sets `vy: BALL_SPEED_Y` which is positive, i.e. moving toward the player. Keep that convention: `vy: BASE_BALL_SPEED` (positive).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: PASS for all tests modified/added so far. Some later tests (`allows a player tracking the ball to eventually score`, `clamps the simulation delta`) may still fail until Tasks 2-3 land — that's expected; only verify the tests targeted in this task pass. If `bounces the ball off the side wall` (untouched test, lines 45-60) now fails, check that wall-bounce logic (lines 120-126, untouched by this task) still compiles against the new `PongBall` shape — it should need no changes since it only reads/writes `vx`.

- [ ] **Step 5: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/games/pong.ts frontend/src/__tests__/pong.test.ts
git commit -m "feat: add hit-position ball angling to both Pong paddles"
```

---

## Task 2: Opponent aims instead of always centering the ball

**Files:**
- Modify: `frontend/src/games/pong.ts`
- Test: `frontend/src/__tests__/pong.test.ts`

**Interfaces:**
- Consumes: `PongPaddle`, `PongBall` (from Task 1), existing `moveOpponent(paddle, ball, deltaSeconds)` signature — signature stays the same, called from `advancePongGame` the same way.
- Produces: `moveOpponent` now varies its target x by a per-rally random offset instead of always centering. No new exports.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/pong.test.ts` (after the opponent-bounce test added in Task 1):

```ts
  it('opponent aim offset varies instead of always dead-centering the ball', () => {
    const game = createPongGame()
    const ball = { ...game.ball, x: 400, vx: 0, vy: -50, speed: 50 }

    const targets = new Set<number>()
    for (let seed = 0; seed < 20; seed += 1) {
      const moved = advancePongGame({ ...game, ball }, 0.001)
      targets.add(Math.round(moved.opponentPaddle.x * 100))
    }

    expect(targets.size).toBeGreaterThan(1)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts -t "opponent aim offset"`
Expected: FAIL — currently `moveOpponent` is deterministic, so all 20 runs produce the identical paddle x (`targets.size` will be `1`).

- [ ] **Step 3: Implement randomized opponent aim, re-rolled per incoming ball**

The aim offset must be re-rolled once per incoming ball (when the ball starts moving toward the opponent, i.e. right after leaving the player's paddle), not every frame — otherwise the paddle jitters. Track this via a module-level mutable variable keyed to ball direction changes, since `PongGame`/`PongBall` are otherwise pure data with no "rally id."

In `frontend/src/games/pong.ts`, add near the top (after the `MAX_ANGLE_RATIO` constant from Task 1):

```ts
const OPPONENT_AIM_RANGE = 0.5

let opponentAimOffset = 0
let lastBallDirection: 1 | -1 | 0 = 0
```

Replace `moveOpponent` (from Task 1's untouched version) with:

```ts
function moveOpponent(paddle: PongPaddle, ball: PongBall, deltaSeconds: number): PongPaddle {
  const direction: 1 | -1 = ball.vy < 0 ? -1 : 1
  if (direction !== lastBallDirection) {
    lastBallDirection = direction
    opponentAimOffset = (Math.random() * 2 - 1) * OPPONENT_AIM_RANGE * (paddle.width / 2)
  }

  const targetX = ball.x + ball.size / 2 - paddle.width / 2 + opponentAimOffset
  const maximumTravel = OPPONENT_SPEED * deltaSeconds
  const distance = targetX - paddle.x
  const movement = Math.max(-maximumTravel, Math.min(maximumTravel, distance))
  const x = Math.max(0, Math.min(PONG_WIDTH - paddle.width, paddle.x + movement))
  return { ...paddle, x }
}
```

`opponentAimOffset` is intentionally module-level (not part of `PongGame` state) — it's presentation-layer randomness for the opponent's targeting, not game state that needs to be serialized, replayed, or reset on score. This mirrors how `Math.random()`-driven behavior is scoped elsewhere in the codebase (check for precedent; if none exists, this is the first — acceptable since it's purely cosmetic AI variance, not gameplay-critical state).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: PASS for the new test and all Task 1 tests (module-level state doesn't affect them since they call `advancePongGame` once per test, and the offset re-rolling on direction change is deterministic in *when* it rolls, only *what value* it rolls is random).

- [ ] **Step 5: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/games/pong.ts frontend/src/__tests__/pong.test.ts
git commit -m "feat: opponent aims its Pong returns instead of always centering"
```

---

## Task 3: Rally-based ball speed ramp

**Files:**
- Modify: `frontend/src/games/pong.ts`
- Test: `frontend/src/__tests__/pong.test.ts`

**Interfaces:**
- Consumes: `bounceOffPaddle` (Task 1) — called with `ball.speed`, which this task now mutates on each bounce before calling it.
- Produces: `PongBall.speed` increases by `RALLY_SPEEDUP` on every paddle contact (player or opponent), capped at `MAX_BALL_SPEED`, reset to `BASE_BALL_SPEED` when a point is scored.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/__tests__/pong.test.ts`:

```ts
  it('ramps ball speed on each paddle return, capped, and resets on score', () => {
    const game = createPongGame()
    const centerX = game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2
    const startingSpeed = game.ball.speed

    const afterPlayerHit = advancePongGame(
      {
        ...game,
        ball: {
          ...game.ball,
          x: centerX,
          y: game.playerPaddle.y - BALL_SIZE - 1,
          vx: 0,
          vy: 100,
        },
      },
      0.05,
    )

    expect(afterPlayerHit.ball.speed).toBeGreaterThan(startingSpeed)

    let rallyGame = afterPlayerHit
    for (let i = 0; i < 50; i += 1) {
      rallyGame = {
        ...rallyGame,
        ball: {
          ...rallyGame.ball,
          x: game.opponentPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
          y: game.opponentPaddle.y + game.opponentPaddle.height - 1,
          vx: 0,
          vy: -100,
        },
      }
      rallyGame = advancePongGame(rallyGame, 0.05)
      rallyGame = {
        ...rallyGame,
        ball: {
          ...rallyGame.ball,
          x: game.playerPaddle.x + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
          y: game.playerPaddle.y - BALL_SIZE - 1,
          vx: 0,
          vy: 100,
        },
      }
      rallyGame = advancePongGame(rallyGame, 0.05)
    }

    expect(rallyGame.ball.speed).toBeLessThanOrEqual(1.6 * startingSpeed + 1e-6)

    const scored = advancePongGame(
      {
        ...rallyGame,
        ball: { ...rallyGame.ball, size: 20, y: 1, vx: 0, vy: -100 },
      },
      0.05,
    )

    expect(scored.ball.speed).toBeCloseTo(startingSpeed, 5)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts -t "ramps ball speed"`
Expected: FAIL — `afterPlayerHit.ball.speed` currently equals `startingSpeed` since nothing increments it yet.

- [ ] **Step 3: Implement the speed ramp**

In `frontend/src/games/pong.ts`, add the ramp constants next to `MAX_ANGLE_RATIO`:

```ts
const RALLY_SPEEDUP = 1.04
const MAX_BALL_SPEED = BASE_BALL_SPEED * 1.6
```

In both paddle-bounce branches (the ones written in Task 1), compute the ramped speed before calling `bounceOffPaddle` and store it on the returned ball. Update the player-paddle branch to:

```ts
  if (crossedPlayerPaddle) {
    const speed = Math.min(game.ball.speed * RALLY_SPEEDUP, MAX_BALL_SPEED)
    const { vx: bouncedVx, vy: bouncedVy } = bounceOffPaddle(
      { ...game.ball, x: nextX, speed },
      game.playerPaddle,
      -1,
    )
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: game.playerPaddle.y - game.ball.size,
        vx: bouncedVx,
        vy: bouncedVy,
        speed,
      },
    }
  }
```

And the opponent-paddle branch to:

```ts
  if (hitOpponentPaddle) {
    const speed = Math.min(game.ball.speed * RALLY_SPEEDUP, MAX_BALL_SPEED)
    const { vx: bouncedVx, vy: bouncedVy } = bounceOffPaddle(
      { ...game.ball, x: nextX, speed },
      opponentPaddle,
      1,
    )
    return {
      ...game,
      opponentPaddle,
      ball: {
        ...game.ball,
        x: nextX,
        y: opponentPaddle.y + opponentPaddle.height,
        vx: bouncedVx,
        vy: bouncedVy,
        speed,
      },
    }
  }
```

The score-reset branch already sets `speed: BASE_BALL_SPEED` (from Task 1) — no change needed there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: PASS for the new test. Also re-run the full suite — the pre-existing `allows a player tracking the ball to eventually score` test (line 139-148 in the original file) and `clamps the simulation delta to 0.05 seconds` test must still pass with the new physics.

If `allows a player tracking the ball to eventually score` times out (score stays 0 through all 20,000 frames) or `clamps the simulation delta` fails (unlikely — that test only checks determinism of `advancePongGame`, which still holds since `Math.random()` calls happen inside `advancePongGame` on each call — **note:** this makes the delta-clamp test's `toEqual` comparison of two separate `advancePongGame` calls non-deterministic if a direction-change/re-roll happens inside; check this specifically). If it fails, the fix is to make `moveOpponent`'s randomness reproducible per-call rather than relying on `Math.random()` timing — see Step 5.

- [ ] **Step 5: Fix determinism issue if the delta-clamp test fails**

If Step 4 shows `clamps the simulation delta to 0.05 seconds` failing (because `advancePongGame(game, 1)` and `advancePongGame(game, 0.05)` each independently trigger a `Math.random()` re-roll of `opponentAimOffset` and land on different random values), change the re-roll trigger so it only fires on an actual state transition already captured in `PongGame`, not on every call. Simplest fix: only re-roll when `lastBallDirection` was previously unset (`0`) or the ball's `vy` sign flips — since both calls in that test start from the exact same `game` object (same `lastBallDirection` module state going in), they'll both either roll or both skip rolling identically **only if `Math.random()` isn't called at all in a call that doesn't cross a direction boundary**. Verify this holds by running the test in isolation:

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts -t "clamps the simulation delta"`
Expected: PASS. If it still fails, the two calls in that test are both hitting a fresh direction (module state reset between test files, both calls are the first call), causing two independent `Math.random()` draws. In that case, change the test itself (not the implementation) to compare `opponentPaddle.x` from a single `advancePongGame` call's perspective by capturing `lastBallDirection` state — simplest robust fix is to reset randomness for this specific test by seeding: replace the test's assertion to only compare fields unaffected by the random draw, i.e. change:

```ts
    expect(advancePongGame(game, 1)).toEqual(advancePongGame(game, 0.05))
```

to:

```ts
    const long = advancePongGame(game, 1)
    const clamped = advancePongGame(game, 0.05)
    expect(long.ball).toEqual(clamped.ball)
    expect(long.score).toBe(clamped.score)
    expect(long.status).toBe(clamped.status)
    expect(long.playerPaddle).toEqual(clamped.playerPaddle)
```

This still proves the delta clamp works (ball/score/status/player-paddle are unaffected by opponent aim randomness) without asserting on the randomized `opponentPaddle.x`.

- [ ] **Step 6: Run full test suite once more**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 7: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/games/pong.ts frontend/src/__tests__/pong.test.ts
git commit -m "feat: ramp Pong ball speed each rally, reset on score"
```

---

## Task 4: Opponent base speed increase

**Files:**
- Modify: `frontend/src/games/pong.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure constant change.

- [ ] **Step 1: Change the constant**

In `frontend/src/games/pong.ts`, change:

```ts
const OPPONENT_SPEED = 120
```

to:

```ts
const OPPONENT_SPEED = 175
```

- [ ] **Step 2: Run the full test suite**

Run: `cd frontend && npx vitest run src/__tests__/pong.test.ts`
Expected: PASS. Pay particular attention to `allows a player tracking the ball to eventually score` — if it times out (opponent now never misses even against a perfectly-tracking, infinite-speed player), that indicates `OPPONENT_SPEED = 175` combined with the Task 3 speed cap is overtuned. If it fails, lower `OPPONENT_SPEED` in steps of 10-15 (try 160, then 145) and re-run until the test passes, then note the final chosen value for Task 5's manual playtest writeup.

- [ ] **Step 3: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/src/games/pong.ts
git commit -m "feat: increase Pong opponent paddle speed for real rallies"
```

---

## Task 5: Manual playtest, version bump, and final tuning pass

**Files:**
- Modify: `frontend/package.json` (version field)
- Modify: `backend/package.json` (version field)
- Modify: `frontend/src/games/pong.ts` (only if playtest reveals tuning is needed)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Determine version bump**

Read `docs/OPERATIONS.md#version-bumps` and `docs/VERSION_MAP.md` to confirm whether this is a patch or minor bump (gameplay behavior change, not a new feature surface — check current version in `frontend/package.json` first).

Run: `cat /home/thitar/dev/chore-ganizer/frontend/package.json | grep version`

- [ ] **Step 2: Bump version in both package.json files**

Edit the `"version"` field in `frontend/package.json` and `backend/package.json` to match (use the value determined in Step 1 — if uncertain whether patch or minor, ask the user before proceeding, per `AGENTS.md`: "If unsure what version to bump to, ask the user").

- [ ] **Step 3: Add a CHANGELOG entry**

Add an entry to `CHANGELOG.md` following the existing format in that file (check the top of the file for the most recent entry's structure before writing this one) describing: Pong opponent is harder to beat (faster paddle, ramping rally speed), and paddle hits now angle the ball based on where it's struck (both player and opponent).

- [ ] **Step 4: Start the dev server and playtest**

Run: `cd frontend && npm run dev` (and separately `cd backend && npm run dev` if not already running — check `docs/OPERATIONS.md#starting-the-app` for the exact two-terminal flow).

Open the app in a browser, unlock/navigate to the Pong game (per `docs/superpowers/specs/2026-07-30-games-rewards-design.md` — unlocked via the `ten-chores` badge; if not unlocked in your test account, check that spec or `games.service.ts` for a dev bypass), and play several rounds.

Confirm:
- You can win points, but not in 1-2 trivial bounces every time.
- Hitting the ball off-center visibly changes its angle.
- Long rallies visibly speed up.
- The opponent's returns aren't always dead-straight.

If the game feels off (too easy, too hard, angles feel unresponsive), adjust `OPPONENT_SPEED`, `RALLY_SPEEDUP`, `MAX_BALL_SPEED`, `MAX_ANGLE_RATIO`, or `OPPONENT_AIM_RANGE` in `frontend/src/games/pong.ts`, then re-run `cd frontend && npx vitest run src/__tests__/pong.test.ts` to confirm nothing broke, and playtest again.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS, no regressions outside `pong.test.ts`.

- [ ] **Step 6: Commit**

```bash
cd /home/thitar/dev/chore-ganizer
git add frontend/package.json backend/package.json CHANGELOG.md
git commit -m "chore: bump version for Pong difficulty rework"
```

If Step 4 required constant tuning, that was already committed inline in Task 4's pattern — commit those separately before this final commit:

```bash
git add frontend/src/games/pong.ts
git commit -m "fix: tune Pong difficulty constants after playtesting"
```

---

## Self-Review Notes

- **Spec coverage:** rally speed ramp (Task 3), hit-position angle on both paddles (Task 1), opponent aiming instead of centering (Task 2), opponent speed increase (Task 4), constants tunable (all tasks use named constants), manual playtest required (Task 5), version bump required (Task 5) — all spec sections have a task.
- **Type consistency:** `PongBall.speed` introduced in Task 1, consumed identically in Tasks 2-4. `bounceOffPaddle(ball, paddle, direction)` signature fixed in Task 1, used unchanged in Task 3. `moveOpponent(paddle, ball, deltaSeconds)` signature unchanged from the original, only its body changes (Task 2) — no caller in `advancePongGame` needs updating.
- **Known risk flagged explicitly:** the module-level `Math.random()` state in `moveOpponent` risks breaking the existing determinism test (`clamps the simulation delta to 0.05 seconds`) — Task 3 Step 5 provides the concrete fix if that happens, rather than leaving it as a vague "handle it" step.
