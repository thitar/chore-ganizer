---
phase: 12-chore-due-soon-lazy-trigger
fixed_at: 2026-07-04T12:05:00Z
review_path: .planning/phases/12-chore-due-soon-lazy-trigger/12-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 12: Chore Due Soon Notification — Code Review Fix Report

**Fixed at:** 2026-07-04T12:05:00Z
**Source review:** `.planning/phases/12-chore-due-soon-lazy-trigger/12-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WA-01: `AbortSignal.timeout()` breaks on Node.js 18 — notifications silently fail

**Files modified:** `backend/src/services/notification.service.ts`
**Commit:** `b657ada`
**Applied fix:** Replaced `AbortSignal.timeout(3000)` with an `AbortController` + `setTimeout` pattern. A new `AbortController` is created and a 3-second timeout aborts the controller via `setTimeout`. The timeout is cleared in a `finally` block to prevent resource leaks. This works on all Node.js 18+ versions without requiring the `--experimental-abortsignal-timeout` flag.

### WA-02: Fire-and-forget `notifyDueSoon` causes duplicate push notifications on concurrent `getAll()` calls

**Files modified:** `backend/src/services/assignment.service.ts`
**Commit:** `a77e71f`
**Applied fix:** Reordered operations in `notifyDueSoon()` so the `dueNotifiedAt` DB update happens **before** the async `sendNtfy()` network call (optimistic write). This eliminates the race window: if `getAll()` is called concurrently, the first call's DB write completes before the second call reads `dueNotifiedAt`, preventing duplicate notifications. The `updateMany` still uses `dueNotifiedAt: null` as a `where` condition, so if two concurrent optimistic writes both execute, only the first writes data; the second writes 0 rows (harmless no-op).

### WA-03: `dueDate` constructed with local time instead of UTC — latent date-off-by-one bug

**Files modified:** `backend/src/services/assignment.service.ts`
**Commit:** `515cbbc`
**Applied fix:** Changed `new Date(item.dueDate + 'T00:00:00')` to `new Date(item.dueDate + 'T00:00:00Z')` on line 243. The `Z` suffix ensures the date is parsed as UTC, matching how `item.dueDate` was produced (via `.toISOString().split('T')[0]` which is a UTC-only operation). This prevents a latent off-by-one-day bug for users in positive UTC offset timezones.

### WA-04: Test isolation leak — untracked `fetch` spy and `console.warn` spy not restored on test failure

**Files modified:** `backend/src/__tests__/services/assignment.service.test.ts`
**Commit:** `3673422`
**Applied fix:** Restructured the "getAll still succeeds when fetch throws" test to:
- Assign the anonymous `jest.spyOn(global, 'fetch')` to a named `localFetchSpy` variable so it can be restored
- Use a `try/finally` block so both `warnSpy.mockRestore()` and `localFetchSpy.mockRestore()` run even if an assertion fails
- Updated test expectations to match the WA-02 optimistic write behavior: `updateMany` IS now called even when the fetch throws (because the DB write precedes the network call). The test now verifies `updateMany` was called (confirming the optimistic write happened) and the warning was logged.

---

_Fixed: 2026-07-04T12:05:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
