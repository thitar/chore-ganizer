# Structure — Directory Layout and Organization

Complete directory tree, key file locations, naming conventions, and configuration reference for Chore-Ganizer.

---

## Directory Tree (Top 3 Levels)

```
chore-ganizer/                         # Repo root
├── .github/
│   └── workflows/
│       └── security.yml               # Only CI workflow (CodeQL, audit, gitleaks, semgrep, trivy)
├── backend/                            # Express API server
│   ├── data/                           # SQLite DB location (mounted volume in Docker)
│   ├── dist/                           # Compiled TypeScript output (tsc build)
│   ├── prisma/
│   │   ├── schema.prisma               # Database model (single source of truth)
│   │   ├── seed.ts                     # Dev seed script (4 users, 4 templates, sample data)
│   │   └── dev.db                      # SQLite database file (dev)
│   ├── src/
│   │   ├── __tests__/                  # Jest unit tests
│   │   │   ├── middleware/             # Middleware tests
│   │   │   ├── services/              # Service tests
│   │   │   ├── app.test.ts            # App-level tests
│   │   │   ├── assignments.test.ts    # Route-level tests
│   │   │   ├── points.test.ts
│   │   │   ├── recurring.test.ts
│   │   │   ├── templates.test.ts
│   │   │   └── users.test.ts
│   │   ├── config/                    # Singletons
│   │   │   ├── prisma.ts              # PrismaClient instance
│   │   │   └── notifications.ts       # ntfy configuration
│   │   ├── middleware/                 # Express middleware
│   │   │   ├── auth.ts                # authenticate + authorize
│   │   │   ├── csrf.ts                # Double-submit cookie CSRF
│   │   │   ├── errorHandler.ts        # AppError + global error handler
│   │   │   ├── rateLimiter.ts         # express-rate-limit (general + auth)
│   │   │   └── validator.ts           # Zod schema validation middleware
│   │   ├── routes/                    # Express route handlers
│   │   │   ├── __tests__/             # Route-level tests
│   │   │   ├── index.ts              # Route aggregator (mounts all sub-routers)
│   │   │   ├── health.routes.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── templates.routes.ts
│   │   │   ├── assignments.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── recurring.routes.ts
│   │   │   ├── occurrences.routes.ts
│   │   │   └── points.routes.ts
│   │   ├── schemas/                   # Zod validation schemas
│   │   │   ├── assignment.schema.ts
│   │   │   ├── points.schema.ts
│   │   │   └── template.schema.ts
│   │   ├── services/                  # Business logic
│   │   │   ├── assignment.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── gamification.service.ts
│   │   │   ├── notification.formatters.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── points.service.ts
│   │   │   ├── recurring.service.ts
│   │   │   ├── template.service.ts
│   │   │   └── users.service.ts
│   │   ├── types/                     # TypeScript declarations
│   │   │   └── express-session.d.ts   # Session augmentation (userId, role)
│   │   ├── app.ts                     # Express app construction + middleware registration
│   │   └── server.ts                  # HTTP server bootstrap + graceful shutdown
│   ├── Dockerfile                     # Multi-stage build (Node 20 Alpine)
│   ├── docker-entrypoint.sh           # Runtime entrypoint
│   ├── jest.config.js                 # Jest configuration (ts-jest)
│   ├── package.json
│   └── tsconfig.json
├── frontend/                           # React SPA
│   ├── dist/                           # Vite build output
│   ├── public/                         # Static assets (if any)
│   ├── src/
│   │   ├── __tests__/                  # Vitest unit tests
│   │   │   ├── AssignmentsPage.test.tsx
│   │   │   ├── CalendarPage.test.tsx
│   │   │   ├── DashboardPage.test.tsx
│   │   │   ├── gamification-ui.test.tsx
│   │   │   ├── Leaderboard.test.tsx
│   │   │   ├── motion.test.tsx
│   │   │   ├── MyChoresPage.test.tsx
│   │   │   ├── PointsPage.test.tsx
│   │   │   ├── ProfilePage.test.tsx
│   │   │   ├── RecurringChoresPage.test.tsx
│   │   │   ├── scaffold.test.tsx
│   │   │   ├── TemplatesPage.test.tsx
│   │   │   ├── TopNav.test.tsx
│   │   │   ├── ui.test.tsx
│   │   │   └── UsersPage.test.tsx
│   │   ├── api/                        # Axios API modules (one per domain)
│   │   │   ├── assignments.api.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── calendar.api.ts
│   │   │   ├── points.api.ts
│   │   │   ├── recurring.api.ts
│   │   │   ├── templates.api.ts
│   │   │   └── users.api.ts
│   │   ├── components/                 # Shared components
│   │   │   ├── ui/                    # Design-system primitives
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── CountUp.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── PageError.tsx
│   │   │   │   ├── PageHeader.tsx
│   │   │   │   ├── PageLoading.tsx
│   │   │   │   ├── ProgressRing.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   └── Toast.tsx
│   │   │   ├── AppShell.tsx           # Layout wrapper (TopNav + content + BottomTabBar + GamificationMoments)
│   │   │   ├── BadgeGrid.tsx          # Badge display grid
│   │   │   ├── BottomTabBar.tsx       # Mobile bottom navigation
│   │   │   ├── ConfirmDelete.tsx      # Delete confirmation UI
│   │   │   ├── FilterBar.tsx          # Status/user/date filter controls
│   │   │   ├── GamificationMoments.tsx # Level-up/badge toast + confetti
│   │   │   ├── Leaderboard.tsx        # Ranked points display
│   │   │   ├── LevelBar.tsx           # Level progress bar
│   │   │   ├── ProtectedRoute.tsx     # Auth + role gate wrapper
│   │   │   ├── StatusBadge.tsx        # Pending/Completed/Overdue badge
│   │   │   └── TopNav.tsx             # Desktop top navigation
│   │   ├── hooks/                      # TanStack Query hooks
│   │   │   ├── useAssignments.tsx
│   │   │   ├── useAuth.tsx            # Also exports AuthProvider context
│   │   │   ├── useCalendar.tsx
│   │   │   ├── useDismissableMenu.ts  # UI utility (not data)
│   │   │   ├── usePoints.tsx
│   │   │   ├── useRecurringChores.tsx
│   │   │   ├── useTemplates.tsx
│   │   │   └── useUsers.tsx
│   │   ├── lib/                        # Infrastructure utilities
│   │   │   ├── apiClient.ts           # createApiClient() factory
│   │   │   ├── celebrate.ts           # canvas-confetti wrapper
│   │   │   └── csrf.ts               # CSRF interceptor for axios
│   │   ├── pages/                      # Route page components
│   │   │   ├── AssignmentsPage.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MyChoresPage.tsx
│   │   │   ├── PointsPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── RecurringChoresPage.tsx
│   │   │   ├── TemplatesPage.tsx
│   │   │   └── UsersPage.tsx
│   │   ├── test/
│   │   │   └── setup.ts              # Vitest setup (jest-dom + cleanup)
│   │   ├── utils/                      # Pure utility functions
│   │   │   ├── a11y.ts               # prefersReducedMotion()
│   │   │   ├── assignmentKey.ts       # Composite key for REGULAR/RECURRING
│   │   │   └── dateFormat.ts          # Date formatting helpers
│   │   ├── App.tsx                     # Route definitions
│   │   ├── main.tsx                    # React root + providers
│   │   └── index.css                   # Tailwind + custom component classes
│   ├── Dockerfile                      # Multi-stage build (Node → nginx)
│   ├── docker-entrypoint.sh
│   ├── index.html                      # Vite HTML entry
│   ├── nginx.conf.template             # nginx config with envsubst
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.node.json
├── e2e/                                 # Playwright end-to-end tests
│   ├── .auth/                          # Saved browser storage states
│   ├── helpers/
│   │   ├── auth.ts                     # login() helper (replays storage state)
│   │   ├── csrf.ts                     # CSRF helper for API calls
│   │   └── nav.ts                      # Navigation helpers
│   ├── screenshots/                    # Test screenshots
│   ├── auth.setup.ts                   # Auth setup project (one login per user)
│   ├── playwright.config.ts            # Full suite config
│   ├── playwright.uat.config.ts        # UAT subset config
│   ├── tsconfig.json
│   ├── m1-the-look.spec.ts
│   ├── m2-the-game.spec.ts
│   ├── path-a-regression.spec.ts
│   ├── phase-04-uat.spec.ts
│   ├── phase-05-points-happy-path.spec.ts
│   ├── phase-05-uat.spec.ts
│   ├── phase-06-uat.spec.ts
│   ├── phase-07-uat.spec.ts
│   ├── phase-10-uat.spec.ts
│   └── uat-checklist.spec.ts
├── docs/                                # Documentation
│   ├── ARCHITECTURE.md                  # High-level system design
│   ├── OPERATIONS.md                    # Running, deploying, troubleshooting
│   ├── DOCKER-CONFIGURATION.md
│   ├── FUTURE-ROADMAP.md
│   ├── NTFY-SETUP-GUIDE.md
│   ├── PRODUCTION-INSTALLATION.md
│   ├── USER-GUIDE.md
│   ├── UAT-CHECKLIST.md
│   ├── UAT-RESULTS.md
│   ├── README.md
│   ├── archive/                         # Historical docs
│   ├── project_notes/                   # Memory system (bugs, decisions, key_facts, issues)
│   └── superpowers/                     # Implementation plans
├── .planning/                           # Historical planning docs (GSD workflow)
│   ├── codebase/                        # This directory
│   ├── intel/
│   ├── milestones/
│   ├── phases/
│   ├── research/
│   └── reviews/
├── test/                                # Root-level test utilities (if any)
├── AGENTS.md                            # Agent-specific conventions
├── CHANGELOG.md
├── CLAUDE.md
├── README.md
├── docker-compose.yml                   # Docker Compose definition
├── docker-compose.sh                    # Helper script
├── package.json                         # Root package.json (Playwright only)
└── package-lock.json
```

