---
phase: 15
reviewer: Hermes (lyra.lab)
reviewed: 2026-07-08T23:30:00Z
depth: deep (read of gamification/csrf/points/auth paths + full 44-file diff scan)
pr: 146
title: feat(m2): The Game — streaks, levels, badges
base: main
head: feature/m2-the-game
stats: "+2851 / -90, 44 files, mergeable, clean"
prior_review: .planning/reviews/PR146-REVIEW-2.md (status: resolved, 6 warning + 2 info)
findings:
  critical: 0
  high: 2
  medium: 4
  low: 3
  total: 9
status: open (pending user decision 2026-07-09)
---

# Phase 15: Deep Code Review — PR #146 "feat(m2): The Game — streaks, levels, badges"

**Reviewer:** Hermes (read-only pass, no changes made)
**Reviewed:** 2026-07-08 (third pass, independent of REVIEW-2)
**Depth:** deep — read of gamification/csrf/points/auth paths + full 44-file diff scan
**PR:** #146 · base `main` ← head `feature/m2-the-game` · +2,851 / −90 · 44 files · mergeable, clean

## Severity summary

| # | Finding | Severity | Type |
|---|---|---|---|
| 1 | `awardBadges` runs full `collectStats` scan on **every** chore completion | High | Performance precedent |
| 2 | Duplicate expensive queries: streak/lifetime scanned 2× per gamification fetch | High | Performance / N+1 |
| 3 | CSRF cookie set on **every** response (incl. GET, no mutation) | Medium | Security hygiene |
| 4 | `SESSION_SECRET \|\| 'dev-secret'` hardcoded fallback shipped in `app.ts` | Medium | Security precedent |
| 5 | Per-axios-instance CSRF interceptor is fragile (easy to forget) | Medium | Maintainability precedent |
| 6 | Hardcoded `LEVEL_THRESHOLDS` + `BADGE_CATALOG` in code, not config | Medium | Evolvability precedent |
| 7 | Role string `'PARENT'` / `'CHILD'` scattered as literals | Low | Consistency |
| 8 | CSRF disabled in tests → security control has no integration coverage | Low | Test gap |
| 9 | CodeQL literal-cookie hack (`'XSRF-TOKEN'` duplicated) | Low | Smell / tool-fight |
| — | `GamificationMoments` (WR-05), `dueDate` indexes | OK | — (verified fine) |

Totals: **2 High, 4 Medium, 3 Low** (0 critical).

## Detailed findings

### High 1 — `awardBadges` triggers a full stats recompute on every completion
**Where:** `gamification.service.ts:219` `awardBadges` → `evaluateBadges` → `collectStats`; called as `void awardBadges(...)` in `assignment.service.ts:177` and `recurring.service.ts:152`.

`collectStats` does `count` + `findMany(completedAt)` on **both** `choreAssignment` and `recurringOccurrence`, plus `getLifetimePoints` (aggregate) and `getStreak` (up to 52-week scan). This runs **unconditionally on every single chore completion** — fire-and-forget, but always executed.

**Why it matters structurally:** This is the per-completion hot path. A child finishing a chore now pays for a full historical stats scan + a 52-week streak recompute, even though streak is *already cached weekly* on the user (`streakCount`/`streakComputedAt`). You noted M2 "awaits kid feedback" and will evolve — the game loop's most frequent event (completion) should be O(1)-ish, not O(history). This sets a precedent that "just call the badge evaluator" is cheap.

**Recommendation:** Only call `awardBadges` when points actually changed; or short-circuit `collectStats` to incrementally update counters (the `User` model already has `streakCount` — why not `completionCount`, `lifetimePoints` cached too?). At minimum, gate it behind "did this completion cross a threshold."

### High 2 — Duplicate expensive queries in the gamification read path
**Where:** `getGamification` (`gamification.service.ts`) calls `getStreak` + `getLifetimePoints`; `evaluateBadges` (via `collectStats`) calls `getStreak` + `getLifetimePoints` **again**; `getGamification` is also hit by the frontend `useGamification` poll.

