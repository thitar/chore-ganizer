---
phase: 14
reviewed: 2026-07-08T04:00:00Z
depth: deep
files_reviewed: 29
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/src/__tests__/points.test.ts
  - backend/src/__tests__/services/assignment.service.test.ts
  - backend/src/__tests__/services/gamification.service.test.ts
  - backend/src/__tests__/services/notification.formatters.test.ts
  - backend/src/__tests__/services/recurring.service.test.ts
  - backend/src/routes/points.routes.ts
  - backend/src/schemas/points.schema.ts
  - backend/src/services/assignment.service.ts
  - backend/src/services/gamification.service.ts
  - backend/src/services/notification.formatters.ts
  - backend/src/services/notification.service.ts
  - backend/src/services/points.service.ts
  - backend/src/services/recurring.service.ts
  - frontend/src/__tests__/DashboardPage.test.tsx
  - frontend/src/__tests__/PointsPage.test.tsx
  - frontend/src/__tests__/ProfilePage.test.tsx
  - frontend/src/__tests__/TemplatesPage.test.tsx
  - frontend/src/__tests__/gamification-ui.test.tsx
  - frontend/src/api/points.api.ts
  - frontend/src/api/users.api.ts
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
  critical: 0
  warning: 6
  info: 2
  total: 8
status: resolved
---

# Phase 14: Deep Code Review — PR #146 "feat(m2): The Game — streaks, levels, badges"

**Reviewed:** 2026-07-08 (second pass — deep)
**Depth:** deep (cross-file analysis including data flow and call chains)
**Files Reviewed:** 29
**Status:** issues_found

## Summary

This is a second-pass deep review focusing on cross-file data flows, race conditions, timezone consistency, and test quality. The previous review (PR146-REVIEW.md) found and fixed 8 issues including the critical `getLifetimePoints` bug. This pass identifies 6 new warnings and 2 info-level findings, primarily around frontend state management gaps and schema/test inconsistencies.

## Warnings

### WR-05: `GamificationMoments` only detects the first new badge — multiple simultaneous badges are silently dropped

