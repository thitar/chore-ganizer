# Roadmap: Chore-Ganizer (v1-rewrite)

## Milestones

- ✅ **v2.1.10 Codebase Health & Quality** — Phases 1-4 (shipped 2026-05-02)
- ✅ **v2.2.0 Admin Dashboard** — Phases 5-10 (shipped 2026-05-03)
- ⏸ **v2.3.0 Production Readiness** — Phases 11-14 (superseded by rewrite)
- ✅ **v1-rewrite Simplified Rebuild** — Phases 1-8 (shipped 2026-06-29)

> **Note:** v2.3.0 is superseded. The ground-up rewrite in `backend-v2/` + `frontend-v2/` replaces further work on the old codebase. Old phases (1-14) are preserved in git history.

## Phases

<details>
<summary>✅ v2.1.10 Codebase Health &amp; Quality (Phases 1-4) — SHIPPED 2026-05-02</summary>

- [x] Phase 1: Foundation & Cleanup (4/4 plans)
- [x] Phase 2: Prisma Modernization (2/2 plans)
- [x] Phase 3: Architecture & Performance (4/4 plans)
- [x] Phase 4: Test Coverage & Gates (3/3 plans)

</details>

<details>
<summary>✅ v2.2.0 Admin Dashboard (Phases 5-10) — SHIPPED 2026-05-03</summary>

- [x] Phase 5: Backend Foundations (3/3 plans)
- [x] Phase 6: Admin Backend Service (1/1 plan)
- [x] Phase 7: Routes, Controllers & Auth (1/1 plan)
- [x] Phase 8: Backend Tests (2/2 plans)
- [x] Phase 9: Frontend Components (2/2 plans)
- [x] Phase 10: Frontend Page & Integration (2/2 plans)

</details>

---

### ✅ v1-rewrite: Simplified Rebuild (SHIPPED 2026-06-29)

**Milestone Goal:** Replace the 200+ file overengineered codebase with a clean, right-sized app under 50 source files that any family member can open and use without DevOps knowledge. Built TDD alongside the existing app; old app runs throughout; switch happens only when all phases pass.

**Phase Numbering (rewrite):** Phases use fresh integer labels 1–8, scoped to this milestone only. The progress table below tracks rewrite phases separately.

- [x] **Phase 1: Scaffold** — Project structure, build pipeline, Prisma schema, and seed data; zero features
- [x] **Phase 2: Authentication** — Login, logout, session, role middleware, and login page
- [x] **Phase 3: Core Chore CRUD** — Templates and assignments: create, edit, delete, complete, filters (completed 2026-06-28)
- [x] **Phase 4: Recurring Chores** — Daily/weekly/monthly patterns, lazy occurrence generation, fixed assignment (completed 2026-06-28)
- [x] **Phase 5: Points + Calendar** — Point balance, manual adjustments, adjustment log, calendar view (completed 2026-06-29)
- [x] **Phase 6: User Management + Profile** — Parent creates/deletes users; self-service password and color (completed 2026-06-29)
- [x] **Phase 7: Frontend Polish + Docker** — All pages complete, error/loading states, mobile layout, docker compose (completed 2026-06-29)
- [x] **Phase 8: Switchover** — Archive old codebase, rename v2 directories, verify clean start (completed 2026-06-29)

## Phase Details

### Phase 1: Scaffold

**Goal**: Empty but working project structure with build pipeline, Prisma schema, and seeded database — zero features, all scaffolding verified
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure phase — no V1 features delivered here)
**Success Criteria** (what must be TRUE):

1. `backend-v2/` and `frontend-v2/` directories exist with correct package.json, tsconfig, and test configs
2. `npm test` passes in `backend-v2/` including scaffold tests (health endpoint responds, DB connects, seed users exist)
3. Prisma schema has all 5 models; `npx prisma studio` shows 4 seeded users (2 parents, 2 children)
4. `npm run dev` starts backend on 3010 and frontend Vite on 5173 without errors

**Plans**: 2 plans

Plans:

- [x] 01-01-PLAN.md — Backend scaffold: project config, Prisma schema + seed, Express app shell, health endpoint, scaffold tests
- [x] 01-02-PLAN.md — Frontend scaffold: project config, Vite + React + Tailwind setup, app shell, scaffold tests

### Phase 2: Authentication

**Goal**: Users can log in with email/password, stay logged in across sessions, and log out — role-based access enforced
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):

1. User submits valid email/password on the login page and is redirected to the dashboard
2. Refreshing the browser keeps the user logged in (session persists)
3. User clicks logout from any page and is returned to the login page with session cleared
4. A CHILD user hitting a PARENT-only API endpoint receives 403
5. All unit and integration tests for auth service, middleware, and routes pass