So one gamification fetch = **2× full streak scan + 2× lifetime aggregate** (and `awardBadges` adds yet another `collectStats`). The streak scan is 52 weeks × 2 tables.

**Why it matters:** Same root cause as #1 — no shared, memoized snapshot. For a dashboard endpoint that re-renders on completion, this is wasteful and degrades as history grows.

**Recommendation:** Compute `streak` + `lifetimePoints` **once** per request and pass them down; have `evaluateBadges` accept a `Stats` arg instead of recomputing. Or build a single `getGamificationState(userId)` that returns everything in one pass.

### Medium 3 — CSRF cookie set on every response, including GET
**Where:** `middleware/csrf.ts:28` — `if (!csrfCookieToken) { … res.cookie('XSRF-TOKEN', …) }`. The guard only skips *validation* for GET/HEAD/OPTIONS, but the cookie (re)issue happens for **all** methods before that check.

**Why it matters:** Setting a cookie on every response is unnecessary churn; more importantly, the cookie is issued even on endpoints that never need it, and `secure` is only set in production (`secure: NODE_ENV==='production' && SECURE_COOKIES!=='false'`). On an HTTP-via-proxy dev setup the cookie is plain — acceptable, but "set on every response" is just noise. Minor, but it's a pattern other endpoints will copy.

**Recommendation:** Only (re)issue the cookie on GET/auth routes, not mutating ones; and document the `secure` expectation clearly in `.env` setup.

### Medium 4 — `SESSION_SECRET || 'dev-secret'` fallback shipped
**Where:** `app.ts:24` `const sessionSecret = process.env.SESSION_SECRET || 'dev-secret'`.

This is **pre-existing** (not introduced by the PR), but the PR adds CSRF *adjacent* to it and you said this PR is "structuring for the rest of the project." Shipping a hardcoded session-secret fallback means a misconfigured prod deploy silently runs with a public secret. The prior reviews didn't flag it.

**Recommendation:** At minimum, log a warning when the fallback is used; ideally fail startup if `NODE_ENV==='production'` and no `SESSION_SECRET`. Set the precedent *now* before more auth code piles on.

### Medium 5 — Per-instance CSRF interceptor is fragile
**Where:** `lib/csrf.ts` `applyCsrfInterceptor(instance)` must be called on **every** `axios.create(...)` in every API module. The code comment admits: *"axios.create() instances have their own interceptor chain… so each API module's instance must register this."*

**Why it matters:** This is an error-prone pattern that will definitely be forgotten by the next API module (you have 8 `api/*.api.ts` files; only `points.api.ts` got it in this PR). A missed interceptor = CSRF silently not sent = 403s, or worse, someone "fixes" it by disabling CSRF. Structural smell.

**Recommendation:** Export one shared, pre-configured axios base instance (with the interceptor already attached) and have all API modules import *that* instead of calling `axios.create` + `applyCsrfInterceptor` each time.

### Medium 6 — Game balance is hardcoded in source, not config
**Where:** `LEVEL_THRESHOLDS = [0,50,120,…]` and `BADGE_CATALOG` (8 badges) are constants in `gamification.service.ts`.

**Why it matters:** You explicitly said M2 "awaits kid feedback" and will likely retune. Hardcoding means every balance tweak is a code edit + deploy. For a *game*, balance is data, not logic. Setting this precedent now means future tuning goes through PRs.

