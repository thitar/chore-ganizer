# Research Summary — v3.1 ntfy.sh Push Notifications

**Project:** Chore-Ganizer (homelab family chore app, v3.0.0 → v3.1)
**Domain:** Self-hosted push notifications for a 4-user family chore manager
**Researched:** 2026-06-29
**Confidence:** HIGH

## Executive Summary

Chore-Ganizer v3.1 adds self-hosted ntfy.sh push notifications to an existing Express + Prisma + SQLite + React 18 stack. The integration is intentionally minimal: **3 events** (chore-assigned, chore-due-soon, chore-completed), **per-user topics** stored on the `User` table, **no per-event preferences**, and **lazy "due soon" triggers** that piggyback on existing read paths. No cron, no job queue, no new npm packages — Node 18+'s built-in `fetch` plus `AbortSignal.timeout()` covers the single HTTP POST required, and the existing `generateOccurrences` lazy-generation precedent in `recurring.service.ts` is mirrored for notification dedup.

All four research files agree on the core technical decisions (zero deps, fire-and-forget pattern, single `User.ntfyTopic` column, dedup via `dueNotifiedAt` on the assignment, server-TZ for "today", priority mapping Assigned=3/Due=4/Completed=2). The main implementation risk is **notification storms** if the lazy due-soon trigger isn't properly deduped — a user opening the app 10×/day without dedup would fire 10× the pushes. The second risk is **unhandled promise rejection** killing the Node process if a `void sendNtfy(...)` call doesn't catch its own errors. Both are addressed by the foundation phase: a per-assignment `dueNotifiedAt` timestamp + a `sendNtfy` function that catches all rejections internally.

The build is roughly 5–6 small, isolated phases, each shippable independently. Total scope: ~120 lines of new backend TypeScript, ~40 lines of new frontend, 1 env var, 2 schema columns, 1 new service, 1 new route, 1 new Profile UI section. No architectural re-thinking needed.

## Key Findings

### Recommended Stack (delta = zero)

The v3.1 stack is **the existing v3.0.0 stack unchanged** plus one new env var (`NTFY_BASE_URL`) and zero new npm packages.

**Core technologies:**
- **Native `fetch`** (Node 18+) — single HTTP POST to ntfy, no axios/node-fetch/undici needed. The `ntfy` npm package (v1.15.3) was rejected: GPL-3.0 license, ESM-only, `node>=21` required, single-maintainer, and the ntfy project itself does not recommend a Node SDK.
- **`AbortSignal.timeout(3000)`** — built-in 3-second request timeout. LAN ntfy responds in <100ms; 3s is the failure cap.
- **`console.warn`** — existing log convention; do not introduce pino/winston.
- **Module-level `isNtfyConfigured` flag** — read `process.env.NTFY_BASE_URL` once at import time, log a single warning at startup if missing, no per-request logging.

**Configuration pattern:** mirror `backend/src/config/prisma.ts` — create `backend/src/config/notifications.ts` exporting `getNtfyConfig(): { enabled, baseUrl }`.

**Service pattern:** mirror `backend/src/services/assignment.service.ts` — pure functions, no class, in `backend/src/services/notification.service.ts` (or `ntfy.service.ts`), ~60 lines including types.

### Expected Features

Four table-stakes features, zero differentiators (all differentiators explicitly out-of-scope for v3.1).

**Must have (table stakes):**
- **Per-user ntfy topic on `User` table** — `ntfyTopic String?` nullable. Topics are passwords; per-user isolation prevents cross-family leak. `null` = no notifications (graceful no-op).
- **HTTP publish with Title / Priority / Tags / Click headers** — glances well on lock screen. Headers per event: Assigned=`{title} (default/3, tags: broom,bell)`, Due Soon=`{title} (high/4, tags: warning,alarm_clock)`, Completed=`{title} (low/2, tags: white_check_mark,star)`.
- **Graceful degradation** — if `NTFY_BASE_URL` is unset OR `user.ntfyTopic` is null OR ntfy server unreachable, the call silently no-ops. Notification must NEVER block the API response.
- **Dedup for due-soon** — `dueNotifiedAt DateTime?` timestamp column on `ChoreAssignment` (and `RecurringOccurrence`). Set once per assignment per day, reset on `uncomplete`. The `dueNotifiedAt` timestamp is preferred over a `dueSoonNotified` boolean (timestamp approach lets "today" roll over automatically without a DB write).