---

## Key File Locations by Concern

### Backend Routes
| File | Path | Mount |
|------|------|-------|
| Route aggregator | `backend/src/routes/index.ts` | `/api` |
| Health check | `backend/src/routes/health.routes.ts` | `/api/health` |
| Auth (login/logout/me) | `backend/src/routes/auth.routes.ts` | `/api/auth` |
| Templates (CRUD) | `backend/src/routes/templates.routes.ts` | `/api/templates` |
| Assignments (CRUD + complete) | `backend/src/routes/assignments.routes.ts` | `/api/assignments` |
| Users (CRUD + profile) | `backend/src/routes/users.routes.ts` | `/api/users` |
| Recurring chores (CRUD) | `backend/src/routes/recurring.routes.ts` | `/api/recurring` |
| Occurrences (complete) | `backend/src/routes/occurrences.routes.ts` | `/api/occurrences` |
| Points (balance + adjust) | `backend/src/routes/points.routes.ts` | `/api/points` |

### Backend Services
| File | Path |
|------|------|
| Auth | `backend/src/services/auth.service.ts` |
| Assignments | `backend/src/services/assignment.service.ts` |
| Templates | `backend/src/services/template.service.ts` |
| Users | `backend/src/services/users.service.ts` |
| Recurring chores | `backend/src/services/recurring.service.ts` |
| Points | `backend/src/services/points.service.ts` |
| Gamification (levels, streaks, badges) | `backend/src/services/gamification.service.ts` |
| Notifications (ntfy) | `backend/src/services/notification.service.ts` |
| Notification message formatting | `backend/src/services/notification.formatters.ts` |

