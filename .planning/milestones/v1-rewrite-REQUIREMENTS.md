# Requirements Archive: v1-rewrite Simplified Rebuild

**Archived:** 2026-06-29
**Status:** SHIPPED

For current requirements, see `.planning/REQUIREMENTS.md`.

---

# Requirements — Chore-Ganizer Rewrite

Ground-up rewrite scoped to what a single family on a homelab actually needs.
All overengineered infrastructure removed; core chore + points loop kept clean.

---

## V1 Requirements

### AUTH — Authentication & Users

- [x] **AUTH-01**: User can log in with email/password and stay logged in across sessions
- [x] **AUTH-02**: User can log out from any page
- [x] **AUTH-03**: Parent can create a new family member account (name, email, password, role, color)
- [x] **AUTH-04**: Parent can delete a family member account _(returns 409 if user has chore history — see users.service.ts:56-93)_
- [x] **AUTH-05**: Any authenticated user can view the list of all family members
- [x] **AUTH-06**: User can edit their own profile (change password; change display color) _(color change invalidates queries — see ProfilePage.tsx:71-87)_

### CHORE — Chore Templates & Assignments

- [x] **CHORE-01**: Parent can create a reusable chore template (title, description, points, category string)
- [x] **CHORE-02**: Parent can assign a chore template to a family member with a due date
- [x] **CHORE-03**: Parent can edit a chore assignment (change due date, reassign to different user)
- [x] **CHORE-04**: Parent can delete a chore assignment
- [x] **CHORE-05**: Authenticated user can view their own assignments (filterable by status: pending/completed; filterable by date range)
- [x] **CHORE-06**: Parent can view all family assignments with the same filters
- [x] **CHORE-07**: Authenticated user can mark one of their own assignments complete; doing so awards the template's point value to their balance

### RECUR — Recurring Chores

- [x] **RECUR-01**: Parent can create a recurring chore with frequency (daily / weekly on a specific weekday / monthly on a specific day-of-month) and a fixed assigned user
- [x] **RECUR-02**: Recurring occurrences are generated lazily on demand (no background cron) when viewing upcoming assignments for a date window
- [x] **RECUR-03**: Authenticated user can complete a recurring chore occurrence; doing so awards points to their balance
- [x] **RECUR-04**: Parent can delete a recurring chore; future (incomplete) occurrences are removed; completed occurrences are preserved
- [x] **RECUR-05**: One fixed assignee per recurring chore (no round-robin, no mixed modes)

### PTS — Points

- [x] **PTS-01**: Points are credited to a user's balance automatically on chore or occurrence completion
- [x] **PTS-02**: Parent can manually adjust any user's point balance (positive or negative integer) with a required reason string
- [x] **PTS-03**: Authenticated user can view their current point balance
- [x] **PTS-04**: Authenticated user can view a simple chronological log of all point changes for their account ("+10 Wash dishes — Jun 5", "-5 Mom deducted — Jun 3")

### CAL — Calendar

- [x] **CAL-01**: Authenticated user can view a calendar displaying all family assignments by due date
- [x] **CAL-02**: Each assignment on the calendar is color-coded by the assigned family member's display color
- [x] **CAL-03**: User can navigate the calendar forward and backward by month

### DEPLOY — Deployment

- [x] **DEPLOY-01**: Running `docker compose up` from a clean clone starts the full app (backend + frontend) with no manual steps
- [x] **DEPLOY-02**: App data (SQLite database) persists across `docker compose down` / `docker compose up` cycles via a named volume or bind mount

---

## V2 Requirements (Deferred)

- [ ] **NOTIFY-01**: ntfy.sh push notifications only — triggered on: chore assigned (to recipient), chore due soon (same day), chore completed (to parent). No email, no in-app notifications.
- [ ] **MONEY-01**: Parent can set a global point conversion rate (e.g. 1 pt = €0.50); the points page displays each user's equivalent monetary value at the current rate
- [ ] **MONEY-02**: Parent can override the conversion rate per child (useful if different kids have different earning scales)

---

## Out of Scope

Items explicitly excluded with reasoning to prevent re-adding later:

