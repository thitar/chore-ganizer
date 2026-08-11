# Parent Dashboard + Nudge Design

**Date:** 2026-08-11
**Status:** Approved for planning

## Goal

Make the `/` dashboard useful for parents, who currently have no chores of their own and see a near-empty page (0 points, 0 due today, 0 streak, "No upcoming chores"). Replace it with an **Option D** "Mix" layout — a compact status strip, a short "Needs action" list, and light recognition below — and add a parent-initiated **Nudge** push to remind a child about a pending chore.

## Background / Current State

- `frontend/src/pages/DashboardPage.tsx` (182 lines) renders for *every* authenticated user. Every widget except the Leaderboard is filtered to the current user's own assignments/points/streak (`assignedToId === user.id`), so a parent sees an essentially empty page with only a top-3 leaderboard and an "Assign Chore" button as useful content.
- Data that already exists and is parent-visible:
  - `GET /api/overdue` (parent-only) — all overdue `ChoreAssignment` + `RecurringOccurrence`, each with `template.{title,points,category}`, `assignedTo.{id,name,color,ntfyTopic}`, `type: 'REGULAR'|'RECURRING'`, `dueDate`, `status`. Overdue cancel/reschedule endpoints already exist.
  - `GET /api/assignments?from&to` — parent sees all children's assignments/occurrences in the same combined shape, including `completedAt` and `pointsAwarded`.
  - `GET /api/points/leaderboard` — all-time balances per child.
  - `GET /api/users` — family roster.
- Data gaps:
  - **No weekly points aggregate** — `getLeaderboard`/`getUserPoints` only return all-time balances (plus last-100 logs). "Pts this week" needs a new endpoint.
  - **No nudge** — nothing named `nudge`/`reminder` exists anywhere in the codebase (verified by grep).
- Notification plumbing exists: every user has an `ntfyTopic`; `sendNtfy` (`backend/src/services/notification.service.ts:15`) powers the assigned/due-soon/overdue/completion pushes. The completion push already includes `click: '/chores/<id>'`-style deep links.
- Overdue reschedule/cancel use a `{ id, type: 'REGULAR'|'RECURRING' }` body discriminator (`backend/src/schemas/overdue.schema.ts`, `backend/src/services/overdue.service.ts`) — the Nudge endpoint will mirror this.

## Scope

1. Parent-only rework of the `/` dashboard (Option D layout). Child dashboard unchanged.
2. New parent-only `POST /api/assignments/nudge` endpoint that sends an ntfy push to the assignee, with a 15-minute server-side cooldown per chore.
3. New parent-only `GET /api/points/weekly` endpoint aggregating per-child points for the current week.
4. Schema addition of `lastNudgedAt` to both `ChoreAssignment` and `RecurringOccurrence`.
5. `APP_VERSION` bump in both `package.json` files (and `.env`/`.env.example`), per `AGENTS.md`.

## Non-Goals

- **No in-app notification center** — ntfy push remains the only channel; a nudge is a one-off push, not an inbox message.
- **No nudge history/audit** — only the cooldown timestamp is stored.
- **No change to child dashboard** or to how chores are created/completed/awarded.
- **No nudge on recurring-chore rules** (`RecurringChore`) — only on concrete assignments/occurrences.
- **No configurable cooldown** — 15 minutes is fixed for now.

## Design

### 1. Backend — schema (`backend/prisma/schema.prisma`)

Add `lastNudgedAt DateTime?` to **both** `ChoreAssignment` and `RecurringOccurrence` — the cooldown dedup flag, mirroring the existing `dueNotifiedAt` pattern. No new tables. Schema push is handled by the existing `prisma db push` bootstrap/entrypoint convention (no migration tooling).

### 2. Backend — Nudge endpoint

**`POST /api/assignments/nudge`** in `backend/src/routes/assignments.routes.ts`, `authenticate` + `authorize('PARENT')`, body `{ id, type: 'REGULAR'|'RECURRING' }` validated by a new `nudgeSchema` in `backend/src/schemas/assignment.schema.ts`.

Service: `assignment.service.nudge({ id, type, parentName })` (or a small `nudge.service.ts` following the overdue pattern):

