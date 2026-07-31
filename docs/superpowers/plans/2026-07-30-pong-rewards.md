# Pong Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permanently unlocked Pong for children who earn the existing 10 Chores badge, with friendly child-only high-score competition and unrestricted parent play.

**Architecture:** Add a dedicated `/api/games` resource backed by a future-friendly `GameHighScore` Prisma model. The backend is authoritative for eligibility and score recording; React uses its Games query to gate navigation and render a Canvas-based Pong page. Keep the game loop and collision rules in a pure TypeScript module so it can be tested without a browser canvas.

**Tech Stack:** Express, Prisma/SQLite, Zod, Jest/Supertest, React 18, TanStack Query, React Router, native Canvas, Vitest/React Testing Library, Tailwind CSS.

---

## File Structure

- Create: `backend/src/services/games.service.ts` - Pong eligibility, personal-best updates, and child leaderboard queries.
- Create: `backend/src/routes/games.routes.ts` - authenticated games API endpoints.
- Create: `backend/src/schemas/games.schema.ts` - validated Pong score body.
- Create: `backend/src/__tests__/services/games.service.test.ts` - mocked-Prisma service behavior tests.
- Create: `backend/src/routes/__tests__/games.routes.test.ts` - route auth, validation, and service delegation tests.
- Modify: `backend/prisma/schema.prisma` - add the per-user, per-game high-score record.
- Modify: `backend/src/routes/index.ts` - mount `/api/games`.
- Create: `frontend/src/api/games.api.ts` - typed Games API client built through `createApiClient()`.
- Create: `frontend/src/hooks/useGames.tsx` - Games query and game-over score mutation.
- Create: `frontend/src/games/pong.ts` - pure fixed-step Pong state and collision functions.
- Create: `frontend/src/games/PongCanvas.tsx` - Canvas renderer, pointer input, and animation lifecycle.
- Create: `frontend/src/pages/GamesPage.tsx` - locked state, Pong launch/game-over/retry flow, scores, and leaderboard.
- Create: `frontend/src/__tests__/pong.test.ts` - deterministic Pong engine tests.
- Create: `frontend/src/__tests__/GamesPage.test.tsx` - unlocked/locked, leaderboard, and score-submission UI tests.
- Modify: `frontend/src/App.tsx` - add authenticated `/games` route.
- Modify: `frontend/src/components/TopNav.tsx` - show Games only when `useGames()` reports eligible.
- Modify: `frontend/src/components/BottomTabBar.tsx` - add the conditional mobile Games tab.
- Modify: `backend/package.json`, `frontend/package.json`, both lockfiles, `.env`, `.env.example`, `CHANGELOG.md` - release `3.3.0` according to `docs/VERSION_MAP.md`.

### Task 1: Persist Game High Scores

**Files:**
- Modify: `backend/prisma/schema.prisma:10-34`
- Create: `backend/src/services/games.service.ts`
- Create: `backend/src/__tests__/services/games.service.test.ts`

- [ ] **Step 1: Write the failing service tests**

Create `backend/src/__tests__/services/games.service.test.ts` with an inline Prisma mock matching repository convention. Cover the following executable cases:

