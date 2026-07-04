---
phase: 12-chore-due-soon-lazy-trigger
reviewed: 2026-07-04T12:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - backend/src/config/notifications.ts
  - backend/src/services/notification.formatters.ts
  - backend/src/services/notification.service.ts
  - backend/src/__tests__/services/notification.service.test.ts
  - backend/prisma/schema.prisma
  - backend/src/services/assignment.service.ts
  - backend/src/__tests__/services/assignment.service.test.ts
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 12: Chore Due Soon Notification — Code Review Report

**Reviewed:** 2026-07-04T12:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found (4 warnings, 3 info items)

## Summary

Phase 12 implements a "chore due soon" notification system that triggers ntfy.sh push notifications when assignments are due today. The notification sweep is embedded as a fire-and-forget side-effect inside `assignmentService.getAll()`, filtering items that are `PENDING`/`PARTIALLY_COMPLETE`, un-notified, and have a user-configured `ntfyTopic`. A new `sendNtfy()` utility handles the raw HTTP POST to ntfy.sh, and `dueSoonBody()` formats the notification payload.

**Key concerns:**

1. **Silent notification failure on Node.js 18** — `AbortSignal.timeout()` is not available before Node.js 20. Production Docker uses `node:20-alpine` so this works in production, but local development on Node.js 18 silently breaks notifications (the error is caught, logged to `console.warn`, and the function returns `false` without escalation).

2. **Duplicate notification race** — The fire-and-forget `void notifyDueSoon(combined)` call inside `getAll()` creates a race window: if `getAll()` is called twice before the first sweep finishes writing `dueNotifiedAt` to the database, both calls send notifications for the same items. This is likely on parent dashboard page-refresh sequences.

3. **Latent timezone bug** — `new Date(item.dueDate + 'T00:00:00')` in `notifyDueSoon()` constructs a date using **local time** instead of UTC, while `item.dueDate` was produced from a UTC-only operation. This is currently harmless because `dueDate` is an unused parameter in `dueSoonBody()`, but will cause incorrect dates the moment someone uses this parameter.

4. **Test isolation leaks** — The "fetch throws" test in `assignment.service.test.ts` creates an untracked `jest.spyOn(global, 'fetch')` that is never restored by the `afterEach` hook.

---

## Warnings

### WA-01: `AbortSignal.timeout()` not available in Node.js 18 — notifications silently fail

**File:** `backend/src/services/notification.service.ts:29`
**Issue:** The `sendNtfy()` function uses `AbortSignal.timeout(3000)` to set a 3-second timeout on the ntfy.sh HTTP POST. This API was added in Node.js 20 (stable) / Node.js 18.17.0 (behind `--experimental-abortsignal-timeout` flag). Per AGENTS.md the project requires Node.js 18+ for local development, but many Node.js 18.x releases (18.0.0–18.16.x) do not have this function.

On incompatible Node.js versions:
- `AbortSignal.timeout` throws `TypeError: AbortSignal.timeout is not a function`
- The error is caught by the `try/catch` in `sendNtfy()`, logged to `console.warn`, and the function returns `false`
- In `notifyDueSoon()`, `if (!ok) continue` skips writing `dueNotifiedAt`, so notifications are **retried on every `getAll()` call** and silently fail every time
- No exception is propagated, no metric is incremented, no health check is affected — the feature is completely broken with no visibility

Production Docker image uses `node:20-alpine` (confirmed in `backend/Dockerfile`), so production deployments are unaffected. But any developer running `npm run dev` on Node.js 18 will experience silent notification failures.

**Fix:** Replace `AbortSignal.timeout(3000)` with `AbortSignal.timeout` only when available, or implement a timeout using `AbortController` that works on all Node.js 18+ versions:

