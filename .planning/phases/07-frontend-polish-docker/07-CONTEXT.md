# Phase 7: Frontend Polish + Docker - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Final polish pass: ensure all 7 pages have proper loading/error states, mobile-responsive layouts, and the docker-compose.yml starts the full app with a single command.

This phase delivers: Loading/empty/error state audit across all pages, mobile layout fixes (Tailwind responsive classes), docker-compose.yml updates pointing to backend-v2 + frontend-v2, docker-entrypoint.sh scripts for both.

</domain>

<decisions>
## Implementation Decisions

### Loading/Error/Empty States
- **D-01:** All 7 pages must have: loading spinner, error state with retry, empty state with helpful message
- **D-02:** Loading: centered spinner with descriptive text ("Loading chores...", "Loading calendar...")
- **D-03:** Error: red panel with "Try again" button that reloads
- **D-04:** Empty: centered text with helpful guidance (e.g., "Complete a chore to start earning points!")

### Mobile Layout
- **D-05:** All pages use Tailwind responsive classes (sm:, md:, lg:) to adapt to mobile (375px) viewport
- **D-06:** Tables on mobile: either stack rows vertically OR use horizontal scroll wrapper
- **D-07:** Forms on mobile: full-width inputs, stacked fields
- **D-08:** NavBar on mobile: collapsible hamburger menu (future polish — Phase 7 uses horizontal scroll for now)
- **D-09:** Calendar on mobile: smaller day cells, still 7-column grid

### Docker
- **D-10:** Update root `docker-compose.yml` to point to `backend-v2` and `frontend-v2` directories
- **D-11:** Frontend Dockerfile builds with placeholder API URL, envsubst at runtime
- **D-12:** Backend Dockerfile uses multi-stage build (deps + build + runtime)
- **D-13:** `docker-entrypoint.sh` runs as root, adjusts UID/GID if PUID/PGID set, runs `prisma db push`, seeds if empty, drops to appuser via gosu
- **D-14:** Default credentials auto-seeded: dad@home.local, mom@home.local, alice@home.local, bob@home.local (password: password123)
- **D-15:** Single command startup: `docker compose up --build -d` from clean clone
- **D-16:** Data persists across `docker compose down && docker compose up` via DATA_DIR volume

### Build & Run
- **D-17:** Backend port 3010, frontend port 3002 (or 5173 for dev)
- **D-18:** No external services required (SQLite embedded)
- **D-19:** Health endpoint at `/api/health` for monitoring

### Pages Inventory
- **D-20:** All 7 pages: Login, Dashboard, My Chores, Templates, Recurring Chores, Assignments, Points, Calendar, Users, Profile
- **D-21:** Most already have loading/error/empty states (from previous phases) — verify and fix any gaps

### Specific Polish Items
- **D-22:** All buttons must be tappable on mobile (min 44x44px touch target)
- **D-23:** Forms: clear validation feedback (red text below field)
- **D-24:** Success messages: auto-dismiss after 3s (already established pattern)
- **D-25:** Color contrast: ensure WCAG AA on all text

### Existing Code Dependencies
- **D-26:** All pages from Phases 2-6 are already in place
- **D-27:** AGENTS.md describes the docker setup pattern
- **D-28:** Phase 1 docker scripts exist in the rewrite (backend-v2/) — reuse pattern

### the agent's Discretion
- Exact mobile breakpoint values (sm/md/lg defaults work for most cases)
- Whether to add a hamburger menu (out of scope; horizontal scroll for now)
- Final wording of empty state messages
- Specific docker image size optimizations
- Whether to use docker-compose.v2 syntax or v1 (v2 is modern)

</decisions>

<canonical_refs>
## Canonical References

### Project References
- `.planning/ROADMAP.md` §Phase 7 — Frontend Polish + Docker goal, success criteria
- `.planning/REQUIREMENTS.md` — DEPLOY-01, DEPLOY-02 requirements
- `AGENTS.md` — Docker setup pattern (backend + frontend)

### Codebase
- All 7+ pages from Phases 2-6
- `docker-compose.yml` (root) — current setup pointing to old app
- `docker-compose.staging.yml` — staging config
- `docker-compose.sh` — helper script
- `docker-entrypoint.sh` — backend entrypoint pattern

</canonical_refs>