```ts
jest.mock('../../config/prisma', () => ({
  prisma: {
    userBadge: { findUnique: jest.fn() },
    gameHighScore: { findUnique: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
  },
}))

it('unlocks Pong for a parent without querying badges', async () => {
  await expect(games.getGames(1, 'PARENT')).resolves.toMatchObject({
    pong: { unlocked: true, personalBest: null, leaderboard: null },
  })
  expect(prisma.userBadge.findUnique).not.toHaveBeenCalled()
})

it('locks Pong for a child without the ten-chores badge', async () => {
  prisma.userBadge.findUnique.mockResolvedValue(null)
  await expect(games.getGames(2, 'CHILD')).resolves.toMatchObject({
    pong: { unlocked: false, personalBest: null, leaderboard: null },
  })
})

it('returns child-only descending leaderboard to an eligible child', async () => {
  prisma.userBadge.findUnique.mockResolvedValue({ userId: 2, badgeId: 'ten-chores' })
  prisma.gameHighScore.findUnique.mockResolvedValue({ score: 12 })
  prisma.gameHighScore.findMany.mockResolvedValue([
    { score: 24, user: { id: 3, name: 'Bob', color: '#0EA5E9' } },
    { score: 12, user: { id: 2, name: 'Alice', color: '#F59E0B' } },
  ])
  await expect(games.getGames(2, 'CHILD')).resolves.toMatchObject({
    pong: { unlocked: true, personalBest: 12, leaderboard: [{ score: 24 }] },
  })
})

it('rejects a Pong score from a locked child', async () => {
  prisma.userBadge.findUnique.mockResolvedValue(null)
  await expect(games.recordPongScore(2, 'CHILD', 8)).rejects.toMatchObject({ statusCode: 403 })
})

it('upserts only when a completed score exceeds the stored personal best', async () => {
  prisma.userBadge.findUnique.mockResolvedValue({ userId: 2, badgeId: 'ten-chores' })
  prisma.gameHighScore.findUnique.mockResolvedValue({ score: 12 })
  await expect(games.recordPongScore(2, 'CHILD', 8)).resolves.toEqual({ personalBest: 12, isNewBest: false })
  expect(prisma.gameHighScore.upsert).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the service tests to verify they fail**

Run: `npm test -- --runInBand src/__tests__/services/games.service.test.ts`

Expected: FAIL because the service and Prisma model do not exist.

- [ ] **Step 3: Add the model and minimal service implementation**

Add this relation to `User` and this model to `backend/prisma/schema.prisma`:

```prisma
  gameHighScores          GameHighScore[]

model GameHighScore {
  id        Int      @id @default(autoincrement())
  userId    Int
  game      String
  score     Int
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, game])
  @@index([game, score])
}
```

Create `backend/src/services/games.service.ts`. Define `PONG_GAME = 'PONG'` and an internal `isPongUnlocked(userId, role)` that returns `true` for parents and otherwise calls `prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: 'ten-chores' } } })`. `getGames()` must return `{ pong: { unlocked, personalBest, leaderboard } }`; return `leaderboard: null` for parents and locked children, and for an eligible child query only `game: PONG` scores whose joined user has `role: 'CHILD'`, ordered by `score: 'desc'`. `recordPongScore()` must throw `new AppError('Pong is locked until you earn the 10 Chores badge', 403)` for an ineligible child, preserve a score that is not higher, and otherwise call `upsert` with the `(userId, game)` composite key.

- [ ] **Step 4: Generate Prisma client and run the focused tests**

Run: `npm run prisma:generate && npm test -- --runInBand src/__tests__/services/games.service.test.ts`

Expected: Prisma client generation succeeds and every Games service test passes.

- [ ] **Step 5: Commit the persistence and service slice**

```bash
git add backend/prisma/schema.prisma backend/src/services/games.service.ts backend/src/__tests__/services/games.service.test.ts
git commit -m "feat: add Pong score service"
```

### Task 2: Expose The Protected Games API

**Files:**
- Create: `backend/src/schemas/games.schema.ts`
- Create: `backend/src/routes/games.routes.ts`
- Modify: `backend/src/routes/index.ts:1-22`
- Create: `backend/src/routes/__tests__/games.routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Mock `../../services/games.service` and test `GET /api/games/me` and `POST /api/games/pong/scores` through an Express router. Assert unauthenticated requests receive 401, authenticated `GET` calls `getGames(session.userId, session.role)`, zero/negative/fractional scores receive 400, and a valid `{ score: 7 }` calls `recordPongScore(session.userId, session.role, 7)` and returns 201 with its result.

```ts
it('records a validated game-over score for the session user', async () => {
  games.recordPongScore.mockResolvedValue({ personalBest: 7, isNewBest: true })
  const res = await request(app).post('/api/games/pong/scores').set('Cookie', childCookies).send({ score: 7 })
  expect(res.status).toBe(201)
  expect(res.body.data).toEqual({ personalBest: 7, isNewBest: true })
})
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `npm test -- --runInBand src/routes/__tests__/games.routes.test.ts`

Expected: FAIL because no games router is mounted.

- [ ] **Step 3: Add schema, router, and mount**

Create `backend/src/schemas/games.schema.ts`:

```ts
import { z } from 'zod'

export const pongScoreSchema = z.object({
  score: z.number().int('Score must be an integer').min(0).max(1_000_000),
})
```

Create `backend/src/routes/games.routes.ts` with these handlers, matching the existing JSON envelope and error forwarding:

```ts
router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ success: true, data: await gamesService.getGames(req.session.userId!, req.session.role!), error: null })
  } catch (err) { next(err) }
})