**Should have (differentiators):** None for v3.1 — the spec is intentionally narrow.

**Defer (v2+):**
- Per-user `ntfyBaseUrl` override (env var is enough for homelab)
- Per-event toggles, quiet hours, email fallback, in-app notification center
- Test-from-settings button (use the ntfy app's built-in test)
- Notification grouping, delivery receipts, web-push for iOS Safari
- Per-user timezone (use server-TZ for v3.1)

### Architecture Approach

Service-owned side effects, route stays thin. The whole integration is: one new `notification.service.ts` module, three new `void sendNtfy(...)` call sites in existing services, and one new section in `ProfilePage.tsx`. No new architectural concepts; the v1-rewrite "service owns all business logic, controllers are thin, lazy generation on fetch" pattern is the explicit precedent (`recurring.service.generateOccurrences` is the model).

**Major components:**
1. **`backend/src/services/notification.service.ts`** (~60 lines) — exports `isNtfyConfigured` (module-level boolean), `sendNtfy(topic, title, body, opts)` (fire-and-forget, catches all errors, 3s timeout), and 3 domain wrappers (`notifyChoreAssigned`, `notifyChoreDueSoon`, `notifyChoreCompleted`).
2. **`backend/src/config/notifications.ts`** — mirrors `config/prisma.ts`; reads `NTFY_BASE_URL` once.
3. **Prisma schema additions** — `User.ntfyTopic String? @unique`; `ChoreAssignment.dueNotifiedAt DateTime?`; `RecurringOccurrence.dueNotifiedAt DateTime?`.
4. **Three trigger points in existing services** — `assignment.service.create` (assigned), `assignment.service.getAll` (lazy due-soon sweep piggybacked on `generateOccurrences`), `assignment.service.complete` + `recurring.service.completeOccurrence` (completed → all parents).
5. **One new route** — `PUT /api/users/me/ntfy-topic` for self-service topic update; any authenticated user can edit their own.
6. **One new Profile UI section** — input + "Generate random topic" button (auto-suggests `chore-{username}-{6chars}`), Save button mirroring the existing color form pattern.

### Critical Pitfalls (Top 5)

1. **Notification blocks API response** (if `await sendNtfy()` in a route) — single dependency failure cascades into total chore-feature outage. **Prevention:** `void sendNtfy(...)` fire-and-forget, errors caught inside the service.
2. **Unhandled promise rejection kills Node** (one unreachable ntfy = full app crash loop). **Prevention:** `sendNtfy` catches all rejections internally; never let a raw `fetch` escape the module.
3. **No fetch timeout → 75s hang** (SYN packet to half-up ntfy container). **Prevention:** `AbortSignal.timeout(3000)` on every call.
4. **Notification storm from lazy due-soon trigger** (user reloads page 10×, fires 10× notifications). **Prevention:** `dueNotifiedAt` timestamp; one `updateMany` per sweep, not per-row.
5. **Concurrent due-soon double-fire** (dad opens phone + laptop at 8:01am, both GETs see same un-notified state). **Prevention:** wrap the notification fire + `dueNotifiedAt` update in a `prisma.$transaction` with conditional check (re-read + update only if still null).

Additional MUST-priority pitfalls: log the missing-config warning **once at startup** (not per-request) via module-level guard; enforce **`@unique` on `User.ntfyTopic`** to prevent cross-user topic collision; **Zod-validate topic format** as `^[-_A-Za-z0-9]{12,64}$` (12-char minimum because topic = access token); **Click URL as relative path** (`/chores/123`) not absolute (avoids leaking internal hostname to lock screen).

## Implications for Roadmap

Based on research, the build order is forced by data dependencies. Each phase is a small, isolated, shippable change.

### Phase 1: Foundation — `notification.service.ts` + `config/notifications.ts` + `.env.example`

**Rationale:** Zero blast radius. The `sendNtfy` function is pure (env + topic string → HTTP POST). Can be merged and deployed without affecting any user-visible behavior. Establishes the fire-and-forget pattern + 3s timeout + once-only warning that every later phase reuses.
**Delivers:** `backend/src/services/notification.service.ts`, `backend/src/config/notifications.ts`, updated `.env.example`, unit tests at `backend/src/__tests__/services/notification.service.test.ts`.
**Addresses:** STACK (native fetch, AbortSignal.timeout, module-level guard); PITFALLS 1, 2, 3, 9, 14.
**Avoids:** Pitfalls 1, 2, 3, 9 (foundation decisions).

### Phase 2: Schema + User topic field + self-service route + Profile UI

**Rationale:** The `User.ntfyTopic` field must land before any code reads it. Phase 1 is independent because `sendNtfy` is a pure function. Co-locating the route + Profile UI in this phase means the user-visible self-service is in place by the time the first event fires in Phase 3.
**Delivers:**
- `prisma/schema.prisma` — add `User.ntfyTopic String? @unique`, `ChoreAssignment.dueNotifiedAt DateTime?`, `RecurringOccurrence.dueNotifiedAt DateTime?`
- `users.service.updateNtfyTopic(userId, topic | null)` — new function (Zod validates `^[-_A-Za-z0-9]{12,64}$` or empty → null)
- `backend/src/schemas/users.schema.ts` — Zod schema for the body
- `backend/src/routes/users.routes.ts` — `PUT /api/users/me/ntfy-topic`
- `frontend/src/api/users.api.ts` — `updateNtfyTopic(topic)` mirroring `updateColor`
- `frontend/src/pages/ProfilePage.tsx` — new "Notifications" section with input + "Generate random topic" button
**Addresses:** FEATURES TS-1; PITFALLS 6, 12, 14.
**Avoids:** Pitfall 6 (weak topic), Pitfall 12 (cross-user topic collision), Pitfall 8 (document stale-topic behavior in help text).

### Phase 3: Wire up `assignment.service.create` → chore-assigned

**Rationale:** First end-to-end smoke test of the integration. Lowest-risk event (fires once per parent action, single recipient). Validates the `void sendNtfy` pattern with real data before adding the more complex due-soon and parent-fan-out logic.
**Delivers:**
- `assignment.service.create` — add `prisma.user.findUnique` to fetch recipient's topic, then `void sendNtfy(...)` after `choreAssignment.create` returns
- Tests in `assignment.service.test.ts` — assert `sendNtfy` called once with right args; assert no throw on `sendNtfy` rejection
**Addresses:** FEATURES TS-2 (Event 1); PITFALLS 4, 7.
**Avoids:** Pitfall 4 (fire after DB commit, not in transaction), Pitfall 7 (priority 3, not 4 — Assigned is informational).

### Phase 4: Wire up `complete` + `completeOccurrence` → chore-completed

**Rationale:** Same `void sendNtfy` pattern, just different recipient selection (all parents, not single recipient). Two completion paths (one-off assignment + recurring occurrence) covered together because the logic is identical.
**Delivers:**
- `assignment.service.complete` — `prisma.user.findMany({ where: { role: 'PARENT' } })` + loop of `void sendNtfy(parent.ntfyTopic, ...)`
- `recurring.service.completeOccurrence` — same pattern
- Tests for both: assert `sendNtfy` called for each parent topic; assert no throw
**Addresses:** FEATURES TS-2 (Event 3); PITFALLS 10.
**Avoids:** Pitfall 10 (priority 2 / low — no sound, no vibration, parents get many of these).

### Phase 5: Wire up "due soon" lazy sweep in `assignment.service.getAll`

**Rationale:** Most complex of the three events (idempotency, two row types, lazy trigger, concurrent-request dedup). Putting it last lets Phases 3–4 validate the ntfy module + `void sendNtfy` pattern first. This is the only phase that touches the existing `getAll` call signature.
**Delivers:**
- `assignment.service.getAll` — new internal `notifyDueSoonIfNeeded(assignments, occurrences)` after `generateOccurrences`:
  - Filter to: `status === 'PENDING'` AND `dueDate` is today (server-TZ) AND `dueNotifiedAt` is null
  - For each candidate: `void sendNtfy(...)` then conditional update in transaction (re-read + update only if still null — prevents concurrent double-fire)
  - One `prisma.choreAssignment.updateMany` for all sent at end (per-row is wasteful)
- `assignment.service.uncomplete` — reset `dueNotifiedAt = null`
- Tests: due-soon fires for today's assignments, does not re-fire on next fetch, respects `dueNotifiedAt` flag, does not throw on ntfy failure
**Addresses:** FEATURES TS-2 (Event 2); PITFALLS 4, 5, 11.
**Avoids:** Pitfall 4 (storm from repeated fetches), Pitfall 5 (concurrent double-fire), Pitfall 11 (server-TZ).

### Phase 6 (optional): E2E smoke test

**Rationale:** Real ntfy server is not available in CI. Use `http.createServer` as a fake ntfy in `e2e/notifications.spec.ts`. Low priority — unit + integration coverage from Phases 1–5 is sufficient for "did the right code path fire."
**Delivers:** `e2e/notifications.spec.ts` — stub ntfy endpoint, walk through Profile → set topic → create assignment → assert POST was made.
**Addresses:** PITFALLS 13.

### Phase Ordering Rationale

- **Phase 1 is zero-blast-radius** — can be merged and deployed without touching any user data or existing route. Establishes the foundational fire-and-forget + timeout + once-only-warning pattern that every later phase reuses. Must come first.
- **Phase 2 introduces the schema** — must land before any code reads `ntfyTopic` or `dueNotifiedAt`. Co-locating the route + Profile UI in Phase 2 means the user-visible configuration surface is in place by Phase 3's first event.
- **Phases 3–4–5 are independent events sharing the same `void sendNtfy` pattern** — ordering by complexity (assigned → completed → due-soon) means each phase reuses the previous one's testing approach and validates the integration end-to-end before adding the more complex lazy-sweep semantics. This is the established SPIDR pattern: walk the simplest path first, accumulate confidence.
- **Phase 6 is optional** — the docker-compose test environment cannot reach a real ntfy server. Unit + integration tests already cover the wire format and call patterns.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (due-soon sweep)** — concurrent dedup via Prisma `$transaction` + conditional update is non-trivial; verify the exact Prisma 5.22 + SQLite syntax during `plan-phase`. The pattern is `findMany` → for each, `prisma.$transaction([update({ where: { id, dueNotifiedAt: null }, data: { dueNotifiedAt: new Date() } })])` and check `count`.
- **Phase 2 (Profile UI)** — small but verify the auto-generated topic format meets the 12-char minimum (`chore-` + username + 6 random alphanumeric = 12+ chars); the existing color form pattern (ProfilePage.tsx:74–88, 141–154) is the template to copy.

Phases with standard patterns (skip research-phase):
- **Phase 1 (foundation)** — ntfy.sh publish API is well-documented at `docs.ntfy.sh/publish/`; `AbortSignal.timeout()` is a Node built-in. No external library decisions to make.
- **Phase 3 (chore-assigned)** — single `prisma.user.findUnique` + `void sendNtfy(...)` is identical to existing `generateOccurrences` call pattern in the same service. Existing mock-at-prisma test pattern covers it.
- **Phase 4 (chore-completed)** — `prisma.user.findMany({ where: { role: 'PARENT' } })` + loop is a Prisma trivial; existing test infrastructure covers the loop semantics.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Native `fetch` + `AbortSignal.timeout` verified against Node docs; alternatives (`ntfy` npm pkg, `node-fetch`, `axios` backend, `undici` direct) each rejected with concrete reason. |
| Features | HIGH | 4 table-stakes features are all verified against ntfy.sh official docs (https://docs.ntfy.sh/publish/). Priority + tag recommendations adapted from v1-archive (production-tested). |
| Architecture | HIGH | Integration points (assignment.service.ts:5 create, :42 getAll, :125 complete; recurring.service.ts) verified against current source. Service-owned side effects matches the established thin-controller pattern. |
| Pitfalls | HIGH | All 12 critical pitfalls sourced from official ntfy docs, Node.js globals docs, current Prisma schema, and v1-archive's security-reviewed `validateNtfyServerUrl`. |

**Overall confidence:** HIGH

### Gaps to Address

- **`NTFY_BASE_URL` self-host setup** — the developer still needs to deploy ntfy separately and configure `auth-default-access: deny-all` + per-user ACL. Not in v3.1 code scope, but the README needs a "Self-hosting ntfy" section. **Handle:** add a one-page README section during Phase 2.
- **iOS subscription UX** — ntfy iOS app is newer than Android; tag rendering and click handling may differ. Worth a 5-minute manual test on iOS before declaring Phase 6 done. **Handle:** add to Phase 6 manual test checklist.
- **Concurrent dedup on SQLite** — the `$transaction` + conditional update pattern is the consensus recommendation, but Prisma + SQLite doesn't have native `UPDATE ... RETURNING`. The implementation (re-read inside transaction, update only if still null) needs a careful unit test for the race. **Handle:** Phase 5 plan-phase research flag.
- **`User.ntfyTopic` @unique + kid collision** — if a kid picks a topic another family member is already using, the Zod check on the PUT route catches it (409), but the kid gets a vague error. The "Generate random topic" button in Phase 2 prevents this in practice; the error message should be friendly anyway. **Handle:** Phase 2 implementation note.

## Sources

### Primary (HIGH confidence)
- **ntfy.sh publish API** — https://docs.ntfy.sh/publish/ (Title, Priority, Tags, Click, X-Sequence-ID headers; topic name rules `[-_A-Za-z0-9]{1,64}`; "topic is essentially a password")
- **ntfy.sh emoji shortcodes** — https://docs.ntfy.sh/emojis/ (`clipboard` 📋, `bell` 🔔, `warning` ⚠️, `alarm_clock` ⏰, `white_check_mark` ✔️, `star` ⭐)
- **Node.js globals** — https://nodejs.org/api/globals.html#fetch (fetch stable since v21, available in v18+; `AbortSignal.timeout()` since v17.3)
- **MDN AbortController** — abort semantics, signal flow
- **`backend/prisma/schema.prisma`** — current User / ChoreAssignment / RecurringOccurrence models
- **`backend/src/services/assignment.service.ts`** — existing service pattern, lazy `generateOccurrences` precedent (line 42)
- **`backend/src/services/recurring.service.ts`** — TZ-naive date pattern to match
- **`backend/src/__tests__/services/assignment.service.test.ts:1–26`** — mock-at-prisma test pattern
- **`frontend/src/pages/ProfilePage.tsx:74–88, 141–154`** — color form pattern for the ntfy topic section
- **`.planning/PROJECT.md`** — NOTIFY-01..07 requirements; v1-rewrite "lazy generation, no cron" decision

### Secondary (MEDIUM confidence)
- **`backend-v1-archive/src/services/ntfy.service.ts`** (205 lines) — reference implementation; `validateNtfyServerUrl` SSRF guard (lines 41–85), `NotificationPriorities` map (ASSIGNED=3, DUE_SOON=4, COMPLETED=2), `NotificationTags` map. Production-tested in v1.
- **`.claude/skills/notify-tester/SKILL.md`** — existing test/curl patterns for ntfy

---
*Research completed: 2026-06-29*
*Ready for roadmap: yes*
