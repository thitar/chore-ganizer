---
gsd_state_version: 1.0
milestone: v3.2.0
milestone_name: Teen Appeal Redesign
current_phase: 14
current_phase_name: M2 The Game
status: Milestone v3.2.0 complete — Phase 14 (M2 The Game) shipped via PR #146
last_updated: "2026-07-09T11:24:43.000Z"
last_activity: 2026-07-09
last_activity_desc: Phase 14 (M2 The Game) squash-merged to main (12572b0) via PR #146 — milestone v3.2.0 complete, all 15 review findings across 3 passes resolved or explicitly deferred
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-29 after v3.1 milestone init)

**Core value:** Any family member can open the app, see their chores for today, and complete them — without the app requiring a devops engineer to maintain.
**Current focus:** Milestone v3.2.0 Teen Appeal Redesign — COMPLETE. Both Phase 13 (M1 "The Look") and Phase 14 (M2 "The Game") shipped to main.

## Current Position

Phase: 14 — M2 "The Game" (backend streaks, levels, badges) — COMPLETE
Plan: docs/superpowers/plans/2026-07-07-m2-the-game.md (11 tasks — all done, including PR/merge/tag)
Spec: docs/superpowers/specs/2026-07-04-frontend-redesign-design.md (Milestone 2 section)
Branch: feature/m2-the-game — merged to main via PR #146 (squash commit 12572b0), safe to delete
Status: Milestone v3.2.0 complete — both phases shipped. Tag v3.2.0 next.
Last activity: 2026-07-09 — PR #146 merged after three review passes (two by Claude Code, one independent pass by Hermes); post-merge doc sync and milestone closeout.

**Phase 14 (M2 "The Game") — COMPLETE, merged to main:** weekly streaks (lazy, cached on User), levels from lifetime EARNED+BONUS points (10 thresholds), 8-badge catalog with UserBadge table + fire-and-forget ntfy award on chore completion, level-up/badge-earned toast+confetti, CSRF protection (double-submit cookie) added alongside as a CodeQL-driven security fix. Backend 247 tests passing (was 213), frontend 106 tests passing (was 98), both typecheck clean, frontend build clean. Verified live: login/logout/points-adjust/chore-completion CSRF flow, real ntfy badge push delivered to a live topic, mobile-viewport (390×844) visual pass on Dashboard/Points/Profile — all confirmed via Playwright against an isolated throwaway DB, production containers untouched throughout. Deviation from spec: used existing Toast+confetti instead of a new level-up modal (recorded in plan's self-review notes). Deferred (see issues.md 2026-07-09 entry): gamification read-path duplicate queries, `SESSION_SECRET` fallback hardening, `MyChoresPage` duplicate-key bug (unrelated pre-existing issue found during verification).

**Phase 13 (M1 "The Look") — COMPLETE:** dark design system, UI primitives, motion components, TopNav/BottomTabBar/AppShell, leaderboard endpoint + UI, all 10 pages restyled, legacy NavBar removed. Deferred minors (from PR #142 description): CountUp backward-jump on rapid value changes, ProgressRing reduced-motion CSS gate, ProtectedRoute dedicated tests, E2E selector validation.

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

**By Phase (v3.1):** 6/6 plans shipped across 4 phases — see ROADMAP.md
| Phase 9 | 2/2 | ✅ Shipped | 2026-07-04
| Phase 10 | 2/2 | ✅ Shipped | 2026-07-04
| Phase 11 | 1/1 | ✅ Shipped | 2026-07-04
| Phase 12 | 1/1 | ✅ Shipped | 2026-07-04 |

**Test totals:** 162 backend + 81 frontend + 51 E2E = 294 passing (pre-v3.1 baseline).

**Recent Trend:** v3.0.0 (rewrite) shipped on schedule. v3.1 research complete with HIGH confidence — zero new npm deps, fire-and-forget pattern, lazy due-soon sweep.
| Phase 10 P02 | 4min | 2 tasks | 3 files |

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
- [v3.2]: Dark-only design system (no light theme) — one theme done well; teens are the audience
- [v3.2]: Two milestones — M1 visual redesign + frontend-computable gamification first, M2 backend streaks/levels/badges after kid feedback
- [v3.2]: Fonts self-hosted via @fontsource (Inter + Space Grotesk) — private network, no CDN
- [v3.2]: `GET /api/points/leaderboard` is family-visible to all authenticated roles — intentional exception to child-own-data rule
- [v3.2]: No framer-motion — CSS transitions + canvas-confetti only, keep bundle small

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

- Start the next milestone with /gsd-new-milestone
