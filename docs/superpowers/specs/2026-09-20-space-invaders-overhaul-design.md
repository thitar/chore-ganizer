# Space Invaders Overhaul — Design

## Problem

Four distinct issues in `frontend/src/games/spaceInvaders.ts` / `SpaceInvadersCanvas.tsx` / `GamesPage.tsx`:

1. **Unplayable on mobile.** Firing requires a tap gesture on the same pointer used for drag-to-move (`SpaceInvadersCanvas.tsx`'s tap-vs-drag disambiguation) — structurally impossible to steer and shoot at once on a touchscreen.
2. **Play area is too small on mobile.** Stacked padding (`AppShell`'s `px-4` + `GameCard`'s `p-6` around the canvas in `GamesPage.tsx`) shrinks the canvas substantially on phone screens, compounding #1 by making drag precision worse.
3. **Difficulty curve feels out of control.** `ENEMY_SPEED_PER_KILL` (horizontal speed) and `ENEMY_DROP_DISTANCE` (drop-per-wall-bounce) compound as enemies die: survivors speed up, bounce off the walls far more often, and the formation appears to accelerate downward uncontrollably late in a wave.
4. **Visuals are flat rectangles.** No sprite detail on enemies, ship, bullets, or background — feels cheap for something meant to be a reward.

Goal: fix mobile playability, make the difficulty curve feel fair rather than chaotic, add real replay depth via levels, and make the game look and feel like an actual arcade reward rather than a placeholder.

## Design

### 1. Auto-fire, uniformly (desktop and mobile)

Manual firing is removed entirely. `advanceSpaceInvadersGame` gains a `playerFireElapsed` counter (mirrors the existing enemy-fire cadence) and fires automatically whenever no player bullet is currently active and `AUTO_FIRE_INTERVAL_SECONDS` (starting value: `0.45`) has elapsed since the last shot.

- `fireShot` stays exported for direct testing, but `SpaceInvadersCanvas.tsx` no longer calls it from pointer/touch handlers.
- This deletes the tap-vs-drag gesture-tracking code in the canvas component (the `gestureRef`/`touchGestureRef` tracking and the `TAP_MAX_DISTANCE_PX` constant), which existed solely to disambiguate tap-fire from drag-move. The canvas keeps only drag-anywhere-to-move.
- Auto-fire alone would make the game trivially easy (see §3 for how difficulty compensates).

### 2. Bigger play area on mobile

In `GamesPage.tsx`, the `GameCard` currently wraps instructions, best-score text, the canvas, and the post-game score panel in one `space-y-4 p-6` div. Split it: instructions/best-score text keep `p-6`-equivalent padding, but the canvas (and the score-result panel below it) move into their own wrapper with `px-2 sm:px-6` horizontal padding instead of a flat `p-6`. This recovers roughly 64px of width on a typical phone viewport.

Scoped to `GamesPage.tsx` only — `AppShell`'s global page padding (`px-4`, used by every page in the app) is untouched, since changing it would affect layout app-wide for a games-only problem. This layout fix is shared by all five games in `GAME_REGISTRY`, not just Space Invaders, so the other two arcade PRs (Breakout, Flappy Bird) don't need to repeat it.

### 3. Levels replace "cleared = game over"

Today, clearing all 32 enemies sets `cleared: true` and ends the run (`status: 'game-over'`). This changes: **clearing a wave advances to the next level and spawns a harder wave immediately.** The run now only ends when an enemy bullet hits the ship or an enemy reaches the ship's row — matching the original arcade game's behavior, and giving the game actual depth instead of stopping after one wave.

`SpaceInvadersGame` gains `level: number` (starts at `1`). The `cleared` field is removed — it no longer has a terminal meaning since clearing a wave no longer ends the game.

Each new wave's parameters are derived from `level`:

| Parameter | Formula | Effect |
|---|---|---|
| Enemy rows | `min(4 + floor((level-1)/2), 6)` | +1 row every 2 levels, caps at 6 (`ENEMY_COLS` stays 8) |
| Horizontal speed (`ENEMY_BASE_SPEED` equivalent) | `22 + (level-1) * 4`, capped at `ENEMY_MAX_SPEED` (e.g. `70`) | Enemies sweep faster each level |
| Enemy fire interval | `max(0.5, 1.2 - (level-1) * 0.08)` | Enemies shoot more often as levels climb |
| Simultaneous shooters per volley | `min(1 + floor((level-1)/3), 3)` | Bullet density ramps up — multiple enemies can fire in the same volley instead of always exactly one |

This is specifically what offsets auto-fire: shooting stops being the bottleneck, but dodging a thickening bullet curtain from a faster, bigger wave becomes the real skill test, and difficulty keeps escalating indefinitely instead of capping out after one wave.

A level-clear bonus (`+10 × level`) is added to `score` on top of the existing `+1` per kill, when a wave is fully cleared, so pushing further levels visibly pays off. This changes the score scale versus today (previously capped ~32, now open-ended) — leaderboards are per-game, so this doesn't conflict with any other game's scoring.

The canvas shows "Level N" next to the score, and a brief "Level up!" flash when a wave clears — handled as local, untested cosmetic state in `SpaceInvadersCanvas.tsx` (a ref tracking the previous level, rendered for ~1s after an increment), not new engine state.

### 4. Difficulty retune (base/level-1 values)

First-pass constants for the level-1 baseline (levels scale up from here per §3's table), to be adjusted after playtest — same approach as the earlier Pong difficulty design (`docs/superpowers/specs/2026-08-01-pong-difficulty-design.md`):

| Constant | Old | New |
|---|---|---|
| `ENEMY_BASE_SPEED` | 30 | 22 |
| `ENEMY_SPEED_PER_KILL` | 4 | 2 |
| `ENEMY_DROP_DISTANCE` | 20 | 12 |

`ENEMY_SPEED_PER_KILL` and `ENEMY_DROP_DISTANCE` remain constant across levels (they govern within-wave escalation as a level's own enemies die, not the level-to-level ramp in §3) — kept modest so a single wave doesn't spiral the way it does today, while the level system provides the long-term difficulty curve.

### 5. Sprite pass

Replace flat `fillRect` blocks with small pixel-art bitmaps, drawn via scaled `fillRect` grids — no image assets, no new build tooling:

- Two-frame alternating invader silhouette (classic "legs open/closed" walk cycle), with two enemy variants (top rows vs. bottom rows use different bitmasks) for visual variety.
- A proper ship silhouette (cannon body shape) instead of a flat bar.
- A starfield background (a fixed set of small dots) instead of flat `#11111a`.
- A short-lived explosion-flash particle drawn when an enemy dies — purely cosmetic, local canvas-component state (same pattern as the "Level up!" flash), not engine state.

## Constants summary (all in `frontend/src/games/spaceInvaders.ts`, all tunable)

| Constant | Value |
|---|---|
| `AUTO_FIRE_INTERVAL_SECONDS` | 0.45 |
| `ENEMY_BASE_SPEED` (level 1) | 22 |
| `ENEMY_SPEED_PER_KILL` | 2 |
| `ENEMY_DROP_DISTANCE` | 12 |
| `ENEMY_LEVEL_SPEED_STEP` | 4 per level |
| `ENEMY_MAX_SPEED` | 70 |
| `ENEMY_MIN_FIRE_INTERVAL` | 0.5 |
| `ENEMY_FIRE_INTERVAL_STEP` | 0.08 per level |
| `ENEMY_MAX_VOLLEY` | 3 |
| `LEVEL_CLEAR_BONUS` | 10 × level |
| Max enemy rows | 6 |

These are first-pass numbers, not final — see Testing below.

## Scope boundary

Confined to `frontend/src/games/spaceInvaders.ts` (engine/constants), `frontend/src/games/SpaceInvadersCanvas.tsx` (rendering, input, cosmetic-only flash/explosion state), and `frontend/src/pages/GamesPage.tsx` (canvas padding, shared by all games). No backend changes, no changes to the games-eligibility/unlock system, no changes to `AppShell`.

## Testing

- Rewrite `SpaceInvadersCanvas.test.tsx`'s tap/drag-fire tests — replace with a test asserting the ship auto-fires periodically without any pointer/touch input.
- Update `spaceInvaders.test.ts`:
  - New/changed constants.
  - Auto-fire cadence: fires when no bullet active and interval elapsed, doesn't fire early, doesn't double-fire while a bullet is in flight.
  - Level progression: clearing a wave increments `level`, rebuilds enemies per the level-N formulas, awards the level-clear bonus, and does **not** end the run.
  - Existing "game ends when cleared" test is replaced with "game continues and levels up when cleared."
  - Difficulty-ramp formulas (rows/speed/fire-interval/volley-count) produce the expected values at a few sample levels, and are capped as specified.
- Manual playtest on both desktop and an actual mobile viewport (per project convention for gameplay/UI changes) to confirm the mobile controls are actually usable now, and that the difficulty curve across levels 1–5 feels fair rather than trivial or chaotic. First-pass constants above are expected to be adjusted based on that playtest.

## Non-goals

- No lives system (still one hit = game over, as today).
- No keyboard controls (not requested; mouse/touch drag remains the only input).
- No change to `AppShell`'s global page padding.
- No changes to the Breakout or Flappy Bird games (separate PRs, separate specs).