### Backend Schemas (Zod)
| File | Path | Used by |
|------|------|---------|
| Assignment schemas | `backend/src/schemas/assignment.schema.ts` | `assignments.routes.ts` |
| Points schemas | `backend/src/schemas/points.schema.ts` | `points.routes.ts` |
| Template schemas | `backend/src/schemas/template.schema.ts` | `templates.routes.ts` |

### Frontend API Modules
| File | Path | Base URL |
|------|------|----------|
| Auth | `frontend/src/api/auth.api.ts` | `/api/auth` |
| Assignments | `frontend/src/api/assignments.api.ts` | `/api/assignments` |
| Templates | `frontend/src/api/templates.api.ts` | `/api/templates` |
| Users | `frontend/src/api/users.api.ts` | `/api/users` |
| Recurring chores | `frontend/src/api/recurring.api.ts` | `/api/recurring` + `/api/occurrences` |
| Points | `frontend/src/api/points.api.ts` | `/api/points` |
| Calendar | `frontend/src/api/calendar.api.ts` | `/api/assignments` |

### Frontend Hooks
| File | Path | Query keys |
|------|------|------------|
| Auth context + hook | `frontend/src/hooks/useAuth.tsx` | `['auth', 'me']` |
| Assignments | `frontend/src/hooks/useAssignments.tsx` | `['assignments']` |
| Templates | `frontend/src/hooks/useTemplates.tsx` | `['templates']` |
| Users | `frontend/src/hooks/useUsers.tsx` | `['users']` |
| Recurring chores | `frontend/src/hooks/useRecurringChores.tsx` | `['recurring-chores']` |
| Points (multiple) | `frontend/src/hooks/usePoints.tsx` | `['points', 'me']`, `['points', 'leaderboard']`, `['points', 'gamification']` |
| Calendar | `frontend/src/hooks/useCalendar.tsx` | `['calendar', year, month]` |
| Menu dismiss | `frontend/src/hooks/useDismissableMenu.ts` | (no queries) |

