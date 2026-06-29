# Chore-Ganizer (Rewrite)

## Current Milestone: v3.1 Notifications (ntfy.sh)

**Goal:** Add ntfy.sh push notifications so family members get a push when chores are assigned, due soon, or completed — using a self-hosted ntfy server and per-user topics.

**Target features:**
- Each user configures their own ntfy topic in their profile (parent sets it for kids, kids set their own)
- Chore assigned → push to recipient's topic
- Chore due soon (same day) → push to recipient's topic
- Chore completed → push to parent's topic(s)
- `NTFY_BASE_URL` env var (no default — must be set in `.env`); missing config gracefully degrades (no notifications, no errors)

## What This Is

A right-sized family chore management app where parents assign chores with points, kids complete them to earn points, and parents can track the family's progress. Built as a homelab-first, single-family app with no public exposure — prioritizing simplicity over enterprise features. The v3.0.0 rewrite replaced an over-engineered version that had accumulated SaaS-grade infrastructure for a 4-person family; the rewrite is now the production codebase at `backend/` and `frontend/`, with the legacy code preserved in `backend-v1-archive/` and `frontend-v1-archive/`.

## Core Value

Any family member can open the app, see their chores for today, and complete them — without the app requiring a devops engineer to maintain.

## Requirements

### Validated (v3.0.0 — shipped 2026-06-29)

#### Auth & Users

- ✓ **AUTH-01**: User can log in with email/password and stay logged in across sessions — v1-rewrite
- ✓ **AUTH-02**: User can log out from any page — v1-rewrite
- ✓ **AUTH-03**: Parent can create family member accounts — v1-rewrite
- ✓ **AUTH-04**: Parent can delete family member accounts — v1-rewrite (returns 409 with informative message if user has FK refs)
- ✓ **AUTH-05**: User can view all family members — v1-rewrite
- ✓ **AUTH-06**: User can edit their own profile (change password and color) — v1-rewrite (color change invalidates `['users']` + `['auth','me']`)

#### Chores

- ✓ **CHORE-01**: Parent can create reusable chore templates (title, points, category as string) — v1-rewrite
- ✓ **CHORE-02**: Parent can assign a chore template to a family member with a due date — v1-rewrite
- ✓ **CHORE-03**: Parent can edit a chore assignment (due date, reassign to different user) — v1-rewrite
- ✓ **CHORE-04**: Parent can delete a chore assignment — v1-rewrite
- ✓ **CHORE-05**: User can view their own assignments (filterable by status, date range) — v1-rewrite
- ✓ **CHORE-06**: Parent can view all family assignments (same filters) — v1-rewrite
- ✓ **CHORE-07**: User can mark a chore assignment complete (awards template points) — v1-rewrite

#### Recurring Chores

- ✓ **RECUR-01**: Parent can create a recurring chore (daily, weekly on a specific weekday, monthly on a specific day) — v1-rewrite
- ✓ **RECUR-02**: Occurrences generate on demand when viewing upcoming chores (lazy, not cron) — v1-rewrite
- ✓ **RECUR-03**: User can complete a recurring chore occurrence (awards points) — v1-rewrite
- ✓ **RECUR-04**: Parent can delete a recurring chore (clears future occurrences, keeps completed ones) — v1-rewrite
- ✓ **RECUR-05**: Fixed assignment only (one user per recurring chore) — v1-rewrite

#### Points

- ✓ **PTS-01**: Points are awarded automatically when a chore or occurrence is completed — v1-rewrite
- ✓ **PTS-02**: Parent can manually adjust a user's points (positive or negative) with a reason — v1-rewrite
- ✓ **PTS-03**: User can view their current point balance — v1-rewrite
- ✓ **PTS-04**: User can view a simple point adjustment log — v1-rewrite

#### Calendar

- ✓ **CAL-01**: User can view a calendar showing all family assignments by due date — v1-rewrite
- ✓ **CAL-02**: Calendar assignments are color-coded by family member — v1-rewrite
- ✓ **CAL-03**: User can navigate to previous and next months — v1-rewrite

#### Deployment

- ✓ **DEPLOY-01**: `docker compose up` starts the full app from a clean clone — v1-rewrite
- ✓ **DEPLOY-02**: Data persists across container restarts via volume mount — v1-rewrite

### Active (v3.1 — Notifications)

#### Notifications (ntfy.sh)

- [ ] **NOTIFY-01**: Per-user ntfy topic stored on User profile; settable in Profile page
- [ ] **NOTIFY-02**: Backend fires `chore-assigned` notification to recipient's ntfy topic on assignment create
- [ ] **NOTIFY-03**: Backend fires `chore-due-soon` notification to recipient's ntfy topic when an assignment is due today
- [ ] **NOTIFY-04**: Backend fires `chore-completed` notification to assigned-to user's parent(s) topic when an assignment is completed
- [ ] **NOTIFY-05**: `NTFY_BASE_URL` env var configures the ntfy server; missing/empty config disables notifications gracefully (no errors, log a warning once at startup)
- [ ] **NOTIFY-06**: Notification delivery failures are logged but never block the API response
- [ ] **NOTIFY-07**: "Due soon" trigger runs on app load + on demand when viewing calendar/chore list (lazy, no cron)

