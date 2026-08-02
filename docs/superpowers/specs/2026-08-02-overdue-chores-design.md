# Overdue Chore Management Design

**Date:** 2026-08-02
**Status:** Approved for planning

## Goal

Give parents a dedicated place to manage chores that went overdue: see every overdue chore (one-off and recurring), cancel one with an optional points penalty, reschedule a one-off chore, and get an ntfy push at 8:00 CET on the day after a chore goes overdue — not at midnight.

## Background / Current State

- Overdue chores are already *visible* (red text + "Overdue" badge) on the Assignments, Dashboard, and My Chores pages since v3.3.4 unbounded queries, but there is no dedicated view and no management actions.
- `DELETE /api/assignments/:id` (parent-only) deletes a one-off assignment but applies no penalty and leaves no record.
- `PUT /api/assignments/:id` (parent-only) can reschedule a one-off assignment's `dueDate`.
- Recurring occurrences have **no** cancel or reschedule endpoint (`occurrences.routes.ts` only handles completion).
- No penalty feature exists — the v1-rewrite explicitly cut "overdue penalty automation" (`v1-rewrite-REQUIREMENTS.md:89`), relying on manual `POST /api/points/adjust`.
- No scheduled/background jobs exist. The only notification ("due today") fires lazily when a parent loads `/api/assignments`, and there is no overdue notification at all.
- Statuses are free-form strings (`PENDING`/`COMPLETED`/`PARTIALLY_COMPLETE`), enforced only at the application layer.

## Scope

1. A parent-only Overdue page listing all overdue chores (both `ChoreAssignment` and `RecurringOccurrence`), with per-row **Cancel + penalty** and (for one-off chores only) **Reschedule** actions.
2. Soft cancel via a new `CANCELLED` status on both models, preserving a record and — for recurring occurrences — occupying the date so lazy generation does not recreate it.
3. An optional points penalty recorded as a negative `PointLog` with `type: 'PENALTY'`.
4. A scheduled (in-process) overdue notification sweep that pushes to the assigned child and all parents at/after 08:00 the day after a chore's due date.
5. `APP_VERSION` bump in both `package.json` files and `.env`/`.env.example`.

## Non-Goals

- **No recurring reschedule.** Rescheduling a recurring occurrence is handled case-by-case by the parent (e.g. cancel + re-assign). Only one-off assignments get a reschedule action. This avoids the lazy-generation regen problem (`@@unique([recurringChoreId, dueDate])` would regenerate a vacated date) and the associated conflict handling.
- No penalty configuration surface (no `OVERDUE_PENALTY_*` env vars). Penalty amount is chosen per action, defaulting to the chore's point value.
- No in-app notification center; ntfy push remains the only channel.
- No changes to how one-off chores are created/completed/awarded beyond the new status guard.
- No pagination on the Overdue page (matches the small-scale, no-pagination app pattern).

## Design

### 1. Backend — schema (`backend/prisma/schema.prisma`)

Add the following columns to **both** `ChoreAssignment` and `RecurringOccurrence`:

- `cancelledAt DateTime?` — set when a chore is canceled.
- `penaltyPoints Int?` — the penalty amount applied at cancel time, stored on the row so history/calendar views can show it without string-matching the ledger.
- `overdueNotifiedAt DateTime?` — dedup flag for the 8am overdue notification (mirrors the existing `dueNotifiedAt`).

`CANCELLED` is a new plain-string status value (like `PENDING`/`COMPLETED`). No new tables.

Schema push is handled by the existing `prisma db push --accept-data-loss` in the backend entrypoint — no migration tooling needed (see `docs/OPERATIONS.md`).

### 2. Backend — overdue service + routes

New `backend/src/services/overdue.service.ts` and `backend/src/routes/overdue.routes.ts`, mounted at `/api/overdue` in `backend/src/routes/index.ts`. All routes require `authenticate` + `authorize('PARENT')`. Request bodies validated via a new `backend/src/schemas/overdue.schema.ts` (Zod).