### Frontend Pages
| File | Path | Route | Role |
|------|------|-------|------|
| Login | `frontend/src/pages/LoginPage.tsx` | `/login` | Public |
| Dashboard | `frontend/src/pages/DashboardPage.tsx` | `/` | Any auth |
| My Chores | `frontend/src/pages/MyChoresPage.tsx` | `/my-chores` | Any auth |
| Points | `frontend/src/pages/PointsPage.tsx` | `/points` | Any auth |
| Calendar | `frontend/src/pages/CalendarPage.tsx` | `/calendar` | Any auth |
| Profile | `frontend/src/pages/ProfilePage.tsx` | `/profile` | Any auth |
| Templates | `frontend/src/pages/TemplatesPage.tsx` | `/templates` | PARENT |
| Recurring Chores | `frontend/src/pages/RecurringChoresPage.tsx` | `/recurring-chores` | PARENT |
| Assignments | `frontend/src/pages/AssignmentsPage.tsx` | `/assignments` | PARENT |
| Users | `frontend/src/pages/UsersPage.tsx` | `/users` | PARENT |

### Frontend Components
| File | Path | Purpose |
|------|------|---------|
| AppShell | `frontend/src/components/AppShell.tsx` | Layout: TopNav + main + BottomTabBar + GamificationMoments |
| ProtectedRoute | `frontend/src/components/ProtectedRoute.tsx` | Auth + role gate |
| TopNav | `frontend/src/components/TopNav.tsx` | Desktop navigation + Manage dropdown |
| BottomTabBar | `frontend/src/components/BottomTabBar.tsx` | Mobile tab bar + Manage sheet |
| GamificationMoments | `frontend/src/components/GamificationMoments.tsx` | Level-up/badge celebration toast + confetti |
| Leaderboard | `frontend/src/components/Leaderboard.tsx` | Ranked points list |
| LevelBar | `frontend/src/components/LevelBar.tsx` | Level progress bar |
| BadgeGrid | `frontend/src/components/BadgeGrid.tsx` | Badge catalog grid |
| StatusBadge | `frontend/src/components/StatusBadge.tsx` | Pending/Completed/Overdue pill |
| FilterBar | `frontend/src/components/FilterBar.tsx` | Status/user/date filters |
| ConfirmDelete | `frontend/src/components/ConfirmDelete.tsx` | Delete confirmation UI |

