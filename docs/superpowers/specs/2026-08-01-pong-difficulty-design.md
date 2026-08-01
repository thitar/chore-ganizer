# Pong Difficulty & Angle Mechanic — Design

## Problem

The Pong opponent is trivially easy to beat — the player wins in 2 bounces or less almost every game. Root causes, found in `frontend/src/games/pong.ts`:

- `OPPONENT_SPEED` was previously dropped from 240 → 120 (see `docs/project_notes/issues.md`) to fix an "impossible to score" bug, but overcorrected.
- Ball speed is constant forever (`BALL_SPEED_X = 180`, `BALL_SPEED_Y = 260`) — no escalation over a rally.
- Paddle bounces don't change the ball's horizontal angle at all — a hit only flips the sign of `vy`; `vx` never changes except off the side walls. There's no aiming mechanic for either paddle.

Goal: a "real rally, occasional miss" difficulty — a decent player should win real points, but not trivially, and rallies should feel alive rather than deterministic bounces.

## Mechanism

### 1. Ball speed ramps per rally

Replace independent `vx`/`vy` constants with a single `speed` scalar (magnitude of the velocity vector), derived from today's baseline: `BASE_BALL_SPEED = sqrt(180² + 260²) ≈ 316`.

- On every paddle contact (player or opponent), `speed = min(speed * RALLY_SPEEDUP, MAX_BALL_SPEED)`.
- `RALLY_SPEEDUP` starting value: `1.04` (4% faster per return).
- `MAX_BALL_SPEED` starting value: `1.6 * BASE_BALL_SPEED` (~506).
- Resets to `BASE_BALL_SPEED` when a point is scored.

This creates escalating tension within a rally: early exchanges are calm, long rallies get progressively harder to track for both sides until someone misses.

### 2. Hit-position-based angle, both paddles

Both the player paddle and the opponent paddle compute an angle from where the ball struck, instead of just flipping `vy`:

```
offset = clamp((ballCenterX - paddleCenterX) / (paddleWidth / 2), -1, 1)
vx = offset * MAX_ANGLE_RATIO * speed
vy = ±sqrt(speed² - vx²)   // sign points away from the paddle that was hit
```

- `MAX_ANGLE_RATIO` starting value: `0.75` (caps how horizontal a shot can go, avoiding degenerate near-parallel trajectories).
- A dead-center hit (`offset = 0`) returns essentially straight, matching today's feel; an edge hit sends the ball off at a sharp angle.
- Applies identically on both paddles, replacing the current asymmetric "only vy flips" bounce logic in `advancePongGame`.

This gives the player real aiming control (edge-hit to place shots the opponent must scramble for) and makes opponent returns visually/behaviorally varied instead of a flat wall.

### 3. Opponent aims instead of always centering

The opponent paddle (`moveOpponent`) currently tracks `ball.x` with pixel-perfect accuracy, which means under the new angle mechanic it would almost always center the ball (`offset ≈ 0`) and return everything dead straight — negating the angle mechanic on its side.

Fix: when the opponent begins tracking a new incoming ball (i.e., right after the ball leaves the player's paddle), it picks a randomized aim offset within a moderate range (e.g. up to ±50% of paddle half-width) and targets `ball.x - paddleWidth/2 + aimOffset` instead of dead-center. This is re-rolled once per incoming ball, not every frame (otherwise the paddle would jitter). The opponent is not aiming *at* the player's current position — just varying its return placement so it isn't always predictable.

### 4. Opponent base speed increase

`OPPONENT_SPEED`: `120` → **`175`** as a starting value (between the too-easy 120 and the previously-rejected too-hard 240).

## Constants summary (all in `frontend/src/games/pong.ts`, all tunable)

| Constant | Old | New (starting point) |
|---|---|---|
| `OPPONENT_SPEED` | 120 | 175 |
| `BALL_SPEED_X` / `BALL_SPEED_Y` | 180 / 260 | replaced by `BASE_BALL_SPEED ≈ 316` (scalar) |
| `RALLY_SPEEDUP` | n/a | 1.04 per return |
| `MAX_BALL_SPEED` | n/a | 1.6 × base (~506) |
| `MAX_ANGLE_RATIO` | n/a | 0.75 |
| opponent aim offset range | n/a | up to ±50% of paddle half-width, re-rolled per incoming ball |

These are first-pass numbers, not final — see Testing below.

## Scope boundary

Confined to `frontend/src/games/pong.ts` (game physics/constants), with possible minor prop/rendering plumbing in `PongCanvas.tsx` if new ball state needs surfacing. No changes to scoring, backend, leaderboard, or the games-eligibility/unlock system.

## Testing

- `frontend/src/__tests__/pong.test.ts` currently asserts exact `vx`/`vy` values after bounces against the old fixed-angle logic — these assertions need rewriting to check: direction sign correctness, speed conservation (`vx² + vy² ≈ speed²`), and angle proportional to hit offset, rather than exact legacy constants.
- Add coverage for: rally speed ramp (speed increases per return, capped at max, resets on score), opponent aim-offset behavior (varies but stays within bounds), and edge cases (ball hit at paddle's extreme edge, offset clamping).
- Per project convention for gameplay/UI changes, this also needs manual playtesting in the browser (`npm run dev`, unlock/play Pong) to validate the "real rally, occasional miss" feel — the numeric constants above are expected to be adjusted based on that playtest, not shipped as final on the first pass.

## Non-goals

- No predictive/trajectory-based opponent AI (rejected in brainstorming — current per-frame tracking plus the aim/speed changes above already produce the desired difficulty and feel without that added complexity).
- No paddle size changes.
- No difficulty levels/settings — single tuned difficulty, consistent with the existing single-mode game.