**File:** `frontend/src/components/GamificationMoments.tsx:22`
**Issue:** `data.badges.find(b => b.earnedAt !== null && !prev.earnedIds.has(b.id))` uses `Array.find()`, which returns only the first match. If a user completes a chore that triggers multiple new badges simultaneously (e.g., completing chore #10 earns both `ten-chores` and potentially `first-chore` if it was somehow missed, or earning `hundred-points` and `fifty-chores` in the same evaluation), only the first badge's toast is shown. The rest are silently discarded.

**Fix:** Replace `find` with `filter` and generate a toast for each new badge:
```typescript
const newBadges = data.badges.filter(b => b.earnedAt !== null && !prev.earnedIds.has(b.id))
for (const badge of newBadges) {
  newMessages.push(`${badge.emoji} Badge earned: ${badge.name}!`)
}
```

---

### WR-06: Gamification query not invalidated after chore completion — badge toasts delayed until next refetch

**File:** `frontend/src/hooks/useAssignments.tsx:28-42`
**Issue:** Both `completeMutation` and `completeRecurringMutation` invalidate `['assignments']` and `['points']` queries on success, but neither invalidates `['points', 'gamification']`. Since `awardBadges()` runs server-side as fire-and-forget after the completion response, the gamification query data is stale when the UI re-renders. The `GamificationMoments` component, which monitors `useGamification()`, won't detect the new badge until the next automatic refetch (window focus, navigation, or stale- timeout). This means the celebration toast and confetti are delayed or may not fire at all if the user stays on the page.

**Fix:** Add gamification query invalidation to both completion mutations:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['assignments'] })
  queryClient.invalidateQueries({ queryKey: ['points'] })
  queryClient.invalidateQueries({ queryKey: ['points', 'gamification'] })
},
```

---

### WR-07: `ProfilePage` `handleFamilyTopicSave` sets `topicSuccess` instead of a family-specific success state

**File:** `frontend/src/pages/ProfilePage.tsx:160`
**Issue:** When a parent saves a family member's ntfy topic, `setTopicSuccess('Topic saved!')` is called. This reuses the same success state as the parent's own topic save. The Toast at line 444 (`{topicSuccess && <Toast>...}`) will display "Topic saved!" even though the user was editing a family member's topic, not their own. If the parent then saves their own topic, the same state is overwritten. The visual feedback is confusing — it's unclear whose topic was saved.

**Fix:** Add a per-user success map similar to the existing `familyErrorMap`:
```typescript
const [familySuccessMap, setFamilySuccessMap] = useState<Record<number, string | null>>({})
```
Or at minimum, use a more descriptive message: `Topic saved for ${member.name}!`

---

### WR-08: `adjustPointsSchema` allows `amount: 0` — schema validation is looser than service validation

**File:** `backend/src/schemas/points.schema.ts:5`
**Issue:** The Zod schema validates `amount: z.number().int(...)` but does not reject zero. The service layer (`points.service.ts:42-44`) explicitly rejects `amount === 0` with a 400 error. This means the schema passes data that the service will reject, causing an unnecessary database round-trip and a less informative error path. The schema should be the first line of defense, consistent with the service's constraints.

**Fix:**
```typescript
amount: z.number().int('Amount must be an integer').refine(n => n !== 0, 'Amount must be non-zero'),
```
Or use `.min(1)` / `.max(-1)` with a union, though the refine approach is cleaner.

---

### WR-09: `DashboardPage` "due today" filter uses local time — inconsistent with UTC backend

**File:** `frontend/src/pages/DashboardPage.tsx:52-63`
**Issue:** The `dueToday` memo compares dates using `getFullYear()`, `getMonth()`, `getDate()` (local timezone). The backend streak computation uses `Date.UTC()` and `getUTCDate()` exclusively. For users significantly offset from UTC, a chore due "today" on the backend may show as "tomorrow" or "yesterday" in the dashboard's "Due today" stat card. This is the same class of bug as WR-04 (the "this week" fix), but in a different memo that was not addressed by the previous fix commit.

**Fix:** Use UTC-based date comparison:
```typescript
const dueToday = useMemo(() => {
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrowUTC = new Date(todayUTC)
  tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)
  return mine.filter(a => {
    const due = new Date(a.dueDate + 'T00:00:00Z')
    return a.status === 'PENDING' && due >= todayUTC && due < tomorrowUTC
  }).length
}, [mine])
```

---

### WR-10: `completedBody` test "body does not include completer name" tests removed functionality

**File:** `backend/src/__tests__/services/notification.formatters.test.ts:65-68`
**Issue:** The test `body does not include completer name` asserts that `'Alice'` is not in the body. This was meaningful when `completedBody` accepted a `_completer: UserInfo` parameter (the test verified the parameter was intentionally unused). After PR #146 removed the parameter entirely, the test is asserting that a hardcoded string doesn't contain a name that was never part of the function's contract. It provides zero regression value and is misleading — it suggests the function might accept a completer name, which it no longer does.

**Fix:** Remove the test case, or replace it with a comment-free deletion. The `edge cases > body does not include any user name` test at line 86-89 is equally vacuous after this change.

---

## Info

### IN-12: `PointsPage` select value parses empty string to `NaN` — relies on falsy check

**File:** `frontend/src/pages/PointsPage.tsx:60-65`
**Issue:** The `<select>` default value is `''` (empty string). When submitted without selection, `parseInt('', 10)` returns `NaN`. The guard `if (!targetUserId)` catches this because `!NaN === true`. While this works correctly, it's an accidental rather than intentional guard — `NaN` is falsy, but the intent is to check for "no selection." Using `null` explicitly or checking `isNaN()` would be clearer.

**Fix:**
```typescript
const amt = parseInt(amount, 10)
const targetUserId = adjustUserId ?? user?.id
if (targetUserId == null || isNaN(targetUserId)) {
```

---

### IN-13: Streak "neutral week" policy allows streaks without weekly activity

**File:** `backend/src/services/gamification.service.ts:81`
**Issue:** `if (!weekChores || weekChores.length === 0) continue` — weeks with zero due chores are skipped without breaking the streak. This means a user with chores due only every other week can accumulate a "4-week streak" by completing chores in weeks 1, 3, 5, 7 — despite having no obligations in the intervening weeks. The streak semantics are "consecutive weeks with 100% completion rate among due chores," not "consecutive weeks of activity." This is a design choice, not a bug, but it may surprise users who expect streak to mean "I did something every week."

**Fix:** No code change needed if this is intentional. Consider adding a tooltip or label on the Dashboard streak stat: "🔥 4 wk (all chores done)" to clarify the semantics.

---

_Reviewed: 2026-07-08 (second pass)_
_Reviewer: the agent (deep analysis)_
_Depth: deep_
_Note: This review supplements PR146-REVIEW.md (first pass). All 8 findings from the first pass have been resolved._

## Resolutions (2026-07-08)

All actionable findings fixed:

| ID | Status | Resolution |
|----|--------|------------|
| WR-05 | Fixed | `GamificationMoments.tsx` — changed `find` to `filter` to detect all new badges |
| WR-06 | Fixed | `useAssignments.tsx` — added `['points', 'gamification']` invalidation on completion |
| WR-07 | Fixed | `ProfilePage.tsx` — changed to `'Family member topic saved!'` message |
| WR-08 | Fixed | `points.schema.ts` — added `.refine(n => n !== 0)` to amount field |
| WR-09 | Fixed | `DashboardPage.tsx` — "due today" now uses UTC millisecond comparison |
| WR-10 | Fixed | `notification.formatters.test.ts` — removed dead "no completer name" and "no user name" tests |
| IN-12 | Acknowledged | NaN fallback works correctly; low priority, no change |
| IN-13 | Acknowledged | Neutral-week streak semantics are intentional; no change |

Additionally: CSRF middleware added (`backend/src/middleware/csrf.ts`) with double-submit cookie pattern, applied globally to `/api` routes. Frontend axios interceptor (`frontend/src/lib/csrf.ts`) sends token on mutating requests. CodeQL CSRF finding resolved.