```typescript
// Option A: Use AbortController (works on Node 16+)
async function sendNtfy(/* ... */): Promise<boolean> {
  if (!isNtfyConfigured || !topic) return false
  const { baseUrl } = getNtfyConfig()
  const url = `${baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    Title: title,
    Priority: String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)
  try {
    await fetch(url, { method: 'POST', body, headers, signal: controller.signal })
    return true
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}
```

---

### WA-02: Fire-and-forget notification sweep causes duplicate push notifications

**File:** `backend/src/services/assignment.service.ts:110`
**Issue:** `notifyDueSoon()` is invoked as `void notifyDueSoon(combined)` — a fire-and-forget async call. Inside `notifyDueSoon()`, for each matching item:
1. An HTTP POST is sent (`await sendNtfy(...)`)
2. On success, `dueNotifiedAt` is written to the database (`await prisma.choreAssignment.updateMany(...)`)

If `getAll()` is called again between step 1 and step 2 of the first call, the second call will also see `dueNotifiedAt: null` (step 2 hasn't completed yet) and send another notification for the same item. This is plausible during:
- Parent dashboard page refreshes (manual or auto-refresh)
- Multiple users (parent + child) loading assignments simultaneously
- Frontend navigation triggering re-mounts

The DB-level guard (`where: { id: item.id, dueNotifiedAt: null }`) prevents double-marking in the database, but it does **not** prevent the ntfy.sh push notification from being sent twice — the user receives duplicate alerts.

**Fix:** Two options, both should be implemented:
1. **Write `dueNotifiedAt` BEFORE sending the notification** (optimistic write). This eliminates the race at the cost of one extra DB write if the ntfy call fails:
   ```typescript
   // Before sendNtfy — mark as notified optimistically
   if (item.type === 'REGULAR') {
     await prisma.choreAssignment.update({ where: { id: item.id }, data: { dueNotifiedAt: new Date() } })
   } else {
     await prisma.recurringOccurrence.update({ where: { id: item.id }, data: { dueNotifiedAt: new Date() } })
   }
   const ok = await sendNtfy(topic, title, body, { priority, tags, click })
   if (ok) notified.add(item.id)
   ```
2. **Avoid fire-and-forget in the `getAll` hot path.** Move notification sweep to a background queue or debounced job, not tied to a request-scoped read operation.

---

### WA-03: Latent timezone bug — `dueDate` constructed with local time instead of UTC

**File:** `backend/src/services/assignment.service.ts:243`
**Issue:** The `dueDate` fed to `dueSoonBody()` is constructed as:
```typescript
dueDate: new Date(item.dueDate + 'T00:00:00'),
```

Here `item.dueDate` is a `YYYY-MM-DD` string (e.g., `"2026-06-15"`) produced by `a.dueDate.toISOString().split('T')[0]` on lines 80/98, which is a **UTC-only** operation. But `new Date("2026-06-15T00:00:00")` is parsed as **local time** (per ECMA-262, date-time strings without a timezone suffix are parsed as local time). In a positive UTC offset timezone (e.g., UTC+5), this creates a Date object that is **June 14, not June 15**.

Currently this is harmless because `dueDate` is an unused parameter in `dueSoonBody()` (the formatter produces a static string that doesn't depend on the date). But the moment someone uses `assignment.dueDate` in the formatter, notifications will display the wrong due date for users in positive UTC offsets.

**Fix:** Either parse the date component as UTC or remove the unused parameter:
```typescript
// Option A: Parse as UTC
dueDate: new Date(item.dueDate + 'T00:00:00Z'),