### Frontend UI Primitives (Design System)
| File | Path |
|------|------|
| Avatar | `frontend/src/components/ui/Avatar.tsx` |
| Button | `frontend/src/components/ui/Button.tsx` |
| Card | `frontend/src/components/ui/Card.tsx` |
| CountUp | `frontend/src/components/ui/CountUp.tsx` |
| EmptyState | `frontend/src/components/ui/EmptyState.tsx` |
| PageError | `frontend/src/components/ui/PageError.tsx` |
| PageHeader | `frontend/src/components/ui/PageHeader.tsx` |
| PageLoading | `frontend/src/components/ui/PageLoading.tsx` |
| ProgressRing | `frontend/src/components/ui/ProgressRing.tsx` |
| Skeleton | `frontend/src/components/ui/Skeleton.tsx` |
| StatCard | `frontend/src/components/ui/StatCard.tsx` |
| Toast | `frontend/src/components/ui/Toast.tsx` |

### Frontend Lib / Utils
| File | Path | Purpose |
|------|------|---------|
| API client factory | `frontend/src/lib/apiClient.ts` | `createApiClient()` — builds axios instances with CSRF interceptor |
| CSRF interceptor | `frontend/src/lib/csrf.ts` | Reads XSRF-TOKEN cookie, sets x-xsrf-token header |
| Celebrate | `frontend/src/lib/celebrate.ts` | canvas-confetti wrapper (respects prefers-reduced-motion) |
| A11y | `frontend/src/utils/a11y.ts` | `prefersReducedMotion()` |
| Assignment key | `frontend/src/utils/assignmentKey.ts` | Composite key for REGULAR/RECURRING items |
| Date format | `frontend/src/utils/dateFormat.ts` | `formatDateLabel()`, `formatDateStatus()`, `formatDueDate()` |

---

## Naming Conventions

### Files and Directories

| Location | Convention | Examples |
|----------|-----------|---------|
| Backend routes | `<resource>.routes.ts` | `auth.routes.ts`, `assignments.routes.ts` |
| Backend services | `<resource>.service.ts` | `auth.service.ts`, `assignment.service.ts` |
| Backend schemas | `<resource>.schema.ts` | `assignment.schema.ts`, `points.schema.ts` |
| Backend middleware | `<name>.ts` | `auth.ts`, `csrf.ts`, `errorHandler.ts` |
| Backend config | `<name>.ts` | `prisma.ts`, `notifications.ts` |
| Backend types | `<name>.d.ts` | `express-session.d.ts` |
| Backend tests | `<name>.test.ts` in `__tests__/` | `app.test.ts`, `csrf.test.ts` |
| Backend service tests | `<name>.test.ts` in `__tests__/services/` | `assignment.service.test.ts` |
| Frontend API | `<domain>.api.ts` | `auth.api.ts`, `assignments.api.ts` |
| Frontend hooks | `use<Domain>.tsx` | `useAuth.tsx`, `useAssignments.tsx` |
| Frontend pages | `<Name>Page.tsx` | `DashboardPage.tsx`, `LoginPage.tsx` |
| Frontend components | `<Name>.tsx` | `AppShell.tsx`, `Leaderboard.tsx` |
| Frontend UI primitives | `<Name>.tsx` in `ui/` | `Button.tsx`, `Card.tsx` |
| Frontend utils | `<name>.ts` | `dateFormat.ts`, `assignmentKey.ts` |
| Frontend lib | `<name>.ts` | `apiClient.ts`, `csrf.ts`, `celebrate.ts` |
| Frontend tests | `<Name>.test.tsx` in `__tests__/` | `DashboardPage.test.tsx`, `ui.test.tsx` |
| E2E specs | `<name>.spec.ts` | `uat-checklist.spec.ts`, `m1-the-look.spec.ts` |
| E2E helpers | `<name>.ts` in `helpers/` | `auth.ts`, `csrf.ts`, `nav.ts` |

### Exports

- **Backend services**: Named exports (exported functions, not default exports). Files import as `import * as authService from '../services/auth.service'`.
- **Backend routes**: Default export (`export default router`).
- **Backend middleware**: Named exports (`export function authenticate`, `export function validate`).
- **Frontend components**: Named exports (`export function DashboardPage`).
- **Frontend hooks**: Named exports (`export function useAuth`).
- **Frontend API modules**: Named exports for each function and interface. No default exports.
- **Frontend UI primitives**: Named exports (`export function Button`).
- **Frontend utils/lib**: Named exports.

### Data Flow Naming