**Plans**: 4 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Backend auth service, middleware, and routes (TDD)
- [x] 02-03-PLAN.md — Backend auth hardening: session regeneration, ghost session guard, cookie cleanup
- [x] 02-04-PLAN.md — Frontend auth edge cases: query cache clearance, error type discrimination, dashboard trim

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Frontend login page, auth context, protected routes

**UI hint**: yes

### Phase 3: Core Chore CRUD

**Goal**: Parents can create, assign, edit, and delete chore assignments; anyone can view and complete their own chores
**Depends on**: Phase 2
**Requirements**: CHORE-01, CHORE-02, CHORE-03, CHORE-04, CHORE-05, CHORE-06, CHORE-07
**Success Criteria** (what must be TRUE):

1. Parent creates a chore template and assigns it to a child with a due date — assignment appears in the child's chore list
2. Child completes an assignment — status changes to COMPLETED and the template's point value is added to the child's balance
3. Parent edits an assignment's due date or reassigns it to a different user — change persists
4. Parent deletes an assignment — it disappears from all lists; the template is not deleted
5. Parent filters assignments by user, status (pending/completed), and date range — only matching results appear
6. Child attempting to create or delete an assignment via API receives 403

**Plans**: 7 plans

Plans:
**Wave 0** *(foundation — schema, validation, database)*

- [x] 03-01-PLAN.md — Prisma schema changes (PointLog, pointsAwarded), zod install, validator middleware, db push

**Wave 1** *(backend TDD — parallel)*

- [x] 03-02-PLAN.md — ChoreTemplate CRUD service + routes (TDD)
- [x] 03-03-PLAN.md — ChoreAssignment CRUD + complete/uncomplete service + routes (TDD)

**Wave 2** *(frontend data layer + shared components — parallel)*

- [x] 03-04-PLAN.md — Frontend API layer (templates.api.ts, assignments.api.ts) + React Query hooks
- [x] 03-05-PLAN.md — Shared components: NavBar extraction, FilterBar, StatusBadge, ConfirmDelete

**Wave 3** *(frontend pages — parallel)*

- [x] 03-06-PLAN.md — TemplatesPage + MyChoresPage
- [x] 03-07-PLAN.md — AssignmentsPage + Dashboard enhancements + App.tsx routes

**UI hint**: yes

### Phase 4: Recurring Chores

**Goal**: Parents create daily/weekly/monthly recurring chores with fixed assignment; occurrences appear on demand with no background cron
**Depends on**: Phase 3
**Requirements**: RECUR-01, RECUR-02, RECUR-03, RECUR-04, RECUR-05
**Success Criteria** (what must be TRUE):

1. Parent creates a daily recurring chore assigned to a child — today's occurrence appears in the child's list without any manual trigger
2. Parent creates a weekly chore (e.g., every Monday) — occurrence appears on Mondays, not on other days
3. Parent creates a monthly chore (e.g., day 15) — occurrence appears on the 15th only
4. Child completes a recurring occurrence — the child's point balance increases by the template's point value
  5. Parent deletes a recurring chore — future (incomplete) occurrences are removed; already-completed occurrences are preserved

**Plans**: 5 plans

Plans:
**Wave 0** *(foundation — schema, seed)*

- [x] 04-01-PLAN.md — Schema simplification (single assignee), pointsAwarded on RecurringOccurrence, seed update, db push

**Wave 1** *(backend TDD — parallel)*

- [x] 04-02-PLAN.md — RecurringChore service + routes (create, delete, lazy generation, complete occurrence) — TDD
- [x] 04-03-PLAN.md — Merge occurrences into GET /api/assignments response with type discriminator

**Wave 2** *(frontend — parallel)*

- [x] 04-04-PLAN.md — Frontend API, hooks, RecurringChoresPage, NavBar link, App.tsx route

**Wave 3** *(integration)*

- [x] 04-05-PLAN.md — Wire type discriminator through completion flow, update MyChoresPage, full test suite verification

**UI hint**: yes

### Phase 5: Points + Calendar

**Goal**: Users can see their point balance and adjustment history; the full family calendar shows all assignments by date with user colors
**Depends on**: Phase 4
**Requirements**: PTS-01, PTS-02, PTS-03, PTS-04, CAL-01, CAL-02, CAL-03
**Success Criteria** (what must be TRUE):

1. User's point balance increases automatically when a chore or occurrence is completed (no manual action needed)
2. Parent manually adds or deducts points from any user with a reason — balance updates immediately
3. User views their point balance and a chronological log showing each change with amount, reason, and date
4. Calendar page loads showing all family assignments on their due dates, each color-coded by the assigned user's display color
5. User clicks previous/next month arrows — calendar navigates and shows assignments for that month