// Option B: Remove unused dueDate parameter from dueSoonBody entirely
```

The first option is preferred — it fixes the latent bug and keeps `dueDate` available for future formatter use.

---

### WA-04: Test isolation leak — untracked `fetch` spy in "fetch throws" test

**File:** `backend/src/__tests__/services/assignment.service.test.ts:395-408`
**Issue:** The `getAll still succeeds and dueNotifiedAt NOT written when fetch throws` test creates a second `jest.spyOn(global, 'fetch')` spy without tracking it in `fetchSpy` or the `afterEach` hook:

```typescript
it('getAll still succeeds and dueNotifiedAt NOT written when fetch throws', async () => {
  fetchSpy.mockRestore()                               // line 396 — restores spy1
  jest.spyOn(global, 'fetch').mockRejectedValue(...)   // line 397 — creates spy2, not tracked
  const warnSpy = jest.spyOn(console, 'warn')...       // line 398 — creates warnSpy, not tracked
  // ...
  warnSpy.mockRestore()                                 // line 408 — only runs if test passes
})
```

- **`spy2` is never restored**: After `fetchSpy.mockRestore()` on line 396, the original `global.fetch` is restored. Then a new spy (`spy2`) replaces it on line 397. The `afterEach` hook on line 325 calls `fetchSpy.mockRestore()` which restores `spy1` (already a no-op). `spy2` is **never cleaned up**, so `global.fetch` remains mocked after this test.

- **`warnSpy` leaks on assertion failure**: `warnSpy.mockRestore()` on line 408 only runs if the test passes. If any assertion before line 408 fails, `console.warn` stays mocked for all subsequent tests.

This can cause flaky test failures in tests that run after this describe block and rely on the real `global.fetch` or `console.warn` behavior.

**Fix:** Assign the new spy to a variable and clean up in both passing and failing paths:

```typescript
it('getAll still succeeds and dueNotifiedAt NOT written when fetch throws', async () => {
  fetchSpy.mockRestore()
  const localFetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  prisma.choreAssignment.findMany.mockResolvedValue([makeRegularItem()])

  const result = await assignmentService.getAll(1, 'PARENT')
  await new Promise((resolve) => setImmediate(resolve))

  expect(result).toHaveLength(1)
  expect(result[0].id).toBe(1)
  expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[ntfy] send failed'))

  warnSpy.mockRestore()
  localFetchSpy.mockRestore()
})
```

Alternatively, restructure the `afterEach` to call `jest.restoreAllMocks()` (which restores all `jest.spyOn` mocks regardless of which variable they were assigned to):

```typescript
afterEach(() => {
  fetchSpy.mockRestore()
  jest.restoreAllMocks() // catches any spy created without being tracked
})
```

However, note that `jest.restoreAllMocks()` does NOT restore mocks created by `jest.mock()` at the top of the file — only `jest.spyOn()` mocks. The outer `beforeEach` calls `jest.clearAllMocks()` which clears call counts but doesn't restore implementations.

---

## Info

### IN-01: `notifyChoreDueSoon` exported but never imported in production code

**File:** `backend/src/services/notification.service.ts:37`
**Issue:** The `notifyChoreDueSoon` function is defined and exported from `notification.service.ts`, and has its own dedicated test suite in `notification.service.test.ts`. However, no production code imports it. The only caller of the notification logic is `assignment.service.ts`, which imports `sendNtfy` and `dueSoonBody` directly:

```typescript
// assignment.service.ts — what's actually used
import { sendNtfy } from './notification.service'
import { dueSoonBody } from './notification.formatters'
```

This function is dead code from a production perspective. It was designed as a convenience wrapper but never wired up. While tested, it adds maintenance surface area without providing value.

**Fix:** Either wire `notifyChoreDueSoon` into the notification sweep (replace the inline logic in `assignment.service.ts:notifyDueSoon`), or remove the function and its tests as dead code.

---

### IN-02: Test uses fragile `setImmediate` microtask flush to wait for fire-and-forget notification

**File:** `backend/src/__tests__/services/assignment.service.test.ts:333,402,416`
**Issue:** Three notification-sweep tests use the following pattern to wait for the fire-and-forget `notifyDueSoon` to complete:

```typescript
await assignmentService.getAll(1, 'PARENT')
await new Promise((resolve) => setImmediate(resolve))
```

This relies on all async operations (`sendNtfy` + Prisma `updateMany`) completing within one event-loop tick after the microtask queue is drained. This is brittle: if the implementation adds additional `await` points, error handling, or retries, a single `setImmediate` may not be enough. The tests will become intermittently flaky without any code change being obviously wrong.

**Fix:** The best approach is to not use fire-and-forget in the implementation. But if fire-and-forget is kept, the tests should either:
1. Await the notification explicitly by exporting a test hook, or
2. Use a more robust wait pattern (e.g., wait for a condition with retries), or
3. Use Jest's fake timers combined with a promise-tracking utility

---

### IN-03: `isNtfyConfigured` evaluated at module load time

**File:** `backend/src/config/notifications.ts:3`
**Issue:** The `isNtfyConfigured` export is a module-level `Boolean()` evaluation that runs once when the module is first imported:

```typescript
export const isNtfyConfigured = Boolean(process.env.NTFY_DEFAULT_SERVER_URL)
```

If the environment variable is set after module load (e.g., in a lifecycle hook), the value is stale. In the current architecture (env vars loaded at process start via `dotenv/config`), this is effectively a non-issue. However, it makes testing slightly awkward (tests must use `jest.mock()` to override the module rather than mutating `process.env` and re-importing).

This is a minor style/maintainability note.

**Fix:** Convert to a getter function if dynamic re-evaluation is ever needed:
```typescript
export function isNtfyConfigured(): boolean {
  return Boolean(process.env.NTFY_DEFAULT_SERVER_URL)
}
```

---

## Findings Summary

| ID | Severity | File | Line | Description |
|---|---|---|---|---|
| WA-01 | Warning | `notification.service.ts` | 29 | `AbortSignal.timeout()` breaks on Node.js 18 — notifications silently fail |
| WA-02 | Warning | `assignment.service.ts` | 110 | Fire-and-forget `notifyDueSoon` causes duplicate push notifications on concurrent `getAll()` calls |
| WA-03 | Warning | `assignment.service.ts` | 243 | `dueDate` constructed with local time instead of UTC — latent date-off-by-one bug |
| WA-04 | Warning | `assignment.service.test.ts` | 395-408 | Test isolation leak: untracked `fetch` spy and `console.warn` spy not restored on failure |
| IN-01 | Info | `notification.service.ts` | 37 | `notifyChoreDueSoon` is exported but never imported by production code |
| IN-02 | Info | `assignment.service.test.ts` | 333 | Reliance on `setImmediate` flush for async notification is brittle |
| IN-03 | Info | `notifications.ts` | 3 | `isNtfyConfigured` evaluated once at module load time |

---

_Reviewed: 2026-07-04T12:00:00Z_
_Reviewer: gsd-code-reviewer (standard depth)_
_Depth: standard_