router.post('/pong/scores', authenticate, validate(pongScoreSchema), async (req, res, next) => {
  try {
    const result = await gamesService.recordPongScore(req.session.userId!, req.session.role!, req.body.score)
    res.status(201).json({ success: true, data: result, error: null })
  } catch (err) { next(err) }
})
```

Import and mount the router as `router.use('/games', gamesRouter)` in `backend/src/routes/index.ts`.

- [ ] **Step 4: Run focused backend verification**

Run: `npm test -- --runInBand src/routes/__tests__/games.routes.test.ts src/__tests__/services/games.service.test.ts && npm run build`

Expected: all focused tests and the backend TypeScript build pass.

- [ ] **Step 5: Commit the API slice**

```bash
git add backend/src/schemas/games.schema.ts backend/src/routes/games.routes.ts backend/src/routes/index.ts backend/src/routes/__tests__/games.routes.test.ts
git commit -m "feat: expose protected games API"
```

### Task 3: Add Typed Client, Query, And Conditional Navigation

**Files:**
- Create: `frontend/src/api/games.api.ts`
- Create: `frontend/src/hooks/useGames.tsx`
- Modify: `frontend/src/components/TopNav.tsx:1-114`
- Modify: `frontend/src/components/BottomTabBar.tsx:1-80`
- Modify: `frontend/src/__tests__/TopNav.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Extend `TopNav.test.tsx` to mock `useGames` and assert:

```tsx
it('shows Games to an unlocked child and a parent', () => {
  gamesState.data = { pong: { unlocked: true, personalBest: null, leaderboard: null } }
  renderNav(child, <TopNav />)
  expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games')
})

it('does not show Games to a locked child', () => {
  gamesState.data = { pong: { unlocked: false, personalBest: null, leaderboard: null } }
  renderNav(child, <TopNav />)
  expect(screen.queryByRole('link', { name: 'Games' })).not.toBeInTheDocument()
})
```

Also assert the mobile tab bar adds Games only when the query reports `pong.unlocked`; while the query is loading, omit it to avoid a navigation flash.

- [ ] **Step 2: Run the navigation tests to verify they fail**

Run: `npm test -- --run src/__tests__/TopNav.test.tsx`

Expected: FAIL because `useGames` and Games navigation do not exist.

- [ ] **Step 3: Add the typed Games client and query hooks**

Create `frontend/src/api/games.api.ts` using `createApiClient('/api/games')`, never `axios.create()`. Define these interfaces and functions:

```ts
export interface PongLeaderboardEntry {
  user: { id: number; name: string; color: string }
  score: number
}
export interface PongStatus {
  unlocked: boolean
  personalBest: number | null
  leaderboard: PongLeaderboardEntry[] | null
}
export interface GamesSummary { pong: PongStatus }
export interface PongScoreResult { personalBest: number; isNewBest: boolean }

export async function getGames(): Promise<GamesSummary> {
  const response = await api.get('/me')
  return response.data.data
}
export async function submitPongScore(score: number): Promise<PongScoreResult> {
  const response = await api.post('/pong/scores', { score })
  return response.data.data
}
```

Create `frontend/src/hooks/useGames.tsx` with `useGames()` keyed as `['games']`, and `useSubmitPongScore()` that invalidates `['games']` on success.

- [ ] **Step 4: Gate desktop and mobile navigation**

Call `useGames()` in `TopNav` and `BottomTabBar`. Derive `showGames = games?.pong.unlocked === true`; insert `{ to: '/games', label: 'Games' }` into the desktop links only when true. Add a `Gamepad2` mobile tab under the same condition. Do not add Games to the parent Manage menu.

- [ ] **Step 5: Run focused frontend verification and commit**

Run: `npm test -- --run src/__tests__/TopNav.test.tsx && npm run build`

Expected: navigation tests and frontend build pass.

```bash
git add frontend/src/api/games.api.ts frontend/src/hooks/useGames.tsx frontend/src/components/TopNav.tsx frontend/src/components/BottomTabBar.tsx frontend/src/__tests__/TopNav.test.tsx
git commit -m "feat: add conditional games navigation"
```

### Task 4: Build The Deterministic Pong Engine

**Files:**
- Create: `frontend/src/games/pong.ts`
- Create: `frontend/src/__tests__/pong.test.ts`