- Backend response envelope: `{ success, data, error }` — consistent across all endpoints
- Frontend API modules unwrap `response.data.data` to return just the payload
- Frontend hooks expose `isLoading` (not `loading`), `isCreating`/`isUpdating`/`isDeleting` (not `pending`)

---

## Configuration File Locations

### Backend
| File | Path | Purpose |
|------|------|---------|
| TypeScript config | `backend/tsconfig.json` | Compilation options |
| Jest config | `backend/jest.config.js` | Test runner config (ts-jest, node env) |
| Prisma schema | `backend/prisma/schema.prisma` | Database model |
| Package manifest | `backend/package.json` | Dependencies, scripts, version |
| Environment | `backend/.env` | Local env vars (gitignored) |
| Environment template | `backend/.env.example` | Documented env vars |

### Frontend
| File | Path | Purpose |
|------|------|---------|
| TypeScript config | `frontend/tsconfig.json` | App compilation |
| TypeScript config (node) | `frontend/tsconfig.node.json` | Vite node config |
| Vite config | `frontend/vite.config.ts` | Build tool + dev server proxy |
| Vitest config | `frontend/vitest.config.ts` | Test runner config |
| Tailwind config | `frontend/tailwind.config.js` | Custom theme (dark-only: bg, surface, accent colors) |
| PostCSS config | `frontend/postcss.config.js` | Tailwind + autoprefixer |
| Package manifest | `frontend/package.json` | Dependencies, scripts, version |
| HTML entry | `frontend/index.html` | Vite HTML entry point |
| CSS entry | `frontend/src/index.css` | Tailwind directives + custom component classes |
| Environment | `frontend/.env` | Local env vars (gitignored) |

### Root
| File | Path | Purpose |
|------|------|---------|
| Root package.json | `package.json` | Playwright e2e tooling only (independent version) |
| Docker Compose | `docker-compose.yml` | Full stack definition |
| Docker Compose helper | `docker-compose.sh` | Shell script wrapper |
| CI workflow | `.github/workflows/security.yml` | CodeQL, audit, gitleaks, semgrep, trivy |
| Agent conventions | `AGENTS.md` | AI agent-specific patterns and gotchas |

### Docker
| File | Path | Purpose |
|------|------|---------|
| Backend Dockerfile | `backend/Dockerfile` | Multi-stage build (Node 20 Alpine) |
| Backend entrypoint | `backend/docker-entrypoint.sh` | Runtime startup script |
| Frontend Dockerfile | `frontend/Dockerfile` | Multi-stage build (Node → nginx) |
| Frontend entrypoint | `frontend/docker-entrypoint.sh` | Runtime startup script |
| nginx config template | `frontend/nginx.conf.template` | nginx config with envsubst variables |

---

## Test File Locations and Patterns

### Backend Unit Tests (Jest)

```
backend/src/__tests__/
├── middleware/
│   └── csrf.test.ts                    # CSRF middleware tests
├── services/
│   ├── assignment.service.test.ts
│   ├── gamification.service.test.ts
│   ├── notification.formatters.test.ts
│   ├── notification.service.test.ts
│   ├── points.service.test.ts
│   ├── recurring.service.test.ts
│   ├── template.service.test.ts
│   └── users.service.test.ts
├── app.test.ts                         # App-level tests
├── assignments.test.ts                 # Route-level tests
├── points.test.ts
├── recurring.test.ts
├── templates.test.ts
└── users.test.ts
```

**Pattern**: Each test file uses `jest.mock()` to mock `../../config/prisma` with inline mock implementations. No shared mock helper exists. Run with `cd backend && npm test`.

### Frontend Unit Tests (Vitest)

```
frontend/src/__tests__/
├── AssignmentsPage.test.tsx
├── CalendarPage.test.tsx
├── DashboardPage.test.tsx
├── gamification-ui.test.tsx
├── Leaderboard.test.tsx
├── motion.test.tsx
├── MyChoresPage.test.tsx
├── PointsPage.test.tsx
├── ProfilePage.test.tsx
├── RecurringChoresPage.test.tsx
├── scaffold.test.tsx
├── TemplatesPage.test.tsx
├── TopNav.test.tsx
├── ui.test.tsx
└── UsersPage.test.tsx
```