### V2 (Deferred)

- [ ] **MONEY-01**: Parent can set a global point conversion rate (e.g. 1 pt = €0.50); points page shows equivalent value
- [ ] **MONEY-02**: Parent can configure a per-child conversion rate override if needed

### Out of Scope

- Prometheus metrics / observability — no traffic worth monitoring for 4 users
- CSRF protection — SameSite cookies cover the actual threat model on a private network
- Audit logging — parent/child roles prevent destructive actions; no forensics needed
- Admin dashboard — no actionable monitoring data for a homelab
- Statistics/charts — parents know if kids are doing chores without trend lines
- Overdue penalty automation — parents adjust points manually when appropriate
- Notification infrastructure in V1 — ntfy in V2 only
- Pocket money banking/payout scheduling — conversion rate display only, in V2
- Round-robin assignment modes — fixed assignment is sufficient
- Nth-weekday recurrence patterns (2nd Tuesday, last Friday)
- PWA / offline support — app requires backend; offline caching is a lie
- OpenAPI/Swagger documentation — you wrote the API, you don't need docs to remember it
- Account lockout system — homelab, private network, family users
- Per-user rate limit tracking — 4 users, not bots
- Winston structured logging — `console.log` is sufficient for `docker logs`
- node-cache layer — SQLite sub-ms reads need no cache
- Response compression middleware — nginx handles it if needed
- Multi-stage Docker with PUID/PGID/gosu hardening — running as root on homelab is fine
- CI/CD Docker image publishing to ghcr.io — build locally, deploy locally
- Dependabot — `npm update` when you feel like it
- Security scanning CI (CodeQL, Semgrep, Trivy) — private homelab project
- Multi-family / tenant support — SQLite single-family by design
- Mobile native apps — responsive web is sufficient

## Context

Shipped v1-rewrite on 2026-06-29. All 27 V1 requirements delivered. The legacy codebase (`backend/` + `frontend/` under the old paths) has been archived to `backend-v1-archive/` + `frontend-v1-archive/`; the rewrite is now at the canonical `backend/` and `frontend/` paths, and `docker-compose.yml` points to those. TDD throughout (Jest + Vitest + Playwright E2E): 162 backend + 81 frontend + 51 E2E = 294 tests passing.

Codebase size post-rewrite: 86,490 LOC of TypeScript across `backend/` and `frontend/`. Five less-complex patterns compared to the legacy:
- No swagger-jsdoc / OpenAPI generation
- No CSRF middleware (SameSite cookies)
- No Winston structured logging
- No rate-limit / per-user tracking
- No node-cache layer
- No response compression middleware

Key analysis documents in root (still relevant for context on what was removed):

- `REFACTOR.MD` — full audit of what was overengineered and why
- `REWRITE.MD` — architecture target and original 7-phase plan

## Constraints

- **Tech Stack**: Express + TypeScript + Prisma/SQLite (backend), React + Vite + Tailwind (frontend)

- **Deployment**: Docker Compose on homelab, single-instance, no registry

- **Network**: Private home network — no public internet exposure

- **Scale**: 4–6 family members, near-zero concurrent traffic

## Key Decisions

| Decision | Rationale | Outcome |
| -------- | --------- | ------- |
| Rewrite not refactor | 200+ files with cascading imports; refactor means weeks of broken intermediate state; rewrite is likely faster | ✓ Good — rewrite shipped in 38 days with full test coverage |
| Build alongside, switch at end | Old app keeps running during dev; switch docker-compose.yml in Phase 7/8 | ✓ Good — legacy preserved in `*-v1-archive/` for rollback |
| Points integer + simple log | Drop PointTransaction banking; add lightweight PointLog for transparency | ✓ Good — `PointLog` table covers all 7 original transaction types without banking complexity |
| Lazy occurrence generation | No cron; generate recurring occurrences on demand when viewing upcoming period | ✓ Good — eliminates cron job, simplifies deployment |
| SameSite cookies, no CSRF | Private network eliminates the actual threat; removes entire middleware chain | ✓ Good — fewer deps, no CSRF regression bugs in tests |
| Profile self-service | Kids change password + color themselves; all other user mgmt is parent-only | ✓ Good — kids feel ownership, parents don't get password-reset requests |
| v2.3.0 Production Readiness superseded | Rewrite replaces further work on the old codebase | ✓ Good — focused engineering effort on one codebase |

## Evolution

This document evolves at phase transitions and milestone boundaries.

### After each phase transition (via `/gsd-transition`)

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

### After each milestone (via `/gsd-complete-milestone`)

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

Last updated: 2026-06-29 after v3.1 milestone (Notifications) initialization