- [ ] **Step 1: Write failing pure-engine tests**

Create engine tests that use no DOM or canvas. Test `createPongGame()`, `movePaddle()`, and `advancePongGame()` with an explicit delta time. Cover pointer coordinates clamped to the paddle bounds, ball bounce from the top/side walls, bounce from the player paddle only while moving downward, one point after the ball crosses the opponent edge, game over when it crosses the player edge, and restart restoring zero score and a running state.

```ts
it('ends the run when the ball passes the player edge', () => {
  const game = { ...createPongGame(), ball: { x: 20, y: 476, vx: 0, vy: 240 }, status: 'running' as const }
  expect(advancePongGame(game, 0.1).status).toBe('game-over')
})
```

- [ ] **Step 2: Run the engine tests to verify they fail**

Run: `npm test -- --run src/__tests__/pong.test.ts`

Expected: FAIL because the engine module does not exist.

- [ ] **Step 3: Implement the minimal pure engine**

Create `frontend/src/games/pong.ts` with exported numeric constants (`PONG_WIDTH`, `PONG_HEIGHT`, paddle/ball dimensions), a `PongGame` state type, and pure functions:

```ts
export function createPongGame(): PongGame
export function movePaddle(game: PongGame, pointerX: number): PongGame
export function advancePongGame(game: PongGame, deltaSeconds: number): PongGame
```

Use a fixed design size of `800x500`, clamp each animation delta to `0.05` seconds, score when the ball exits the top edge, then re-serve it from the center traveling toward the player so a run continues. End the run when it exits the bottom edge. Keep all velocity and collision behavior in this module; it must not import React, browser APIs, or network code.

- [ ] **Step 4: Run the engine tests to verify they pass**

Run: `npm test -- --run src/__tests__/pong.test.ts`

Expected: all deterministic engine tests pass.

- [ ] **Step 5: Commit the game engine**

```bash
git add frontend/src/games/pong.ts frontend/src/__tests__/pong.test.ts
git commit -m "feat: add Pong game engine"
```

### Task 5: Render Pong And The Games Page

**Files:**
- Create: `frontend/src/games/PongCanvas.tsx`
- Create: `frontend/src/pages/GamesPage.tsx`
- Modify: `frontend/src/App.tsx:1-74`
- Create: `frontend/src/__tests__/GamesPage.test.tsx`

- [ ] **Step 1: Write failing page tests**

Mock `useGames`, `useSubmitPongScore`, and `PongCanvas`. Verify all approved user flows:

```tsx
it('renders a locked child message without Pong or the leaderboard', () => {
  gamesState.data = { pong: { unlocked: false, personalBest: null, leaderboard: null } }
  render(<GamesPage />)
  expect(screen.getByText(/earn the 10 Chores badge/i)).toBeInTheDocument()
  expect(screen.queryByText('Pong Leaderboard')).not.toBeInTheDocument()
})

it('shows an eligible child leaderboard but not a parent leaderboard', () => {
  // child: leaderboard populated; parent: leaderboard null
})

it('retains a game-over score and exposes retry when score submission fails', async () => {
  // invoke mocked PongCanvas onGameOver(7), reject mutation, assert score and Retry score remain visible
})
```

Use an App/MemoryRouter test to verify an authenticated direct visit to `/games` renders the explicit locked page, not Pong. The route remains authenticated through `ProtectedRoute`; it does not use a child-only `requiredRole`, because parents are valid players.

- [ ] **Step 2: Run the Games page tests to verify they fail**

Run: `npm test -- --run src/__tests__/GamesPage.test.tsx`

Expected: FAIL because GamesPage and PongCanvas do not exist.

- [ ] **Step 3: Implement the Canvas wrapper**

Create `PongCanvas` with an `onGameOver(score: number)` prop. It must:

- use a `canvas` ref and `requestAnimationFrame` to render the pure engine state;
- convert `PointerEvent.clientX` through `getBoundingClientRect()` to the `800`-unit engine coordinate, call `movePaddle`, and call `setPointerCapture` on pointer down;
- draw background, paddles, ball, center line, and score using the existing dark/accent palette;
- cancel the animation frame when game over or unmounting;
- render no pause control and expose restart by changing a `runId` prop supplied by the page.

- [ ] **Step 4: Implement the Games page and route**

