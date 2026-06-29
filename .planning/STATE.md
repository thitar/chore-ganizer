---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Notifications
current_phase: 09
current_phase_name: foundation
status: executing
stopped_at: Phase 9 context gathered
last_updated: "2026-06-29T19:55:29.504Z"
last_activity: 2026-06-29
last_activity_desc: Phase 09 execution started
progress:
  total_phases: 13
  completed_phases: 0
  total_plans: 3
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 after v3.1 milestone init)

**Core value:** Any family member can open the app, see their chores for today, and complete them — without the app requiring a devops engineer to maintain.
**Current focus:** Phase 09 — foundation

## Current Position

Phase: 09 (foundation) — EXECUTING
Plan: 1 of 2
Status: Executing Phase 09
Last activity: 2026-06-29 — Phase 09 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed (all milestones): 41 (v2.1.10: 13, v2.2.0: 11, v1-rewrite: 27 across 8 phases; v2.3.0 superseded)
- Average duration: — (not tracked per-plan)
- Total execution time: v1-rewrite ~38 days (2026-05-22 → 2026-06-29)

**By Phase (v1-rewrite):**

| Phase          | Plans | Status     |
| -------------- | ----- | ---------- |
| rewrite-1 Scaffold | 2/2 | ✅ Complete |
| rewrite-2 Auth | 4/4 | ✅ Complete |
| rewrite-3 CRUD | 7/7 | ✅ Complete |
| rewrite-4 Recurring | 5/5 | ✅ Complete |
| rewrite-5 Points+Cal | 4/4 | ✅ Complete |
| rewrite-6 User Mgmt | 3/3 | ✅ Complete |
| rewrite-7 Polish+Docker | 2/2 | ✅ Complete |
| rewrite-8 Switchover | 1/1 | ✅ Complete |

**By Phase (v3.1):** 0/5 — see ROADMAP.md

**Test totals:** 162 backend + 81 frontend + 51 E2E = 294 passing (pre-v3.1 baseline).

**Recent Trend:** v3.0.0 (rewrite) shipped on schedule. v3.1 research complete with HIGH confidence — zero new npm deps, fire-and-forget pattern, lazy due-soon sweep.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1-rewrite]: Rewrite not refactor — 200+ files with cascading imports; rewrite is faster
- [v1-rewrite]: Build alongside existing app in backend-v2/ + frontend-v2/; switch docker-compose.yml at Phase 8
- [v1-rewrite]: Lazy occurrence generation — no cron, generate on demand when viewing upcoming period
- [v1-rewrite]: SameSite cookies, no CSRF — private network eliminates the actual threat
- [v1-rewrite]: Points as integer + simple log — drop PointTransaction banking, lightweight PointLog only
- [v1-rewrite]: v2.3.0 Production Readiness superseded — rewrite replaces further work on old codebase
- [v1-rewrite/phase-04]: SetNull preserves completed occurrences when parent RecurringChore is deleted (history-preserving)
- [v1-rewrite/phase-04]: Type discriminator (REGULAR | RECURRING) routes frontend completion to correct API endpoint
- [v3.1]: Native `fetch` + `AbortSignal.timeout(3000)` for ntfy HTTP — zero new npm deps; rejected `ntfy` npm pkg (GPL-3.0, ESM-only, node>=21)
- [v3.1]: Fire-and-forget `void sendNtfy(...)` pattern — never `await` in a route, all errors caught inside the service
- [v3.1]: Lazy "due-soon" sweep piggybacks on `assignment.service.getAll` after `generateOccurrences` — mirrors the existing lazy-generation precedent, no cron
- [v3.1]: Single `User.ntfyTopic` column, nullable + `@unique` — per-user topic isolation is the multi-tenant boundary; `null` = silent no-op
- [v3.1]: `dueNotifiedAt DateTime?` on `ChoreAssignment` + `RecurringOccurrence` — preferred over boolean for automatic day-rollover; concurrent-dedup via conditional `prisma.$transaction`
- [v3.1]: Ntfy topic Zod-validated as `^[-_A-Za-z0-9]{12,64}$` — 12-char minimum because topic is an access token
- [v3.1]: Click header is relative path `/chores/{id}` (not absolute URL) — avoids leaking internal hostname to lock screen

### Pending Todos

None yet.

### Blockers/Concerns

None — v3.0.0 (rewrite) switchover complete (commit 38feb91), legacy archived in `backend-v1-archive/` + `frontend-v1-archive/`. v3.1 self-hosting of ntfy server is out of code scope (developer ops task, not in ROADMAP).

## Deferred Items

| Category  | Item                                        | Status                | Deferred At |
| --------- | ------------------------------------------- | --------------------- | ----------- |
| feature   | API Rate Limiting Visibility (admin UI)     | MISSING_FEATURES.md   | v2.1.10     |
| test      | recurrence.service.ts edge case tests       | MISSING_FEATURES.md   | v2.1.10     |
| milestone | v2.3.0 Production Readiness (phases 11-14) | Superseded by rewrite | v2.3.0      |
| feature   | Recurring chore edit (currently create+delete only) | Future polish phase | v1-rewrite  |
| feature   | Round-robin / mixed assignment modes        | Future (RECUR-05 fixed only) | v1-rewrite  |
| feature   | Recurring chore uncomplete                  | Future (not in RECUR scope) | v1-rewrite  |
| feature   | Bulk create recurring chores                | Future (out of RECUR scope) | v1-rewrite  |
| feature   | Custom recurrence rules (RRULE)             | Future (out of RECUR scope) | v1-rewrite  |
| feature   | Per-user ntfyBaseUrl override               | Out of scope (env var is enough) | v3.1       |
| feature   | Per-event notification toggles              | Out of scope (not in NOTIFY-01..08) | v3.1       |
| feature   | In-app notification center                  | Out of scope (ntfy push only) | v3.1       |
| feature   | Email / Slack / Discord fallback channels   | Out of scope (ntfy is the only channel) | v3.1       |

## Phase 4 Artifacts (v1-rewrite reference)

- `04-CONTEXT.md` — Phase context and decisions
- `04-UI-SPEC.md` — UI design contract
- `04-01-PLAN.md` ... `04-05-PLAN.md` — Implementation plans
- `04-01-SUMMARY.md` ... `04-05-SUMMARY.md` — Implementation summaries
- `04-RESEARCH.md` — Research notes
- `04-SECURITY.md` — STRIDE threat verification (10/10 closed)
- `04-VALIDATION.md` — Nyquist validation (5/5 RECUR covered, 0 gaps)
- `04-UAT.md` — User acceptance testing
- `04-VERIFICATION.md` — Goal-backward verification (PASS)

## Archived Milestones

- `v2.1.10` (Codebase Remediation) — `.planning/milestones/v2.1.10-ROADMAP.md`
- `v2.2.0` (Admin Dashboard) — see MILESTONES.md
- `v1-rewrite` / v3.0.0 (Simplified Rebuild) — `.planning/milestones/v1-rewrite-ROADMAP.md`

## Operator Next Steps

- Run `/gsd-discuss-phase 9` then `/gsd-plan-phase 9` to plan the Foundation phase (notification.service + config + schema migration)

## Session

**Last session:** 2026-06-29T16:51:06.110Z
**Stopped at:** Phase 9 context gathered
**Resume file:** .planning/phases/09-foundation/09-CONTEXT.md