**`GET /api/overdue`** — `listOverdue()`
- Queries both tables for `status: 'PENDING'` AND `dueDate < startOfTodayUtc`, ordering by `dueDate asc`.
- The list's "overdue" boundary is the **UTC** start of today, matching how the rest of the app stores/compares dates (the app is entirely UTC-based; see Section 3 for why the *notification* timing instead uses `NOTIFY_TIMEZONE`). Around midnight UTC vs CET, a chore may flip to overdue in the list an hour or two before its 8am notification — this is expected, not a bug.
- Returns the same combined shape `assignmentService.getAll` produces today: `{ id, type: 'REGULAR'|'RECURRING', choreTemplateId, assignedToId, dueDate (YYYY-MM-DD), status, completedAt, pointsAwarded, dueNotifiedAt, overdueNotifiedAt, notes, createdAt, template, assignedTo }`.
- Does **not** call `generateOccurrences()` — the overdue list reflects what already exists (consistent with the app's lazy generation; a recurring occurrence is only overdue if it was generated and not completed).

**`POST /api/overdue/cancel`** — `cancel({ id, type, penalty? })`
- Transaction:
  1. Load the row (by `id` + `type`). 404 if missing.
  2. Reject with 409 unless `status === 'PENDING'` (covers already-canceled, already-completed).
  3. Set `status: 'CANCELLED'`, `cancelledAt: new Date()`.
  4. If `penalty > 0`: set `penaltyPoints: penalty` and create a `PointLog` with `userId = assignedToId`, `amount: -penalty`, `type: 'PENALTY'`, `reason: 'Overdue: <template title>'`. (`lifetimePoints` cache is unaffected — it is only incremented on positive writes; a negative penalty cannot drift it.)
- `penalty` is an optional non-negative integer, defaulting to `0` (waive). The frontend defaults the input to the chore's template points; the API accepts `0` explicitly.
- Returns the updated row in the shared combined shape.

**`POST /api/overdue/reschedule`** — `reschedule({ id, dueDate })` — **REGULAR only**
- Transaction: set `dueDate: new Date(dueDate)`, and reset both `dueNotifiedAt: null` and `overdueNotifiedAt: null` so a chore that goes overdue again after rescheduling re-notifies.
- 404 if the assignment doesn't exist; 409 unless `status === 'PENDING'`.
- Rejects `type: 'RECURRING'` with 400 (out of scope, see Non-Goals).

**Completion guards**
- `assignment.service.complete` and `recurring.service.completeOccurrence` currently only reject `status === 'COMPLETED'`. Change both to reject anything that isn't `PENDING` (409) so a canceled chore can't be completed.
- `assignment.service.uncomplete` already requires `COMPLETED`; unchanged.

### 3. Backend — scheduled overdue notification

**New `overdueNotifiedAt` columns** on both models (Section 1) are the dedup flag.

**`notification.service.ts`** additions (or a new `overdue-notification.service.ts` following the same conventions):
- `overdueBody(a)` formatter: title `Chore-Ganizer`, body `<title> — overdue <n> day(s)`, priority `5` (high), tags `['warning', 'exclamation']`, click `/chores/<id>` (matches the existing formatters' click convention).
- `notifyOverdue()` sweep:
  1. If `!isNtfyConfigured`, return immediately.
  2. Compute "today" and the current local hour in `NOTIFY_TIMEZONE` via `Intl.DateTimeFormat` (no timezone dependency). A chore is eligible when its `dueDate` (YYYY-MM-DD) is strictly before today's local date AND the current local time is at/after `NOTIFY_OVERDUE_HOUR` AND `overdueNotifiedAt` is null AND the recipient topic exists.
  3. For each eligible chore, write the optimistic dedup (`updateMany where { id, overdueNotifiedAt: null }` → `overdueNotifiedAt: now`, split by `REGULAR`/`RECURRING` table — same pattern as `notifyDueSoon`), then `sendNtfy` to the **assigned child's** topic and to **every parent's** topic (per-user no-op when unset). All sends fire-and-forget; failures are caught inside the service and never break the sweep.

**Scheduler wiring** (`backend/src/server.ts` or a small `scheduler.ts` imported by it):
- `setInterval(() => { void notifyOverdue() }, 5 * 60_000)` started alongside the HTTP server, with a re-entrancy guard (a module-level `isSweepRunning` flag) so overlapping ticks don't double-send, and `clearInterval` on graceful shutdown.
- If the backend is down at 08:00, the sweep fires on the first check after it comes back — the `overdueNotifiedAt` dedup makes this safe (a chore overdue for multiple days is notified once, at the first 8am check that runs).

**Env vars** (documented in `docs/OPERATIONS.md` and added to `.env.example`):
- `NOTIFY_TIMEZONE` (IANA name, default `Europe/Oslo` — i.e. CET/CEST) — the timezone in which "8am the next day" and "today" are computed.
- `NOTIFY_OVERDUE_HOUR` (default `08:00`, 24-hour `HH:MM` local) — the earliest time at which overdue notifications fire.

### 4. Frontend — Overdue page

- New route `/overdue` in `frontend/src/App.tsx` wrapped in `ProtectedRoute requiredRole="PARENT"`; a nav link added to `TopNav` and `BottomTabBar`.
- New `frontend/src/api/overdue.api.ts` (built via `createApiClient()`, per AGENTS.md) exposing `getOverdue()`, `cancelOverdue(id, type, penalty)`, `rescheduleOverdue(id, dueDate)`, plus a `OverdueChore` type matching the shared backend shape.
- New `frontend/src/hooks/useOverdue.tsx` (TanStack Query): `overdue`, `isLoading`, `error`, `cancel`/`isCancelling`, `reschedule`/`isRescheduling`; invalidates `['overdue']` (and `['points']`/`['points','gamification']` when a penalty was applied) on success.
- New `frontend/src/pages/OverduePage.tsx`:
  - `PageHeader title="Overdue Chores"` with a count.
  - Empty state when nothing is overdue; error state with retry (mirrors `AssignmentsPage`).
  - Each row (sorted by due date, oldest first): chore title, assignee, "Overdue <n> days" label, points, and actions:
    - **Cancel** (all rows) — opens a dialog (existing `Modal` primitive) with a penalty-amount input defaulting to the chore's template points, a hint that 0 waives the penalty, and confirm/cancel. On success, toast "Chore canceled" (+ penalty summary if applied).
    - **Reschedule** (REGULAR rows only; hidden on RECURRING rows) — opens a dialog with a date input defaulting to today. On success, toast "Due date updated".
  - Reuses `StatusBadge`, `Card`, `Button`, `Toast`, `Modal` primitives and the `formatDateStatus`/`formatDueDate` date utilities.
- `frontend/src/components/StatusBadge.tsx`: add a `CANCELLED` variant (gray, distinct from PENDING/COMPLETED/Overdue).
- `frontend/src/api/assignments.api.ts`: extend the `status` union to include `'CANCELLED'` (and `'PARTIALLY_COMPLETE'`, already documented but missing from the type).
- Canceled chores are excluded from "active" lists that already filter to `PENDING` (Dashboard upcoming, My Chores) automatically; where a list shows all statuses (Assignments page, calendar), a canceled chore appears with the new gray `CANCELLED` badge — this is history, and acceptable.

### 5. Error handling

- 404: assignment/occurrence not found.
- 409: cancel/reschedule of a chore that isn't `PENDING`; completion of a `CANCELLED` chore.
- 400: `type`/`dueDate`/`penalty` validation failures (via Zod), including rescheduling a recurring occurrence.
- Penalty validation: non-negative integer, capped at 100,000 (generous upper bound to catch typos).
- Notification failures never fail the sweep or the triggering request (existing fire-and-forget convention).

### 6. Testing

**Backend unit tests** (inline `jest.mock('../../config/prisma', ...)` per file, following `points.service.test.ts` pattern):
- `overdue.service.test.ts`:
  - `listOverdue` issues the expected PENDING + before-today query and shapes the combined response.
  - `cancel` (REGULAR and RECURRING) transitions status/cancelledAt, writes the `PENALTY` PointLog and `penaltyPoints` when penalty > 0, records nothing when penalty = 0, 404s on missing row, 409s on non-PENDING.
  - `reschedule` updates `dueDate` and nulls `dueNotifiedAt`/`overdueNotifiedAt`; 409 on non-PENDING; 400 on RECURRING.
  - `complete`/`completeOccurrence` reject a CANCELLED chore.
- Overdue notification sweep test (mocked prisma + ntfy): eligibility by local date + hour boundary (before/at/after `NOTIFY_OVERDUE_HOUR`, including the "overdue yesterday, first 8am check" case and a multi-day-overdue case), dedup via `updateMany where overdueNotifiedAt: null`, child + parents recipients, per-user topic no-op, ntfy-disabled no-op, no throw on send failure.

**Frontend tests** (Vitest, mocking the API per-test):
- `OverduePage.test.tsx`: renders the overdue list sorted by date; cancel dialog default penalty value and 0-waive path; reschedule dialog on REGULAR rows and absence on RECURRING rows; empty and error states; success toasts.
- `StatusBadge` CANCELLED variant; nav link presence for parents.
- `useOverdue.test.tsx`: mutation success invalidates `['overdue']` and, when penalty > 0, `['points']`.

**E2E** (Playwright, parent session): a parent with an overdue chore opens `/overdue`, cancels it with a penalty, and the child's points balance decreases.

### 7. Version Bump

Per `AGENTS.md` — bump `version` in `backend/package.json` and `frontend/package.json` (currently `3.3.4`; patch bump unless the plan grows) and sync `APP_VERSION` in `.env`/`.env.example`.

## Data Flow

1. Parent loads `/overdue` → `GET /api/overdue` returns the combined overdue list; no occurrence generation.
2. Parent cancels with penalty → `POST /api/overdue/cancel` marks the row `CANCELLED`, writes the `PENALTY` ledger entry, returns the row; React Query invalidates the overdue list (and points for the affected user).
3. Parent reschedules a REGULAR chore → `POST /api/overdue/reschedule` moves the due date and clears dedup flags; if it later goes overdue again, the 8am sweep re-notifies.
4. Every 5 minutes the backend sweep checks for eligible overdue chores; once the local time in `NOTIFY_TIMEZONE` is at/after `NOTIFY_OVERDUE_HOUR`, it pushes to the assigned child and all parents once (dedup flag set).