1. Load the row by `id` + `type` with `assignedTo.ntfyTopic`, `template.title`, `template.id`. 404 if missing.
2. Reject 409 unless `status === 'PENDING'` (no nudging completed/canceled chores).
3. Reject 400 if `assignedTo.ntfyTopic` is null ("hasn't enabled push notifications").
4. **Cooldown**: if `lastNudgedAt` is within 15 minutes, reject 429 with a message including how long to wait.
5. Otherwise set `lastNudgedAt = new Date()` and `sendNtfy(topic, ...)`:
   - title: `Chore-Ganizer`
   - body: `Gentle reminder 👀 "<template.title>" is waiting · from <parentName>`
   - `click: '/chores/<id>'` (matches existing formatters' convention), fire-and-forget (existing `sendNtfy` swallows send failures).
   - `lastNudgedAt` is set regardless of push success (matches the existing fire-and-forget, `void sendNtfy` convention).

Cooldown is stored on the row being nudged, so it is per-chore (not per-child). The frontend also disables the button while the request is in flight and after a success.

### 3. Backend — Weekly points endpoint

**`GET /api/points/weekly`** in `backend/src/routes/points.routes.ts`, `authenticate` + `authorize('PARENT')`. Service `points.service.getWeeklyPoints()`:

- Reuse `startOfWeekUTC` from `gamification.service.ts` to compute Monday-start of the current week (UTC).
- `pointLog.groupBy({ by: ['userId'], where: { type: 'EARNED', createdAt: { gte: startOfWeek } }, _sum: { amount: true } })` joined to the child list (`role: 'CHILD'`).
- Returns `[{ user: { id, name, color }, points }]`, children with no weekly points included as `0` (mirrors `getLeaderboard` shape). Sorted by points desc.

> `'EARNED'` is the exact `PointLog.type` written on completion (verified: `assignment.service.ts:172`, `recurring.service.ts:140`). Weekly "earned" points counts `EARNED` logs only, so manual `ADJUSTMENT` and `PENALTY` entries don't inflate the weekly stat.

The dashboard sums `points` for the "Pts this week" stat; the per-child list is future-proof for a per-child weekly view.

### 4. Frontend — Parent dashboard

Refactor `frontend/src/pages/DashboardPage.tsx` to branch on `user.role === 'PARENT'`:

- **Parent** → render new `ParentDashboard` (new file, e.g. `frontend/src/pages/ParentDashboard.tsx`).
- **Child** → existing dashboard content, unchanged.

`ParentDashboard` (Option D):

1. **Header**: greeting "Hey {name} 👋" + existing "Assign Chore" button.
2. **Status strip** (4 stat cards, reusing `StatCard`):
   - **Overdue** — count of `useOverdue().overdue` items (badge style if > 0).
   - **Due today** — from `useAssignments()`, PENDING with due date in today's UTC range.
   - **This week done** — from `useAssignments()`, due within the current Monday-start week: `done of total` (+ small `ProgressRing`, matching current dashboard's week card).
   - **Pts this week** — sum of the new `useWeeklyPoints()` list.
3. **Needs action** (the core list, capped at 5):
   - Merge overdue items (`useOverdue`) + today's PENDING items (`useAssignments`), dedupe by `id` + `type`, sort overdue-first then by `dueDate`.
   - Row: assignee avatar + chore title + `Overdue`/`Today` chip (reuse `StatusBadge`/existing chips), assignee name + due label.
   - Actions per row:
     - **Nudge** (every PENDING row) — calls `nudgeAssignment(id, type)`. Disabled with tooltip when `assignedTo.ntfyTopic` is null. On 429, show a toast with the remaining wait; on success, toast "Reminder sent to <name> 👀".
     - **Reschedule / Cancel** (overdue rows only) — reuse the existing OverduePage dialog/flow (`cancelOverdue`, `rescheduleOverdue` from `frontend/src/api/overdue.api.ts`).
4. **Right rail**:
   - **Leaderboard** — existing `Leaderboard` component, `limit={3}`.
   - **Latest win** — from `useAssignments()`, COMPLETED sorted by `completedAt` desc, top 3: avatar, "<name> completed <title>", "+pts · <relative time>".
5. **Empty states** per widget ("All caught up 🎉", "No points earned yet" etc.).

New/changed frontend API modules (all via `createApiClient()`, per `AGENTS.md`):
- `frontend/src/api/points.api.ts`: add `getWeeklyPoints()`.
- `frontend/src/api/assignments.api.ts`: add `nudgeAssignment(id, type)` (no param rename needed — `id` + `type` map straight through).
- New hook `frontend/src/hooks/usePoints.tsx`: add `useWeeklyPoints()`; new `frontend/src/hooks/useNudge.tsx` (mutation, no cache invalidation needed since a nudge doesn't change list data).

### 5. Error handling

- 404: assignment/occurrence not found (already canceled/deleted).
- 409: nudge of a non-`PENDING` chore.
- 400: validation failures (Zod), or child has no `ntfyTopic`.
- 429: nudge cooldown not yet elapsed.
- Push send failures never fail the request (existing fire-and-forget convention).

### 6. Testing

**Backend unit tests** (inline `jest.mock('../../config/prisma', ...)`, following `points.service.test.ts` pattern):
- `nudge` service: success sends push + sets `lastNudgedAt`; 404 on missing; 409 on non-PENDING; 400 on null topic; 429 within cooldown (and the boundary just past 15 min); REGULAR and RECURRING both handled.
- `getWeeklyPoints`: aggregates COMPLETION logs since `startOfWeekUTC`, includes zero-point children, sorted desc.

**Backend integration tests** (`backend/src/__tests__/`): parent login hits the real app — nudge a seeded child's chore (with `ntfyTopic` set on the seeded user) → 200 and `lastNudgedAt` persisted; immediate re-nudge → 429; weekly points endpoint returns the seeded children.

**Frontend tests** (Vitest): `ParentDashboard` renders the four stat cards, the needs-action list (overdue-first, capped), Nudge disabled when the assignee lacks a topic, Reschedule/Cancel only on overdue rows, latest-win card; role branch keeps the child dashboard path.

**E2E** (Playwright, parent session): parent on `/` sees the status strip and needs-action rows; nudging an item shows a success toast (push delivery itself is not asserted — external).

### 7. Version Bump

Per `AGENTS.md` — bump `version` in `backend/package.json` and `frontend/package.json` (patch bump; this is a new feature but additive, ask the user if unsure) and sync `APP_VERSION` in `.env`/`.env.example`.

## Data Flow

1. Parent loads `/` → `ParentDashboard` fetches `useOverdue`, `useAssignments`, `useLeaderboard`, and `useWeeklyPoints` in parallel; computes the four stats and the needs-action list client-side.
2. Parent taps **Nudge** on a pending chore → `POST /api/assignments/nudge` sets `lastNudgedAt` and fires the ntfy push to the assignee's topic; React Query shows a toast; the button stays disabled for the row until the next fetch/cooldown elapse (server 429 is the source of truth).
3. Parent taps **Reschedule/Cancel** on an overdue row → existing overdue endpoints (unchanged).
4. "Pts this week" and the latest-win card are pure reads; weekly points come from `GET /api/points/weekly`, completions from `GET /api/assignments`.
