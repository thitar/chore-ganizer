# Architecture

System design reference for Chore-Ganizer. For "how do I run this", see [OPERATIONS.md](./OPERATIONS.md). For AI-agent-specific conventions, see [../AGENTS.md](../AGENTS.md).

## Overview

Chore-Ganizer is a family chore tracker: parents create and assign chores, children complete them and earn points, with recurring chores, a points/gamification layer (streaks, levels, badges), and push notifications. It's built for homelab/self-hosted deployment by a single family, not multi-tenant SaaS.

**Core value:** any family member can open the app, see their chores for today, and complete them — without the app requiring a devops engineer to maintain.

## Stack

**Backend:** Express + TypeScript, Prisma ORM, SQLite, Jest (unit tests), `ts-node` for dev, `tsc` for build.

**Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, TanStack Query (`@tanstack/react-query`) for server state, React Router v6, Vitest + React Testing Library.

**Auth:** `express-session`, in-memory `MemoryStore` (see [Auth Flow](#auth-flow) below for the session-persistence caveat), `bcrypt` for password hashing, a hand-rolled double-submit-cookie CSRF middleware (`backend/src/middleware/csrf.ts`) — not a library like `csurf`.

## Monorepo Layout

| Path | Contents |
|---|---|
| `backend/` | Express API — routes, services, Prisma schema |
| `frontend/` | React + Vite web app |
| `e2e/` | Playwright end-to-end specs, run from the repo root |
| `docs/` | This document, OPERATIONS.md, project_notes/ (bugs/decisions/key_facts/issues memory system) |
| `.planning/` | Historical phase-based planning docs (GSD workflow) — not part of the app |
| `docs/superpowers/plans/` | Implementation plans for in-progress or planned work |

## Backend Structure

`backend/src/`:
- **`app.ts`** — Express app construction and middleware registration (see [exact order](#middleware-order) below)
- **`server.ts`** — HTTP server bootstrap, listens on `HOST`/`PORT` (default `0.0.0.0:3010`), graceful shutdown on `SIGTERM`/`SIGINT`
- **`routes/`** — one file per resource: `health`, `auth`, `templates`, `assignments`, `users`, `recurring`, `occurrences`, `points` — mounted under `/api/*` in `routes/index.ts`. **`recurring.routes.ts` only covers CRUD on the recurrence *rule*** (`RecurringChore`) — generated `RecurringOccurrence` instances are listed and completed through `assignments.routes.ts`/`GET /api/assignments` and `occurrences.routes.ts`/`POST /api/occurrences/:id/complete`, not through `/api/recurring`. There is no `GET /api/recurring/occurrences` endpoint.
- **`services/`** — business logic (`assignment`, `auth`, `gamification`, `notification` + `notification.formatters`, `points`, `recurring`, `template`, `users`); routes call services directly — there is no separate controller layer in the current backend, routes are thin wrappers around service calls
- **`middleware/`** — `auth.ts` (session-based `authenticate`/`authorize`), `csrf.ts`, `errorHandler.ts`, `rateLimiter.ts`, `validator.ts` (Zod-schema-driven request validation)
- **`schemas/`** — Zod schemas consumed by `validate()` middleware (`assignment`, `points`, `template`, `auth`, `users`, `recurring`). All request-body-bearing routes now run `validate(schema)`; `occurrences.routes.ts` has no schema because its one route (`POST /:id/complete`) takes no request body, only a URL param.
- **`config/`** — `prisma.ts` (Prisma client singleton), `notifications.ts` (ntfy config)
- **`prisma/schema.prisma`** — single source of truth for the DB model. `role`/`status`/`type`/`frequency` fields are plain `String`, not Prisma enums — SQLite has no native enum support here, so their valid-value sets (e.g. `PARENT`/`CHILD`, `PENDING`/`COMPLETED`/`PARTIALLY_COMPLETE`) are enforced only at the application/Zod layer, never by the DB itself. `RecurringOccurrence` has `@@unique([recurringChoreId, dueDate])` — the actual mechanism that makes lazy occurrence generation idempotent (a second call for an already-generated date is a no-op, not a duplicate row).
- **`types/express-session.d.ts`** — augments `SessionData` with non-optional `userId: number` and `role: string`. They're absent until login, but routes downstream of `authenticate` use `req.session.userId!`/`req.session.role!` non-null assertions on the assumption `authenticate` already ran and populated them — don't add a route that reads these without putting `authenticate` first in its middleware chain.

### Middleware order

Verified against `backend/src/app.ts`:

1. `helmet()` — security headers
2. `cors()` — honors `CORS_ORIGIN`, `credentials: true` (needed since auth relies on session + CSRF cookies)
3. General rate limiter (`generalLimiter`, mounted on `/api`; default 300 req/15min, `RATE_LIMIT_MAX`)
4. `express.json()` / `express.urlencoded()` (10kb body size limit)
5. `cookie-parser`
6. `express-session`
7. Custom CSRF middleware (`csrfProtection`, mounted on `/api`)
8. API routes (mounted on `/api`) — `POST /api/auth/login` additionally has its own stricter `authLimiter` (default 10 req/15min, `AUTH_RATE_LIMIT_MAX`), the substitute defense for the deliberately-excluded account lockout feature
9. 404 handler
10. Global error handler

**History note:** `helmet`, `cors`, and `express-rate-limit` were in `backend/package.json` since the v1-rewrite but were never wired into `app.ts` — confirmed via `.planning/milestones/v1-rewrite-REQUIREMENTS.md`'s "Out of Scope" table (which has explicit reasoning for every deliberate cut, e.g. CSRF, account lockout) to be an accidental gap rather than a reasoned exclusion; fixed 2026-07-10. The in-memory session store (no persistence across restarts) predates the rewrite — a Node 25 crash workaround on the old codebase — and remains a known, deliberately undeferred gap; see `docs/OPERATIONS.md` for the tradeoff.

## Frontend Structure

- **`App.tsx`** — route definitions via React Router v6. All routes require auth (`ProtectedRoute`) except `/login`; `/templates`, `/recurring-chores`, `/assignments`, `/users` additionally require `requiredRole="PARENT"`. Other authenticated routes: `/` (dashboard), `/my-chores`, `/points`, `/calendar`, `/profile`. Unknown paths redirect to `/`.
- **`api/`** — one file per domain (`auth`, `templates`, `assignments`, `users`, `recurring`, `points`, `calendar`), each built via `createApiClient()` in `frontend/src/lib/apiClient.ts`.
- **`hooks/`** — TanStack Query hooks per domain (`useAuth`, `useAssignments`, `useTemplates`, `useUsers`, `useRecurringChores`, `usePoints`, `useCalendar`), plus a standalone `useDismissableMenu` (click-outside/escape handling for the Manage dropdown/sheet — not a data hook).
- **`components/ui/`** — the M1 "The Look" design-system primitive library (`Avatar`, `Button`, `Card`, `CountUp`, `EmptyState`, `PageError`, `PageHeader`, `PageLoading`, `ProgressRing`, `Skeleton`, `StatCard`, `Toast`). Page-level components (`Leaderboard`, `LevelBar`, `BadgeGrid`, `TopNav`, `BottomTabBar`, `AppShell`, `GamificationMoments`, `FilterBar`, `StatusBadge`, `ConfirmDelete`) live directly under `components/`, not in `ui/`.
- **Celebration UX**: `components/GamificationMoments.tsx` diffs the previous vs. current `useGamification()` result on every poll — a level increase or a badge whose `earnedAt` just flipped from `null` triggers a `Toast` plus `lib/celebrate.ts`'s `canvas-confetti` burst (skipped entirely if `prefers-reduced-motion`, via `utils/a11y.ts`). This is what UAT-CHECKLIST.md's "celebration toast (with confetti)" item is checking.

**Why `createApiClient()` exists:** every API module must build its axios instance through this shared factory, never `axios.create()` directly. A 2026-07-08 bug (see `docs/project_notes/bugs.md`) traced every mutating request silently failing CSRF validation back to `axios.create()` instances not inheriting the default instance's `x-xsrf-token` interceptor — each instance has its own independent interceptor chain. `createApiClient()` applies the CSRF interceptor per-instance so this can't regress silently.

## Data Model

Core entities (`backend/prisma/schema.prisma`):

- **User** — `role` (`PARENT` | `CHILD`), `color`, `ntfyTopic` (nullable, unique — per-user push notification channel), `streakCount` + `streakComputedAt` (lazily computed weekly streak, re-synced whenever it's read outside the current week), `lifetimePoints` + `lifetimePointsSyncedAt` (lazy self-healing cache of total positive `PointLog` amounts — backfilled from a one-time `pointLog.aggregate()` on first read, then incremented in place at each positive-`PointLog` write site thereafter; unlike the streak, it's never recomputed from scratch once synced)
- **ChoreTemplate** — reusable chore definition (`title`, `points`, `category`), owned by the parent who created it (`createdById`)
- **ChoreAssignment** — one-off instance of a template assigned to a user; `status` (`PENDING` | `COMPLETED` | `PARTIALLY_COMPLETE`), `dueNotifiedAt` (dedup flag for due-soon notifications), `pointsAwarded`
- **RecurringChore** — a recurrence rule (`frequency`, `dayOfWeek`, `dayOfMonth`) assigned to one fixed user (`assignedToId`). **Only fixed assignment is implemented** — round-robin/mixed rotation is a deferred feature (see `.planning/STATE.md` Deferred Items), despite older docs describing it as shipped.
- **RecurringOccurrence** — a generated instance of a `RecurringChore` for a specific due date, generated lazily on read (`generateOccurrences()` in `recurring.service.ts`, called from `assignment.service.ts`) rather than by a cron/background job; `recurringChoreId` is nullable with `onDelete: SetNull` so completed occurrences survive deletion of their parent recurrence rule (history-preserving)
- **PointLog** — append-only ledger, not a mutable balance. `type` values actually in use: `EARNED`, `BONUS`, `ADJUSTMENT`, `RECURRING`, `REGULAR`, `REVERSED`. There is no `PointTransaction` model and no pocket-money/currency conversion feature in the current backend — points are tracked as a simple integer log, not a banking system. (An older pre-rewrite backend had pocket money, overdue penalties, and a `PointTransaction` model; none of that carried over into the v1-rewrite.)
- **UserBadge** — badge catalog award record (`userId` + `badgeId`, unique together), cascade-deletes with the user

Lifetime points (for levels) are served from `User.lifetimePoints` via `getLifetimePoints()` in `services/gamification.service.ts` — see the User bullet above. Levels themselves are a pure function of that number (`computeLevel()`, 10 fixed point thresholds), not stored on the model.

**Gamification/points read endpoints** (`routes/points.routes.ts`): `GET /api/points/me` (own balance + log), `GET /api/points/leaderboard` (all users' balances — **intentionally visible to children too**, an explicit exception to the usual own-data-only rule for children, per `.planning/STATE.md`), `GET /api/points/gamification` (streak + level + full badge catalog with per-badge earned/locked state for the current user), `GET /api/points/users/:id` (role-gated: a child can only fetch their own), and the parent-only `POST /api/points/adjust`. `POST /api/occurrences/:id/complete` is the only endpoint in `occurrences.routes.ts` — recurring-occurrence generation and listing happen through `assignments.routes.ts`/`assignment.service.ts`, not here.

## Auth Flow

1. `POST /api/auth/login` → validates credentials with `bcrypt`, sets a session cookie
2. Every response ensures an `XSRF-TOKEN` cookie is set (`csrfProtection` middleware, first request or if missing)
3. All mutating requests (`POST`/`PUT`/`PATCH`/`DELETE`) must include the `x-xsrf-token` header matching the cookie value, or the request is rejected with 403
4. `middleware/auth.ts` → `authenticate` validates the session against the DB (`prisma.user.findUnique`); `authorize(...roles)` gates parent-only routes

**Session store caveat:** `express-session` is configured with no explicit store, which means it defaults to the in-memory `MemoryStore` — sessions do **not** persist across backend restarts/redeploys, and `MemoryStore` is explicitly not recommended for production by `express-session` itself (unbounded memory growth). This works fine for the single-family/low-traffic homelab use case this app targets, but is worth knowing before assuming "logged in" survives a container restart.

**CSRF cookie literal-string rule:** `csrf.ts` sets `res.cookie('XSRF-TOKEN', ...)` with the cookie name as an inline string literal rather than the `CSRF_COOKIE` constant, specifically so CodeQL's `js/missing-token-validation` check (which only resolves literal arguments, not constant-propagated ones) recognizes this as CSRF middleware. Don't "clean this up" — see `AGENTS.md` and `docs/project_notes/bugs.md` (2026-07-08).

## Notification Flow

Push notifications go through [ntfy.sh](https://ntfy.sh) (or a self-hosted ntfy server) via `NTFY_BASE_URL`. Pattern is fire-and-forget: `void sendNtfy(...)` is called from a service, never `await`ed in a route handler, and all errors are caught inside `notification.service.ts` so a notification failure never fails the underlying request. If `NTFY_BASE_URL` is unset, `isNtfyConfigured` is `false` and sends silently no-op (logged once at startup, not per-request).

Triggered from: chore assigned, chore due soon (lazy sweep piggybacked on the existing assignment-listing query, no cron job), and badge earned.

There is no email/SMTP notification channel, no in-app notification center, and no per-event notification toggles in the current backend — ntfy push is the only channel.

## CI/CD

`.github/workflows/security.yml` provides security scanning: CodeQL (JS/TS), `npm audit` (backend + frontend), Gitleaks secret scanning, Semgrep SAST, and Trivy filesystem vulnerability scans. `.github/workflows/quality.yml` provides PR validation through backend and frontend unit tests, typechecks, builds, and Docker builds. Neither workflow publishes Docker images to `ghcr.io/thitar/chore-ganizer-{backend,frontend}` or deploys; building, publishing, and deploying remain manual steps.

## Key Architectural Decisions

Pulled from `.planning/STATE.md`'s Accumulated Context (the permanent home for these now, rather than a milestone-scoped state file):

- **Rewrite, not refactor** — the pre-v1-rewrite codebase (200+ files with cascading imports) was fully replaced rather than incrementally migrated; archived history is preserved via git tags `v2.1.9`/`v3.0.0`, not in the working tree.
- **Lazy occurrence generation** — no cron job generates recurring chore occurrences; they're generated on demand when a user views the upcoming period.
- **Points as integer + simple log** — deliberately dropped the old `PointTransaction`-based banking/pocket-money system in favor of a lightweight append-only `PointLog`.
- **Lazy self-healing caches for streak and lifetime points** — both are stored on `User` and computed/backfilled on first read rather than via a migration script or scheduled job; the streak re-syncs weekly, the lifetime-points cache is instead incremented at every write site once backfilled (see [Data Model](#data-model)).
- **`SetNull` on `RecurringOccurrence.recurringChoreId`** — preserves completed occurrence history when a parent `RecurringChore` is deleted.
- **Fire-and-forget notifications** — `void sendNtfy(...)`, never awaited in a route; all errors caught inside the service (see [Notification Flow](#notification-flow)).
- **Single `User.ntfyTopic` column** — nullable + unique; per-user topic isolation is the multi-tenant boundary, `null` means silent no-op for that user.
- **Dark-only design system** — no light theme; the target audience (teens) doesn't need one, and one theme done well beats two done half-well.
- **CSRF added later, deliberately** — the original rewrite decision was "SameSite cookies, no CSRF, private network eliminates the threat"; a double-submit-cookie CSRF middleware was added afterward as a CodeQL-driven security fix (see `docs/project_notes/bugs.md`, 2026-07-08 entries) and is now load-bearing — don't remove it based on the original "private network" reasoning.
- **No Docker image publishing pipeline** — image build/tag/push to `ghcr.io` is manual today (see [CI/CD](#cicd)); the security workflow scans source, it doesn't produce or publish artifacts.