Create `GamesPage` inside `AppShell`. While `useGames` loads, render existing `Skeleton` primitives. On query failure, use the established error/retry presentation. For `pong.unlocked === false`, render only the explanatory locked card: “Earn the 10 Chores badge to unlock Pong.”

For an unlocked user, render a Pong card with launch action, pointer-control instructions, personal best, and Canvas after launch. On `onGameOver`, store the final score and call `useSubmitPongScore`. Display final score, personal-best/new-best outcome, restart, and a retry action if submission fails; do not discard final score on failure. Render “Pong Leaderboard” only when `pong.leaderboard !== null`, so it never appears to parents or locked children.

Import `GamesPage` and add:

```tsx
<Route path="/games" element={<ProtectedRoute><GamesPage /></ProtectedRoute>} />
```

- [ ] **Step 5: Run frontend tests and build**

Run: `npm test -- --run src/__tests__/pong.test.ts src/__tests__/GamesPage.test.tsx src/__tests__/TopNav.test.tsx && npm run build`

Expected: focused game/navigation tests and frontend build pass.

- [ ] **Step 6: Commit the playable Pong page**

```bash
git add frontend/src/games/PongCanvas.tsx frontend/src/pages/GamesPage.tsx frontend/src/App.tsx frontend/src/__tests__/GamesPage.test.tsx
git commit -m "feat: add unlockable Pong games page"
```

### Task 6: Release, Documentation, And Full Verification

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `frontend/package-lock.json`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `CHANGELOG.md`
- Modify: `docs/ARCHITECTURE.md:60-84`
- Modify: `docs/USER-GUIDE.md:12-36`

- [ ] **Step 1: Write documentation assertions or update documentation tests if present**

There is no documentation test suite. Manually verify the updated guide contains all user-visible rules: 10 Chores unlocks Pong for children, parents always play but do not appear in the leaderboard, only personal best is stored, and games never change points.

- [ ] **Step 2: Apply the required version bump and documents**

Set both package versions to `3.3.0`. Set `.env` and `.env.example` `APP_VERSION=3.3.0`. Regenerate each lockfile using its own package install rather than editing it. Add `## [3.3.0]` to `CHANGELOG.md` with a concise Pong reward entry. Update architecture with `GameHighScore` and `/api/games` ownership/access rules; update the user guide with the unlock and scoring rules.

- [ ] **Step 3: Regenerate lockfiles and database schema**

Run: `npm install && npm run prisma:generate && npm run prisma:push`

Working directory: `backend/`

Run: `npm install`

Working directory: `frontend/`

Expected: package locks record `3.3.0`, Prisma client is current, and the local SQLite schema gains `GameHighScore` without data loss.

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run build`

Working directory: `backend/`

Run: `npm test && npm run build`

Working directory: `frontend/`

Run: `npm run test:e2e`

Working directory: repository root. If the local backend/frontend are not running for Playwright, state that condition and run the complete backend/frontend unit and build suites at minimum.

- [ ] **Step 5: Manually verify the browser flow**

1. Sign in as a child without `ten-chores`: no Games navigation; `/games` shows locked copy; no leaderboard.
2. Award or seed the `ten-chores` badge, refresh, and confirm Games navigation, Pong launch, pointer input, restart, game-over score submission, and child leaderboard.
3. Sign in as a parent: Games is visible without a badge; personal best works; no leaderboard is rendered.
4. Confirm a lower later score does not replace the displayed best score.

- [ ] **Step 6: Commit release metadata and documentation**

```bash
git add backend/package.json frontend/package.json backend/package-lock.json frontend/package-lock.json .env .env.example CHANGELOG.md docs/ARCHITECTURE.md docs/USER-GUIDE.md
git commit -m "chore: release Pong rewards 3.3.0"
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 enforce permanent badge-based unlocks and friendly high-score storage; Task 3 hides Games navigation while locked; Task 5 provides direct-route locked state, pointer-only no-pause Canvas play, retryable game-over submission, private parent score, and child-only leaderboard; Task 6 covers release/docs/verification.
- Scope: Snake and Breakout are explicitly excluded. No points, badges, or level progression are altered.
- Type consistency: Backend `PONG_GAME`, API `pong`, and frontend `PongStatus` use the same single-game vocabulary. The score payload is always `{ score: number }`; score results are always `{ personalBest, isNewBest }`.
- Placeholder scan: no TBD/TODO items or unspecified implementation steps remain.