| Item | Why excluded |
| ---- | ----------- |
| Prometheus metrics system | 4-user homelab; no monitoring stack; docker logs is sufficient |
| Winston structured logging | No log aggregator; console.log is identical in practice |
| Graceful shutdown middleware | docker compose restart is the shutdown; no in-flight requests to protect |
| CSRF token middleware | SameSite=Strict cookies prevent CSRF; private network eliminates the threat |
| Account lockout system | Family users on private network; password reset = parent changes it |
| Per-user request count tracking | 4 users, no bots; rate limiter already covers abuse |
| Audit logging | Role-based access prevents child destructive actions; no compliance need |
| Admin dashboard | No actionable monitoring data; if app runs, it's fine |
| Statistics/charts page | Parents know if kids are doing chores without trend lines |
| Overdue penalty automation | Parents decide penalties case-by-case; manual point adjustment covers it |
| Pocket money banking/payout scheduling | Full PointTransaction ledger; 7 transaction types; all overkill for a counter |
| Partial chore completion status | Binary (pending/complete) is sufficient; partial adds third state everywhere |
| Round-robin / mixed assignment modes | Fixed assignment handles all real family use cases |
| Nth-weekday recurrence (2nd Tuesday, last Friday) | Zero families will use this |
| Occurrence skip/unskip state | Complete or leave pending; skip adds complexity for no value |
| Recurring chore active/inactive toggle | Delete to stop; no soft-pause needed |
| Notification infrastructure (V1) | In-app notifications pointless (open the app to see chores); ntfy in V2 |
| PWA / offline support | App requires backend API; cached HTML with stale data isn't offline |
| OpenAPI / swagger-jsdoc | Solo developer who wrote the API doesn't need docs to remember it |
| Security scanning CI (CodeQL, Semgrep, Trivy) | Private homelab project with no external users |
| CI/CD image publishing to ghcr.io | Build locally on the homelab; no registry needed |
| Dependabot automation | Manual npm update when desired |
| Multi-stage Docker with PUID/PGID/gosu hardening | Single homelab host; running as root in Docker is acceptable |
| Containerized backup system (supercronic) | Host-level cron cp is sufficient |
| node-cache in-memory layer | SQLite sub-millisecond reads need no cache |
| Response compression middleware | Tiny JSON payloads; nginx handles compression if needed |
| Error webhook notifications | You are the on-call; console errors are sufficient |
| recharts dependency | No statistics page means no charts |
| Multi-family / tenant support | SQLite single-family design by intent |

---

## Traceability

| Requirement | Phase | Status |
| ----------- | ----- | ------ |
| AUTH-01 | Phase 2 — Authentication | Complete |
| AUTH-02 | Phase 2 — Authentication | Complete |
| AUTH-03 | Phase 6 — User Management + Profile | Pending |
| AUTH-04 | Phase 6 — User Management + Profile | Pending |
| AUTH-05 | Phase 6 — User Management + Profile | Pending |
| AUTH-06 | Phase 6 — User Management + Profile | Pending |
| CHORE-01 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-02 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-03 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-04 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-05 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-06 | Phase 3 — Core Chore CRUD | Complete |
| CHORE-07 | Phase 3 — Core Chore CRUD | Complete |
| RECUR-01 | Phase 4 — Recurring Chores | Pending |
| RECUR-02 | Phase 4 — Recurring Chores | Pending |
| RECUR-03 | Phase 4 — Recurring Chores | Pending |
| RECUR-04 | Phase 4 — Recurring Chores | Pending |
| RECUR-05 | Phase 4 — Recurring Chores | Pending |
| PTS-01 | Phase 5 — Points + Calendar | Pending |
| PTS-02 | Phase 5 — Points + Calendar | Pending |
| PTS-03 | Phase 5 — Points + Calendar | Pending |
| PTS-04 | Phase 5 — Points + Calendar | Pending |
| CAL-01 | Phase 5 — Points + Calendar | Pending |
| CAL-02 | Phase 5 — Points + Calendar | Pending |
| CAL-03 | Phase 5 — Points + Calendar | Pending |
| DEPLOY-01 | Phase 7 — Frontend Polish + Docker | Pending |
| DEPLOY-02 | Phase 7 — Frontend Polish + Docker | Pending |