**Pattern**: Each test file uses `vi.mock()` to mock API modules. Renders with `@testing-library/react`. Setup in `frontend/src/test/setup.ts` (jest-dom matchers + cleanup). Run with `cd frontend && npm test`.

### E2E Tests (Playwright)

```
e2e/
├── .auth/                              # Saved browser storage states (gitignored)
│   ├── dad.json
│   ├── mom.json
│   ├── alice.json
│   └── bob.json
├── helpers/
│   ├── auth.ts                         # login() — replays storageState
│   ├── csrf.ts                         # CSRF token helper
│   └── nav.ts                          # Navigation helpers
├── screenshots/                        # Test screenshots
├── auth.setup.ts                       # Auth setup project
├── playwright.config.ts                # Full suite config
├── playwright.uat.config.ts            # UAT subset config
├── tsconfig.json
├── m1-the-look.spec.ts
├── m2-the-game.spec.ts
├── path-a-regression.spec.ts
├── phase-04-uat.spec.ts
├── phase-05-points-happy-path.spec.ts
├── phase-05-uat.spec.ts
├── phase-06-uat.spec.ts
├── phase-07-uat.spec.ts
├── phase-10-uat.spec.ts
└── uat-checklist.spec.ts
```

**Pattern**: Auth setup logs in once per seeded user and saves `storageState`. Specs call `login(page, user)` to replay that session. File suffix is `.spec.ts` (not `.test.ts`). Run with `npm run test:e2e` from repo root.

---

## Migration / Seed File Locations

| File | Path | Purpose |
|------|------|---------|
| Prisma schema | `backend/prisma/schema.prisma` | Database model (source of truth) |
| Seed script | `backend/prisma/seed.ts` | Dev data: 4 users, 4 templates, sample points, 2 recurring chores |
| Dev database | `backend/prisma/dev.db` | SQLite file (created by `prisma db push` or seed) |

There are **no Prisma migration files** — the project uses `prisma db push` (schema-as-code) rather than numbered migration files. The schema.prisma file is the sole database definition.

---

## Build Output Locations

| Package | Build command | Output | Purpose |
|---------|-------------|--------|---------|
| Backend | `npm run build` (tsc) | `backend/dist/` | Compiled JS (CommonJS) |
| Frontend | `npm run build` (vite) | `frontend/dist/` | Static SPA bundle |
| Root | `npm run test:e2e` | `playwright-report/`, `test-results/` | Playwright reports |
| Backend | `npm test` (jest) | `backend/coverage/` | Coverage reports |
| Frontend | `npm test` (vitest) | `frontend/coverage/` | Coverage reports |

---

## Documentation Locations

| File | Path | Purpose |
|------|------|---------|
| Architecture (high-level) | `docs/ARCHITECTURE.md` | System design overview |
| Operations | `docs/OPERATIONS.md` | Running, deploying, troubleshooting |
| Docker config | `docs/DOCKER-CONFIGURATION.md` |
| Future roadmap | `docs/FUTURE-ROADMAP.md` |
| ntfy setup | `docs/NTFY-SETUP-GUIDE.md` |
| Production install | `docs/PRODUCTION-INSTALLATION.md` |
| User guide | `docs/USER-GUIDE.md` |
| UAT checklist | `docs/UAT-CHECKLIST.md` |
| UAT results | `docs/UAT-RESULTS.md` |
| Readme | `docs/README.md` |
| Project notes | `docs/project_notes/` | Memory system: bugs.md, decisions.md, key_facts.md, issues.md |
| Archive | `docs/archive/` | Historical docs |
| Superpowers plans | `docs/superpowers/plans/` | Implementation plans for active work |
| Agent conventions | `AGENTS.md` | AI agent-specific patterns |
| Claude conventions | `CLAUDE.md` | Claude-specific agent config |
| Changelog | `CHANGELOG.md` |
| Root readme | `README.md` |
| Planning docs | `.planning/` | Historical phase-based planning (GSD workflow) |
| This document | `.planning/codebase/STRUCTURE.md` | You are here |