**Recommendation:** At least document that these are intentional constants (so future-you knows it's a choice, not an oversight). Ideally move to a `config/game.ts` or DB-backed table so non-devs can tune.

### Low 7 — Role strings as literals
**Where:** `authorize('PARENT')` in `points.routes.ts`; `'CHILD'` default in schema. No shared `ROLES` constant.

**Recommendation:** Minor, but a `const ROLES = { PARENT: 'PARENT', CHILD: 'CHILD' }` (or Prisma enum) prevents typos and centralizes the auth model. Cheap precedent to set.

### Low 8 — CSRF has no integration test coverage
**Where:** `csrf.ts:13` `if (process.env.NODE_ENV === 'test') { next(); return }` — CSRF is **fully disabled in tests**. So the entire security control is exercised only by unit tests that mock it away, never by an integration test proving a forged cross-site POST is *rejected*.

**Recommendation:** Add at least one integration test that hits a mutating `/api` route without the header and expects 403, run with `NODE_ENV` ≠ `test` (or a dedicated env). The control that protects the whole API shouldn't be untested in e2e.

### Low 9 — CodeQL literal-cookie hack
**Where:** `csrf.ts:34` sets `res.cookie('XSRF-TOKEN', …)` using a **literal string** while a `CSRF_COOKIE = 'XSRF-TOKEN'` const exists above. The comment explains it's to satisfy CodeQL's `js/missing-token-validation` static check, which "only resolves literal string arguments."

**Why it matters:** This is a symptom, not just a smell — the middleware structure fights the static analyzer, forcing duplicated magic strings (`'XSRF-TOKEN'` in 3 places now: const, header const usage, literal). Future refactors that unify the constant will *re-break* CodeQL detection silently.

**Recommendation:** Note this trade-off in `AGENTS.md`/architecture docs so the next dev doesn't "clean up" the duplicate and regress security scanning.

## Things verified FINE

- **`dueDate` is indexed** on both `choreAssignment` and `recurringOccurrence` (`@@index([dueDate])`) — the 52-week streak scan won't table-scan. Good.
- **`GamificationMoments` shows ALL new badges** (iterates `newBadges`), not just the first — the prior WR-05 is **resolved** in this head.
- **`awardBadges` P2002 handling** (unique `userId,badgeId`) is correctly swallowed as concurrent-safe — good defensive code.
- **`streakComputedAt` caching** correctly guards recompute with `>= weekStart` — no stale-streak bug.
- **Routes** correctly use `authenticate` + `authorize('PARENT')` + `validate(schema)` on `POST /adjust` — solid layered pattern.
- **Schema**: `UserBadge` has `@@unique([userId, badgeId])` + `onDelete: Cascade` — correct.
- **Frontend `useGamification`** uses react-query with a stable key — no obvious over-fetching from the UI side.

## Cross-cutting observation

The two High findings (#1, #2) share one root cause: **gamification state is recomputed from raw history on every access instead of being maintained incrementally.** The `User` model *already* caches `streakCount`/`streakComputedAt` — that's the right instinct, but it stops there. Extending that caching to `completionCount` and `lifetimePoints` would collapse both hotspots. Since you said this PR sets the precedent for the rest of the project, I'd strongly recommend resolving #1/#2 **before** merge — they're cheap to fix now and expensive to fix after other features depend on `awardBadges`/`getGamification`.

## Scope / method notes

- Read-only review. No files modified, no commits, no pushes.
- Deep-read files: `backend/src/services/gamification.service.ts`, `backend/src/middleware/csrf.ts`, `backend/src/schemas/points.schema.ts`, `backend/src/app.ts`, `backend/src/routes/points.routes.ts`, `backend/src/services/notification.formatters.ts`, `backend/src/services/assignment.service.ts` (completion path), `backend/prisma/schema.prisma`, `frontend/src/lib/csrf.ts`, `frontend/src/api/points.api.ts`, `frontend/src/components/GamificationMoments.tsx`, `frontend/src/hooks/usePoints.tsx`, and prior `.planning/reviews/PR146-REVIEW-2.md`.
- Full 44-file diff scanned via GitHub compare API.
- Test suite NOT executed (would require install/build on the working tree, which has uncommitted `docs/project_notes` edits from the multi-agent setup session — left untouched).

## Status

Open — pending user review (2026-07-09). No fixes applied.
