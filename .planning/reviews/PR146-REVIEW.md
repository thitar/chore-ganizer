---
phase: 14
reviewed: 2026-07-08T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/src/__tests__/points.test.ts
  - backend/src/__tests__/services/assignment.service.test.ts
  - backend/src/__tests__/services/gamification.service.test.ts
  - backend/src/__tests__/services/notification.formatters.test.ts
  - backend/src/__tests__/services/recurring.service.test.ts
  - backend/src/routes/points.routes.ts
  - backend/src/services/assignment.service.ts
  - backend/src/services/gamification.service.ts
  - backend/src/services/notification.formatters.ts
  - backend/src/services/recurring.service.ts
  - frontend/src/__tests__/DashboardPage.test.tsx
  - frontend/src/__tests__/PointsPage.test.tsx
  - frontend/src/__tests__/ProfilePage.test.tsx
  - frontend/src/__tests__/TemplatesPage.test.tsx
  - frontend/src/__tests__/gamification-ui.test.tsx
  - frontend/src/api/points.api.ts
  - frontend/src/components/AppShell.tsx
  - frontend/src/components/BadgeGrid.tsx
  - frontend/src/components/GamificationMoments.tsx
  - frontend/src/components/LevelBar.tsx
  - frontend/src/hooks/useAssignments.tsx
  - frontend/src/hooks/usePoints.tsx
  - frontend/src/pages/DashboardPage.tsx
  - frontend/src/pages/PointsPage.tsx
  - frontend/src/pages/ProfilePage.tsx
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 14: Code Review Report — PR #146 "feat(m2): The Game — streaks, levels, badges"

**Reviewed:** 2026-07-08
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

This PR adds a gamification layer: streak computation (Monday-start UTC weeks), level calculation (pure function over lifetime points), an 8-badge catalog evaluated on chore completion, and UI components (streak flame stat, level progress bar, badge grid, celebration toasts). The implementation is generally well-structured with good test coverage. The most significant issue is a data-correctness bug in lifetime points calculation that affects level and badge accuracy when chores are uncompleted.

## Critical Issues

### CR-01: `getLifetimePoints` excludes REVERSED entries, inflating level and badge calculations

**File:** `backend/src/services/gamification.service.ts:32-38`
**Issue:** `getLifetimePoints` filters for `type: { in: ['EARNED', 'BONUS'] }, amount: { gt: 0 }`. When a chore is uncompleted, `assignment.service.ts:197-201` creates a `REVERSED` PointLog with a negative amount. This negative entry does NOT match the filter, so the reversed points are never subtracted from the lifetime total. Meanwhile, `points.service.ts:getMyPoints` sums ALL logs (no filter) for the user-facing balance — meaning the balance correctly reflects reversals, but the level and badge calculations do not.

Consequence: After uncompleting a chore, the user's displayed level remains inflated and any earned point badges (e.g. `hundred-points`, `five-hundred-points`) remain earned even though the points were revoked. The level displayed on the Points page will disagree with the level shown on the Dashboard.

**Fix:**
```typescript
// gamification.service.ts — getLifetimePoints
export async function getLifetimePoints(userId: number): Promise<number> {
  const aggregate = await prisma.pointLog.aggregate({
    where: { userId, amount: { gt: 0 } },
    _sum: { amount: true },
  })
  return aggregate._sum.amount ?? 0
}
```
This sums all positive amounts regardless of type, matching the balance calculation semantics. The `amount: { gt: 0 }` filter is sufficient because `REVERSED`, `DEDUCTION`, `PENALTY`, and `PAYOUT` entries all carry negative amounts.

## Warnings

### WR-01: `POST /api/points/adjust` lacks request body validation schema

**File:** `backend/src/routes/points.routes.ts:50-58`
**Issue:** The adjust endpoint destructures `userId`, `amount`, and `reason` directly from `req.body` with no Zod validation middleware. While `adjustPoints()` performs basic checks (integer amount, non-empty reason), the `userId` parameter is not validated as a number at the route level. A non-numeric `userId` would pass through to `adjustPoints` and only fail when Prisma tries to use it, producing an opaque database error. All other mutating routes in this codebase use `validate(schema)` middleware.

