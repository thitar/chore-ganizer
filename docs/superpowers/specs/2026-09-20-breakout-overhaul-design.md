# Breakout Overhaul — Design

## Problem

Breakout (`frontend/src/games/breakout.ts` / `BreakoutCanvas.tsx`) works and looks fine today, but has no depth beyond one static board:

1. **No lives.** The instant a ball passes the paddle, `advanceBreakoutGame` sets `status: 'game-over'` (the `nextY + game.ball.size >= BREAKOUT_HEIGHT` branch) — one miss ends the run.
2. **No power-ups.** `PADDLE_WIDTH` is a fixed constant and there is exactly one `ball: BreakoutBall` — nothing like the original game's falling capsules (wider paddle, multiball) exists.
3. **No levels.** Clearing all 50 bricks sets `cleared: true` and ends the run (`status: 'game-over'`), the same dead-end pattern the Space Invaders overhaul (`docs/superpowers/specs/2026-09-20-space-invaders-overhaul-design.md`) already replaced with an infinite level ramp.
4. **Single ball only.** `BreakoutGame.ball` is a single object, not a collection — multiball requires an architecture change before it can exist at all.

Goal: add lives, levels, and two power-ups (wider paddle, multiball) — the "more rewarding" original-arcade features you asked for — while reusing the level-ramp pattern and (this time) the engine-reports-events lesson from the Space Invaders PR instead of re-deriving state transitions in the canvas.

## Design

### 1. Multi-ball architecture: `ball` → `balls: BreakoutBall[]`

`BreakoutGame.ball` becomes `balls: BreakoutBall[]` (starts with exactly one, from the existing serve logic). Each frame, every ball's movement/wall-bounce/paddle-bounce/brick-collision is resolved in a loop against the same shared `bricks` array, applied sequentially so two balls can't double-score the same brick in one frame (first ball to resolve a hit wins it). A ball that drops below the paddle line is removed from the array — it no longer ends the game by itself.

### 2. Lives system

New `lives: number`, starting at `STARTING_LIVES = 3` (per your call). When removing dropped balls leaves `balls.length === 0` — i.e. a life is lost only once every ball is gone, not on the first ball to drop — `lives -= 1`. If `lives > 0`, respawn one fresh ball (the existing serve position/angle logic) and keep playing; if `lives === 0`, `status: 'game-over'`. Losing a life does not touch the brick layout, score, or level — only balls and lives. Any active paddle-widen effect (see below) is cleared on a life lost, so every new ball starts from a clean paddle state.

### 3. Levels: infinite procedural ramp

New `level: number`, starting at 1 — same shape as Space Invaders. Clearing every brick (`bricks.every(b => b.hits <= 0)` — see the `Brick.hits` migration below) advances `level`, rebuilds a harder layout, respawns a single fresh ball, and awards a `LEVEL_CLEAR_BONUS × level` score bonus, instead of ending the run. Any in-flight capsules and the widen effect are cleared on level-up, same as on a life lost.

The existing `BreakoutGame.cleared` field and the `Cleared!` overlay branch in `BreakoutCanvas.tsx` (`game.status === 'game-over' && game.cleared`) are **removed**, not repurposed: `cleared` can no longer be reached now that clearing a board levels up instead of ending the run, so keeping it around would be a dead field gating a dead render branch. `BreakoutCanvas.test.tsx`'s "reports game-over once when the board is cleared" test is replaced by a level-up test, the same swap the Space Invaders PR made to its equivalent test.

First-pass ramp formulas (constants tunable after playtest, same convention as the Space Invaders and Pong difficulty docs):

