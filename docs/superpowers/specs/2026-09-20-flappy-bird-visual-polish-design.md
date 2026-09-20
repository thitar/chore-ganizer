# Flappy Bird Visual Polish — Design

## Problem

Flappy Bird's gameplay is fine and untouched by this request — the only complaint is that it "could use better looking graphics." Today `FlappyBirdCanvas.tsx` draws everything as flat, single-color `fillRect`s: the bird is a plain yellow square, pipes are flat green rectangles with no cap or shading, and the background is one solid fill color with no ground or sky detail.

## Design

This is a pure rendering-layer pass, confined entirely to `frontend/src/games/FlappyBirdCanvas.tsx`. The engine (`frontend/src/games/flappyBird.ts`) is untouched — no gameplay, physics, or collision changes. Same technique as the Space Invaders sprite pass: hand-drawn pixel-art bitmaps via scaled `fillRect`, no image assets, no new build tooling.

1. **Bird sprite.** Replace the flat square with a small pixel-art bird bitmap (body, wing, eye, beak — 2-3 frames for a wing-flap animation cycle, same `ANIMATION_FRAME_INTERVAL_MS`-style timer used for Space Invaders' enemies). The bird also **tilts** with its velocity: rotate the canvas around the bird's center by an angle derived from `bird.vy` (already exposed on the `Bird` interface — no engine change needed), clamped to a range like -25° (climbing, right after a flap) to +90° (diving) for the classic Flappy Bird "nose dips as it falls" look.
2. **Pipes.** Add a distinct cap/lip at each pipe's gap-facing end (a slightly wider, darker-green rect at the mouth) instead of one flat-color rectangle, plus a simple two-tone vertical shading (a lighter stripe down one side) for a sense of depth. Still two `fillRect`-based shapes per pipe, just no longer perfectly flat.
3. **Background.** Add a static soft-focus backdrop — simple rounded-rect/circle cloud shapes and a low hill/skyline silhouette — plus a textured ground strip at the bottom edge (currently the ground is an invisible collision boundary only; this adds a visible strip there, purely cosmetic, collision logic unchanged).

None of this touches hit-testing, scoring, spawn timing, or difficulty — a like-for-like visual swap over the existing engine output.

## Scope boundary

Confined to `frontend/src/games/FlappyBirdCanvas.tsx`. No changes to `frontend/src/games/flappyBird.ts`, `registry.ts`, or `GamesPage.tsx` (its canvas-padding fix already shipped in the Space Invaders PR and covers every game, including this one).

## Testing

- `frontend/src/__tests__/FlappyBirdCanvas.test.tsx` doesn't currently assert exact `fillRect` call shapes for the bird or pipes (checked — only a generic mocked `fillRect`/`fillStyle`), so this pass is low-risk for existing test breakage, unlike the Space Invaders ship/enemy sprite change which did need one assertion rewritten.
- Manual playtest in a real browser (per project convention for UI changes) to confirm the animation timing and rotation range read well at actual gameplay speed, not just as a static screenshot.

## Non-goals

- No gameplay/difficulty changes (not requested — this game's mechanics weren't flagged as a problem).
- No sound.
- No changes to Breakout or Space Invaders (separate PRs, separate specs).