**Fix:** Add a Zod schema for the adjust endpoint and apply the `validate()` middleware, consistent with the rest of the routes.

### WR-02: `awardBadges` race condition — concurrent completions may both trigger badge creation

**File:** `backend/src/services/gamification.service.ts:208-225`
**Issue:** `awardBadges` is fire-and-forget (`void awardBadges(userId)` in `assignment.service.ts:177` and `recurring.service.ts:152`). If a user completes two chores in rapid succession, both calls run concurrently. Both call `evaluateBadges`, which reads existing badges, evaluates rules in memory, then creates new `UserBadge` records. The first call may create a badge while the second call's `findMany` already returned, so the second call also attempts to create the same badge. The `@@unique([userId, badgeId])` constraint catches the duplicate, Prisma throws, and the outer `catch` silently logs a `console.warn`. The badge IS created (by the first call), but the user never receives an ntfy notification for it because the second call's notification path also fails.

**Fix:** Wrap `evaluateBadges` badge creation in a try/catch per badge (which already exists implicitly via the unique constraint), and ensure the ntfy notification is sent by the first successful creator. Alternatively, use an `upsert` pattern or serialize badge evaluation per user via a simple mutex/map.

### WR-03: `GamificationMoments` only fires one toast per data refresh — level-up suppresses badge notifications

**File:** `frontend/src/components/GamificationMoments.tsx:18-22`
**Issue:** The `useEffect` checks for level-up first and `return`s early, preventing the badge check on line 23 from running. If a user levels up AND earns a new badge in the same query refresh (e.g., completing a chore that pushes them past a level threshold and also earns the `first-chore` badge), only the level-up toast fires. The badge toast is silently dropped.

**Fix:** Remove the early `return` after the level-up branch, and let both checks run. Or queue both messages and display them sequentially.

### WR-04: Dashboard "this week" computation uses local time while streak uses UTC weeks

**File:** `frontend/src/pages/DashboardPage.tsx:36-50`
**Issue:** The `week` memo computes Monday using `new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)` which is local timezone. The backend streak computation (`gamification.service.ts:43-49`) uses explicit UTC Monday via `Date.UTC()`. For users in timezones significantly offset from UTC, the Dashboard's "this week" scope and the backend's streak scope will disagree on which chores are "this week." This is a pre-existing pattern (not introduced by this PR), but the streak feature makes the mismatch more visible since both are now displayed on the Dashboard.

**Fix:** Use UTC-based Monday computation in the Dashboard `week` memo, matching the backend:
```typescript
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
```

## Info

### IN-01: `uncomplete` has a redundant condition

**File:** `backend/src/services/assignment.service.ts:188`
**Issue:** `if (assignment.status === 'PENDING' || assignment.status !== 'COMPLETED')` — the first clause is a subset of the second. Any status that is `'PENDING'` also satisfies `!== 'COMPLETED'`. The condition is correct but redundant.

**Fix:** Simplify to `if (assignment.status !== 'COMPLETED')`.

### IN-02: `completedBody` has an unused `_completer` parameter

**File:** `backend/src/services/notification.formatters.ts:41`
**Issue:** The `_completer: UserInfo` parameter is accepted but never used in the function body. The tests explicitly verify that the completer's name is NOT included in the output, suggesting this is intentional — but the parameter is dead code.

**Fix:** Remove the parameter if it's truly unused, or document why it's kept for future use.

### IN-03: `ProfilePage` uses `as any` type assertion

**File:** `frontend/src/pages/ProfilePage.tsx:193`
**Issue:** `(currentUserFull as any).email` bypasses TypeScript's type checking. The `useUsers` hook likely returns a type that doesn't include `email`, forcing the cast. This undermines the type safety that the rest of the codebase maintains.

**Fix:** Extend the user type returned by `useUsers` to include `email`, or use a proper type guard.

---

_Reviewed: 2026-07-08_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