| Parameter | Formula | Effect |
|---|---|---|
| Brick rows | `min(BRICK_ROWS + floor((level-1)/2), MAX_BRICK_ROWS)` | +1 row every 2 levels, capped so the layout never crowds the paddle |
| Tough bricks (2-hit) | From `level ≥ TOUGH_BRICK_LEVEL` (e.g. 3), a random fraction of bricks require 2 hits | Real depth-add, not just repetition — `Brick.alive: boolean` becomes `Brick.hits: number`, destroyed at `hits ≤ 0`. Every `.alive`/`!brick.alive` reference in `breakout.ts` and `BreakoutCanvas.tsx` (the level-clear predicate, the paddle/brick collision checks, and the canvas's `if (!brick.alive) continue` render skip) moves to the `hits <= 0` / `hits > 0` equivalent |
| Ball base speed | `ballBaseSpeedForLevel(level)`, capped like `enemySpeedForLevel` | Sets each serve's starting speed; existing per-rally `RALLY_SPEEDUP`/`MAX_BALL_SPEED` still applies on top, still capped |

### 4. Power-ups: falling capsules

When a brick is fully destroyed (its last hit), a random chance (`POWERUP_DROP_CHANCE`, first-pass 0.15) spawns a falling `Capsule: { x, y, type: 'WIDEN' | 'MULTIBALL', vy }` at the brick's position, falling straight down at `CAPSULE_FALL_SPEED`. The paddle catching one (AABB overlap) applies its effect and removes it; one that passes below the paddle is just discarded, no penalty.

- **WIDEN** — paddle width becomes `WIDE_PADDLE_WIDTH` (first-pass 1.6× `PADDLE_WIDTH`) for `WIDEN_DURATION_SECONDS` (first-pass 8s), tracked as a countdown `widenRemaining: number`. Catching another WIDEN capsule refreshes the timer rather than stacking; it reverts to normal width at 0, and is force-cleared on a life lost or level-up (see above). `movePaddle`'s clamp/centering math (`Math.max(0, Math.min(BREAKOUT_WIDTH - PADDLE_WIDTH, pointerX - PADDLE_WIDTH / 2))`, `breakout.ts:111`) hardcodes the `PADDLE_WIDTH` constant — it must switch to reading the paddle's *current* width (`game.paddle.width`) for both the clamp bound and the centering offset, or a widened paddle draws off the right edge of the field and centers off the pointer. This is a required part of the WIDEN implementation, not a side effect to discover later.
- **MULTIBALL** — every ball currently in play is cloned into 2 extra balls at its own position with a slightly different launch angle (reusing the existing paddle-bounce angle math), capped at `MAX_BALLS` (first-pass 6) total. If catching one would exceed the cap, only as many clones as fit are created (oldest balls cloned first); catching one at the cap does nothing.

### 5. Rendering (`BreakoutCanvas.tsx`)

- Draw every ball in `balls` (was a single `fillRect`, now a loop) — no new sprite work requested for Breakout's existing look, which you called "nice."
- Draw falling capsules distinctly per type (a small colored rounded rect with a letter — cyan "W", amber "M" — kept simple, consistent with the rest of the canvas's flat-shape style rather than a full pixel-art pass).
- Give a tough (`hits > 1`) brick a visibly different color/state than a normal one (e.g. a darker or cracked-looking fill that lightens on its first hit), distinct from the current single flat `#38bdf8` for every brick — without this, a tough brick's first hit produces no visible change at all, which reads to the player as a missed collision rather than a tougher brick.
- Show `lives` (a small pip/heart row) and `level` next to the existing score, mirroring Space Invaders' `LVL N` label.
- A brief "Level up!" flash on wave clear and an "Extra life used"-style cue on a life lost — both **read directly off engine-returned fields** (`leveledUp: boolean`, `lifeLost: boolean`, mirroring `lastKilled`/`leveledUp` from the Space Invaders engine) rather than the canvas diffing frames to infer them. This applies the lesson from that PR's code review directly instead of reintroducing the same bug class (the Space Invaders canvas originally missed exactly this kind of event by diffing, and could show stale flashes after a restart).

## Constants summary (all in `frontend/src/games/breakout.ts`, all tunable)

| Constant | Value |
|---|---|
| `STARTING_LIVES` | 3 |
| `MAX_BRICK_ROWS` | (first-pass) 8 |
| `TOUGH_BRICK_LEVEL` | 3 |
| `POWERUP_DROP_CHANCE` | 0.15 |
| `CAPSULE_FALL_SPEED` | (first-pass) 120 px/s |
| `WIDE_PADDLE_WIDTH` | 1.6 × `PADDLE_WIDTH` |
| `WIDEN_DURATION_SECONDS` | 8 |
| `MAX_BALLS` | 6 |
| `LEVEL_CLEAR_BONUS` | 10 × level (same shape as Space Invaders) |

## Scope boundary

Confined to `frontend/src/games/breakout.ts` (engine), `frontend/src/games/BreakoutCanvas.tsx` (rendering/input), and a possible one-line `registry.ts` instructions tweak if the current text ("Break all the bricks to clear the board") reads oddly once clearing no longer ends the game. No changes to `GamesPage.tsx` (its canvas-padding fix already shipped in the Space Invaders PR and applies to every game) or to Space Invaders/Flappy Bird.

## Testing

- `frontend/src/__tests__/breakout.test.ts` (247 lines today) needs substantial rework: every test currently asserting `game.ball` needs to move to `game.balls[0]`; new coverage for lives (life lost only when all balls are gone, respawn, game-over at 0 lives), levels (clear → level up, not game-over; ramp formulas), tough bricks (2-hit destruction), capsule spawn/catch/expiry for both power-up types, and the `MAX_BALLS` cap on repeated multiball catches.
- `frontend/src/__tests__/BreakoutCanvas.test.tsx` (132 lines today): its one exact-`fillRect`-args assertion is the **paddle** (`fillRect(540, BREAKOUT_HEIGHT - PADDLE_HEIGHT - 24, PADDLE_WIDTH, PADDLE_HEIGHT)`, lines 83-88), not the ball — nothing there currently asserts the ball's draw call. That paddle assertion stays valid only while the paddle is unwidened (a widened paddle changes the third argument); genuinely new coverage needed is: the "reports game-over once when the board is cleared" test replaced with a level-up test (per the `cleared` removal above), the level-up/life-lost flash reading directly off engine fields, and rendering multiple balls from the `balls` array instead of one.
- Manual playtest in a real browser (per project convention for gameplay/UI changes) to tune the first-pass constants above, particularly `POWERUP_DROP_CHANCE` (how often capsules should feel available) and the difficulty ramp across the first 5-10 levels.

## Non-goals

- No keyboard controls (mouse/touch drag remains the only paddle input, unchanged).
- No new power-up types beyond WIDEN and MULTIBALL (not requested).
- No sound.
- No changes to Space Invaders or Flappy Bird (separate PRs, separate specs).