**Plans**: TBD
**UI hint**: yes

### Phase 6: User Management + Profile

**Goal**: Parent can create and delete family member accounts; any user can change their own password and display color
**Depends on**: Phase 2
**Requirements**: AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):

1. Parent creates a new family member account (name, email, password, role, color) — account appears in the user list immediately
2. Parent deletes a family member account — account is removed from the user list
3. Any authenticated user can view the list of all family members
4. User changes their own password — old password no longer works, new password authenticates successfully
5. User changes their display color — the new color is reflected on their assignments in the calendar and chore list

**Plans**: TBD
**UI hint**: yes

### Phase 7: Frontend Polish + Docker

**Goal**: All 7 pages are fully functional with proper error/loading states, mobile layout, and a single `docker compose up` starts the full app
**Depends on**: Phase 6
**Requirements**: DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):

1. `docker compose up --build -d` from a clean clone starts both backend and frontend containers with no manual steps
2. App data persists across `docker compose down && docker compose up` cycles — users and chores survive restarts
3. All pages display a loading state while data fetches and an error message if the API call fails
4. All pages are readable and all buttons are tappable on a phone-sized viewport (375px)
5. Dashboard shows a summary of the logged-in user's upcoming chores

**Plans**: TBD
**UI hint**: yes

### Phase 8: Switchover

**Goal**: Archive the old codebase, rename v2 directories to production paths, and verify the simplified app runs as the one true version
**Depends on**: Phase 7
**Requirements**: None (cleanup phase — all V1 features already delivered)
**Success Criteria** (what must be TRUE):

1. `backend/` and `frontend/` directories contain the simplified rewrite code (not the old codebase)
2. `backend-v1-archive/` and `frontend-v1-archive/` exist and are clearly marked deprecated
3. Root `docker-compose.yml` points to the new paths and `docker compose up` starts the app cleanly
4. A family member can log in, see their chores, complete one, and see their points increase — full end-to-end flow works

**Plans**: TBD

## Progress

**Execution Order (rewrite):**
Phases execute sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Note: Phase 6 (User Management) depends on Phase 2 (Auth), not Phase 5. It can be implemented in parallel with Phase 5 if parallelization is enabled, but the default sequential order delivers it after Phase 5 for a clean flow.

| Phase                                | Milestone  | Plans Complete | Status      | Completed  |
| ------------------------------------ | ---------- | -------------- | ----------- | ---------- |
| 1. Foundation & Cleanup              | v2.1.10    | 4/4            | Complete    | 2026-05-02 |
| 2. Prisma Modernization              | v2.1.10    | 4/4 | Complete   | 2026-05-23 |
| 3. Architecture & Performance        | v2.1.10    | 7/7 | Complete   | 2026-05-23 |
| 4. Test Coverage & Gates             | v2.1.10    | 3/3            | Complete    | 2026-05-02 |
| 5. Backend Foundations               | v2.2.0     | 3/3            | Complete    | 2026-05-03 |
| 6. Admin Backend Service             | v2.2.0     | 1/1            | Complete    | 2026-05-03 |
| 7. Routes, Controllers & Auth        | v2.2.0     | 1/1            | Complete    | 2026-05-03 |
| 8. Backend Tests                     | v2.2.0     | 2/2            | Complete    | 2026-05-03 |
| 9. Frontend Components               | v2.2.0     | 2/2            | Complete    | 2026-05-03 |
| 10. Frontend Page & Integration      | v2.2.0     | 2/2            | Complete    | 2026-05-03 |
| rewrite-1. Scaffold                  | v1-rewrite | 2/2            | ✅ Complete | 2026-05-22 |
| rewrite-2. Authentication            | v1-rewrite | 4/4            | ✅ Complete | 2026-05-23 |
| rewrite-3. Core Chore CRUD           | v1-rewrite | 7/7            | ✅ Complete | 2026-06-28 |
| rewrite-4. Recurring Chores          | v1-rewrite | 5/5            | ✅ Complete | 2026-06-28 |
| rewrite-5. Points + Calendar         | v1-rewrite | 4/4            | ✅ Complete | 2026-06-29 |
| rewrite-6. User Mgmt + Profile       | v1-rewrite | 3/3            | ✅ Complete | 2026-06-29 |
| rewrite-7. Frontend Polish + Docker  | v1-rewrite | 2/2            | ✅ Complete | 2026-06-29 |
| rewrite-8. Switchover                | v1-rewrite | 1/1            | ✅ Complete | 2026-06-29 |
