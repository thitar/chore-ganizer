# Codebase Structure

**Analysis Date:** 2026-05-01

## Directory Layout

```
[chore-ganizer]/
├── .claude/                    # Claude Code skills (project-specific)
│   └── skills/                 # docker-helper, e2e-runner, notify-tester, perf-check, prisma-helper, test-runner
├── .github/                    # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci-cd.yml           # CI (test+build) + CD (Docker push to GHCR)
│       └── security.yml        # Security scanning (CodeQL, npm audit, Gitleaks, Semgrep, Trivy)
├── .planning/                  # GSD planning artifacts (roadmap, phases, codebase maps)
│   └── codebase/               # Codebase intelligence documents (this file's destination)
├── backend/                    # Express.js API server (independent npm package)
│   ├── backup-scripts/         # SQLite backup scripts
│   ├── coverage/               # Test coverage reports
│   ├── dist/                   # Compiled TypeScript output (target ES2022, CommonJS)
│   ├── node_modules/           # Backend dependencies
│   ├── prisma/                 # Prisma schema + migrations
│   │   └── schema.prisma       # 16 models: User, ChoreTemplate, ChoreAssignment, RecurringChore, etc.
│   ├── scripts/                # Code generation (Swagger docs generator)
│   │   └── generate-swagger.ts # Reads @swagger JSDoc from routes → docs/swagger.json
│   ├── src/                    # Backend source code (see detailed layout below)
│   ├── docker-entrypoint.sh    # Container entrypoint (UID/GID, prisma migrate, seed, gosu)
│   ├── Dockerfile              # Multi-stage build (builder → node:25-slim)
│   ├── supercronic.conf        # Cron config for backup scheduling
│   ├── crontab                 # Cron schedule definitions
│   ├── jest.config.js          # Jest config for unit tests
│   ├── jest.integration.config.js # Jest config for integration tests
│   ├── tsconfig.json           # TypeScript config (ES2022, CommonJS, strict)
│   ├── eslint.config.cjs       # ESLint configuration
│   └── package.json            # Backend dependencies & scripts (version: 2.1.10)
├── frontend/                   # React 18 SPA (independent npm package)
│   ├── coverage/               # Vitest test coverage
│   ├── dist/                   # Vite build output
│   ├── node_modules/           # Frontend dependencies
│   ├── public/                 # Static assets (favicon, PWA icons)
│   ├── src/                    # Frontend source code (see detailed layout below)
│   ├── docker-entrypoint.sh    # Container entrypoint (runtime config generation)
│   ├── Dockerfile              # Multi-stage build (node:25-alpine builder → nginx:alpine)
│   ├── nginx.conf.template    # Nginx config (SPA fallback, /api proxy, security headers)
│   ├── vite.config.ts          # Vite build config (manual chunks, PWA plugin, Vitest inline)
│   ├── vitest.config.ts        # Vitest test config (jsdom, @/ alias)
│   ├── tailwind.config.js      # Tailwind theme (custom colors, Plus Jakarta Sans font)
│   ├── postcss.config.js       # PostCSS (Tailwind)
│   ├── tsconfig.json           # TypeScript config (ES2020, ESNext, React JSX)
│   ├── index.html              # HTML entry point
│   └── package.json            # Frontend dependencies & scripts (version: 2.1.10)
├── e2e/                        # Playwright end-to-end tests
│   ├── auth.spec.ts            # Auth flow tests
│   ├── chores.spec.ts          # Chore management tests
│   ├── pocket-money.spec.ts    # Pocket money tests
│   ├── recurring-chores.spec.ts # Recurring chores tests
│   ├── p311-overdue-penalty.spec.ts # Overdue penalty tests
│   └── utils/                  # E2E test utilities
├── docs/                       # User-facing and developer documentation
│   ├── swagger.json            # Auto-generated OpenAPI 3.0 spec
│   ├── USER-GUIDE.md           # End-user documentation
│   ├── ADMIN-GUIDE.md          # Administrator documentation
│   └── ...                     # Various guides (backup, deployment, CI/CD, etc.)
├── data/                       # Local development SQLite data
├── backups/                    # Production backups (Docker bind mount target)
├── test-db/                    # Integration test databases
├── test-reports/               # Test output reports
├── docker-compose.yml          # Production Docker Compose (pre-built images)
├── docker-compose.staging.yml  # Staging Docker Compose (local builds)
├── docker-compose.sh           # Helper script (auto-reads APP_VERSION)
├── playwright.config.ts        # Playwright E2E test config
├── package.json                # Root package (version: 2.1.9 - outdated, E2E scripts only)
├── AGENTS.md                   # Agent instructions (architecture overview, conventions)
├── SWAGGER_JSDOC_GUIDE.md      # Guide for Swagger JSDoc annotations
├── CHANGELOG.md                # Release changelog
├── .env                        # Environment variables (gitignored, never committed)
├── .env.example                # Template for .env file
└── README.md                   # Project README
```

### Backend Source Detail (`backend/src/`)

```
src/
├── __tests__/                  # Test files (mirrors src/ structure)
│   ├── __mocks__/              # Prisma mock, uuid mock
│   ├── integration/            # Integration tests (real DB, serial)
│   │   ├── global-setup.ts     # Create test DB before all tests
│   │   ├── global-teardown.ts  # Destroy test DB after all tests
│   │   └── jest-setup.ts       # Per-test run setup
│   ├── jobs/                   # Cron job tests
│   ├── middleware/             # Middleware tests
│   ├── services/               # Service tests
│   └── utils/                  # Utility tests
├── config/
│   └── database.ts             # Prisma singleton + RecurringChore JSON middleware
├── constants/
│   └── audit-actions.ts        # Audit action type constants
├── controllers/                # 16 controller files (one per domain)
│   ├── auth.controller.ts      # Register, login, logout, me, unlock
│   ├── chore-templates.controller.ts
│   ├── chore-assignments.controller.ts
│   ├── chore-categories.controller.ts
│   ├── users.controller.ts
│   ├── notifications.controller.ts
│   ├── notification-settings.controller.ts
│   ├── pocket-money.controller.ts
│   ├── overdue-penalty.controller.ts
│   ├── recurring-chores.controller.ts
│   ├── recurring-chores-crud.controller.ts
│   ├── recurring-chores-occurrences.controller.ts
│   ├── statistics.controller.ts
│   ├── audit.controller.ts
│   ├── health.controller.ts    # Health check (DB, memory, disk), liveness, readiness, security.txt
│   └── metrics.controller.ts   # Prometheus metrics endpoint
├── jobs/
│   └── occurrenceJob.ts        # Daily recurring chore occurrence generation (node-cron)
├── middleware/
│   ├── auth.ts                 # authenticate + authorize(roles) + requireParent
│   ├── csrf.ts                 # CSRF token generation + validation (timingSafeEqual)
│   ├── errorHandler.ts         # AppError class + global error handler + 404 handler
│   ├── rateLimiter.ts          # General + auth rate limiters, request counter
│   ├── validator.ts            # Zod validation middleware (body/query/params)
│   ├── requestLogger.ts        # Request logging
│   ├── requestTimer.ts         # Slow request detection (configurable threshold)
│   ├── metricsMiddleware.ts    # Prometheus metrics collection
│   ├── compression.ts          # Gzip/brotli response compression
│   └── shutdownMiddleware.ts   # Graceful shutdown (track in-flight requests)
├── routes/                     # 17 route files + index router
│   ├── index.ts                # Central router: mounts all sub-routers + health/version endpoints
│   ├── auth.routes.ts          # /api/auth/*
│   ├── chore-templates.routes.ts
│   ├── chore-assignments.routes.ts
│   ├── chore-categories.routes.ts
│   ├── users.routes.ts
│   ├── notifications.routes.ts
│   ├── notification-settings.routes.ts
│   ├── overdue-penalty.routes.ts
│   ├── recurring-chores.routes.ts
│   ├── recurring-chores-crud.routes.ts
│   ├── recurring-chores-occurrences.routes.ts
│   ├── pocket-money.routes.ts
│   ├── statistics.routes.ts
│   ├── audit.routes.ts
│   ├── admin.routes.ts
│   └── metrics.routes.ts       # /api/metrics (Prometheus)
├── schemas/
│   ├── validation.schemas.ts   # Zod schemas (auth, users, chores, assignments, etc.)
│   └── validation.schemas.test.ts
├── services/                   # 15 service files + recurring-chores/ subdirectory
│   ├── auth.service.ts         # Register, login with bcrypt + lockout
│   ├── chore-templates.service.ts
│   ├── chore-assignments.service.ts
│   ├── chore-categories.service.ts
│   ├── users.service.ts
│   ├── notifications.service.ts # In-app notification CRUD
│   ├── notification-settings.service.ts
│   ├── notificationService.ts  # Multi-channel: ntfy + email dispatch
│   ├── ntfy.service.ts         # ntfy.sh push notifications with SSRF protection
│   ├── emailService.ts         # SMTP email with HTML templates + XSS escaping
│   ├── recurrence.service.ts   # Recurrence rule date generation (DAILY/WEEKLY/MONTHLY/YEARLY)
│   ├── overdue-penalty.service.ts
│   ├── statistics.service.ts
│   ├── audit.service.ts
│   └── recurring-chores/       # Recurring chores sub-domain
│       ├── occurrence.service.ts
│       ├── occurrence-management.service.ts
│       ├── recurring-chore-management.service.ts
│       ├── assignment.service.ts
│       └── transform.service.ts
├── types/
│   ├── express.d.ts            # Express Request extension (req.user)
│   └── session.d.ts            # Session data extension (csrfToken)
├── utils/
│   ├── asyncHandler.ts         # Async Express handler wrapper
│   ├── logger.ts               # Winston JSON logger with correlation IDs
│   ├── cache.ts                # node-cache in-memory cache (10-min TTL)
│   ├── metrics.ts              # prom-client custom metrics (histograms, counters, gauges)
│   ├── lockout.ts              # Account lockout (5 failures → 15-min lock)
│   ├── error-webhook.ts        # ntfy error alerting (500, DB, backup, health)
├── swagger.config.ts           # OpenAPI base definition (info, servers, tags, schemas)
├── version.ts                  # Version + build date constants
├── app.ts                      # Express app config (middleware chain, route mounting)
└── server.ts                   # HTTP server creation, graceful shutdown, cron job start
```

### Frontend Source Detail (`frontend/src/`)

```
src/
├── api/                        # API client layer (14 files)
│   ├── client.ts               # ApiClient class: Axios + CSRF injection + 401/403 handling
│   ├── client.test.ts          # ApiClient tests
│   ├── index.ts                # Barrel export of all API modules
│   ├── auth.api.ts             # /auth/login, /auth/register, /auth/logout, /auth/me
│   ├── chores.api.ts           # /chore-assignments/*
│   ├── templates.api.ts        # /chore-templates/*
│   ├── assignments.api.ts      # /chore-assignments/* (parameter mapping: userId→assignedToId)
│   ├── categories.api.ts       # /chore-categories/*
│   ├── users.api.ts            # /users/*
│   ├── notifications.api.ts    # /notifications/*
│   ├── notification-settings.api.ts # /notification-settings/*
│   ├── recurring-chores.api.ts # /recurring-chores/*
│   ├── pocket-money.api.ts     # /pocket-money/*
│   ├── audit.api.ts            # /audit/*
│   └── statistics.api.ts       # /statistics/*
├── components/                 # UI components (organized by domain)
│   ├── common/                 # Shared components (8 files + barrel)
│   │   ├── index.ts            # Barrel: Button, Input, Modal, Loading, ErrorBoundary, etc.
│   │   ├── Button.tsx + .test.tsx
│   │   ├── Input.tsx + .test.tsx
│   │   ├── Modal.tsx + .test.tsx
│   │   ├── Loading.tsx + .test.tsx
│   │   ├── ErrorBoundary.tsx + .test.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── OfflineIndicator.tsx
│   │   └── PasswordStrengthIndicator.tsx + .test.tsx
│   ├── layout/                 # Layout components (4 files + barrel)
│   │   ├── index.ts            # Barrel: Navbar, Sidebar, Footer
│   │   ├── Navbar.tsx + .test.tsx
│   │   ├── Sidebar.tsx + .test.tsx
│   │   └── Footer.tsx
│   ├── chores/                 # Chore management components (9 files + barrel)
│   │   ├── index.ts
│   │   ├── ChoreCard.tsx + .test.tsx
│   │   ├── ChoreList.tsx + .test.tsx
│   │   ├── ChoreForm.tsx + .test.tsx
│   │   ├── ChoreFilters.tsx + .test.tsx
│   │   └── CalendarView.tsx + .test.tsx
│   ├── users/                  # User management components (5 files + barrel)
│   │   ├── index.ts
│   │   ├── UserForm.tsx
│   │   ├── UserTable.tsx
│   │   ├── ColorPicker.tsx
│   │   └── ConfirmDialog.tsx
│   ├── notifications/          # Notification components (3 files + barrel)
│   │   ├── index.ts
│   │   └── NotificationBell.tsx + .test.tsx
│   ├── pocket-money/           # Pocket money components (8 files + barrel)
│   │   ├── index.ts
│   │   ├── PocketMoneyDashboard.tsx
│   │   ├── PocketMoneyCard.tsx + .test.tsx
│   │   ├── ConfigurationForm.tsx
│   │   ├── PayoutModal.tsx
│   │   ├── BonusDeductionModal.tsx
│   │   └── PointHistoryList.tsx
│   └── recurring-chores/       # Recurring chore components (9 files + barrel)
│       ├── index.ts
│       ├── RecurringChoresList.tsx
│       ├── RecurringChoreFormModal.tsx
│       ├── RecurrenceRuleEditor.tsx
│       ├── AssignmentModeSelector.tsx
│       ├── OccurrenceList.tsx
│       ├── OccurrenceGroup.tsx
│       ├── OccurrenceCard.tsx
│       └── occurrence-helpers.ts
├── hooks/                      # Custom React hooks (8 files + barrel)
│   ├── index.ts                # Barrel export
│   ├── useAuth.tsx + .test.tsx # Auth context provider (React Context, NOT Zustand)
│   ├── useChores.ts            # Chore data via @tanstack/react-query
│   ├── useTemplates.ts         # Template data via React Query
│   ├── useAssignments.ts       # Assignment data via React Query
│   ├── useCategories.ts        # Category data via React Query
│   ├── useNotifications.ts     # Notification data via React Query
│   └── useUsers.ts             # User data via React Query
├── pages/                      # Full page components (16 files + barrel)
│   ├── index.ts                # Barrel export
│   ├── Dashboard.tsx           # Main dashboard
│   ├── Login.tsx               # Login/register page
│   ├── Chores.tsx              # Chore management
│   ├── Templates.tsx           # Chore template management (parent-only)
│   ├── Calendar.tsx            # Calendar view (parent-only)
│   ├── RecurringChoresPage.tsx # Recurring chores (parent-only)
│   ├── Users.tsx + UserDetail.tsx # User management (parent-only)
│   ├── Profile.tsx             # User profile
│   ├── PocketMoney.tsx         # Pocket money tracking
│   ├── StatisticsPage.tsx      # Family statistics (parent-only)
│   ├── Notifications.tsx       # Notification center
│   ├── Settings.tsx + .test.tsx # App settings (parent-only)
│   └── NotFound.tsx            # 404 page
├── test/                       # Test infrastructure
│   ├── setup.ts                # Vitest setup: jest-dom matchers + cleanup
│   └── utils.tsx               # Mock data factories (mockUser, mockChild, mockCategory, etc.)
├── types/                      # TypeScript type definitions
│   ├── index.ts                # Core types: User, ChoreAssignment, ChoreTemplate, etc.
│   ├── pocket-money.ts         # PocketMoneyConfig, PointTransaction, Payout types
│   └── recurring-chores.ts     # RecurringChore, ChoreOccurrence, RecurrenceRule types
├── utils/
│   └── toast.ts                # Toast notification utilities
├── App.tsx                     # Root component: routes, lazy loading, auth guards, layout
├── main.tsx                    # Entry point: React root, BrowserRouter, PWA, CSRF init
├── index.css                   # Tailwind imports + global styles
├── constants.ts                # App-wide constants
├── version.ts                  # Frontend version info
└── vite-env.d.ts               # Vite type declarations
```

## Directory Purposes

**`backend/src/controllers/`:**
- Purpose: Thin HTTP layer — extracts data from request, calls services, formats JSON responses
- Contains: 16 controller files, one per domain
- Key files: `auth.controller.ts`, `chore-assignments.controller.ts`, `pocket-money.controller.ts`, `health.controller.ts`

**`backend/src/services/`:**
- Purpose: All business logic — the "fat" layer. Database queries via Prisma, data transformation, cross-domain orchestration
- Contains: 15 service files with `recurring-chores/` subdirectory (5 more files)
- Key files: `auth.service.ts`, `chore-assignments.service.ts`, `recurrence.service.ts`, `notificationService.ts`, `ntfy.service.ts`

**`backend/src/routes/`:**
- Purpose: Map HTTP methods/paths to controllers, apply middleware, provide JSDoc for OpenAPI generation
- Contains: 17 route files + `index.ts` central router
- Key files: `index.ts`, `auth.routes.ts`, `recurring-chores-crud.routes.ts`

**`backend/src/middleware/`:**
- Purpose: Cross-cutting request processing — security, logging, metrics, error handling
- Contains: 10 middleware files
- Key files: `auth.ts`, `csrf.ts`, `errorHandler.ts`, `validator.ts`, `rateLimiter.ts`

**`backend/src/jobs/`:**
- Purpose: Background tasks scheduled via node-cron
- Contains: `occurrenceJob.ts` — daily generation of recurring chore occurrences at midnight UTC

**`backend/src/config/`:**
- Purpose: Infrastructure configuration — Prisma singleton with middleware
- Contains: `database.ts`

**`frontend/src/api/`:**
- Purpose: Typed HTTP client layer — one file per API domain. Handles CSRF token injection, 401 auto-logout, 403 CSRF retry
- Contains: 14 API modules + `client.ts` (core ApiClient class) + `client.test.ts` + `index.ts` barrel
- Key files: `client.ts` (ApiClient with Axios interceptors), `assignments.api.ts` (parameter mapping)

**`frontend/src/hooks/`:**
- Purpose: React hooks for data fetching, auth state, domain logic
- Contains: 8 hook files + barrel
- Key files: `useAuth.tsx` (React Context for auth state), `useChores.ts` (@tanstack/react-query)

**`frontend/src/components/`:**
- Purpose: Reusable UI components organized by domain
- Contains: 7 subdirectories: `common/`, `layout/`, `chores/`, `users/`, `notifications/`, `pocket-money/`, `recurring-chores/`

**`frontend/src/pages/`:**
- Purpose: Full-page components, one per route, lazy-loaded via React.lazy()
- Contains: 16 page files + barrel

**`frontend/src/types/`:**
- Purpose: Shared TypeScript interfaces and types
- Contains: `index.ts` (core types), `pocket-money.ts`, `recurring-chores.ts`

**`backend/prisma/`:**
- Purpose: Prisma schema definition and migrations
- Key files: `schema.prisma` (16 models: User, ChoreCategory, ChoreTemplate, ChoreAssignment, Notification, UserNotificationSettings, Family, PocketMoneyConfig, PointTransaction, Payout, RecurringChore, RecurringChoreFixedAssignee, RecurringChoreRoundRobinPool, ChoreOccurrence, AuditLog)

**`e2e/`:**
- Purpose: End-to-end tests using Playwright
- Contains: 5 spec files + `utils/`

**`docs/`:**
- Purpose: User-facing and developer documentation, auto-generated Swagger spec
- Key files: `swagger.json` (auto-generated, do not hand-edit)

**`backend/src/__tests__/`:**
- Purpose: Backend test files, mirrors src structure
- Contains: `__mocks__/`, `integration/`, `jobs/`, `middleware/`, `services/`, `utils/`, `test-helpers.ts`

## Key File Locations

**Entry Points:**
- `backend/src/server.ts`: Express HTTP server entry point
- `backend/src/app.ts`: Express app configuration and middleware chain
- `frontend/src/main.tsx`: React app entry point (mounts to DOM)
- `frontend/src/App.tsx`: Root component with route definitions

**Configuration:**
- `backend/tsconfig.json`: Backend TypeScript config
- `frontend/tsconfig.json`: Frontend TypeScript config
- `frontend/vite.config.ts`: Vite build config
- `frontend/vitest.config.ts`: Vitest test config
- `frontend/tailwind.config.js`: Tailwind theme
- `backend/jest.config.js`: Jest unit test config
- `backend/jest.integration.config.js`: Jest integration test config
- `backend/prisma/schema.prisma`: Database schema
- `docker-compose.yml`: Production Docker Compose
- `.env`: Environment variables (gitignored)

**Core Logic:**
- `backend/src/services/`: Business logic (fat service layer)
- `backend/src/controllers/`: HTTP layer (thin controllers)
- `backend/src/config/database.ts`: Prisma singleton with RecurringChore JSON middleware
- `backend/src/jobs/occurrenceJob.ts`: Recurring chore generation cron job
- `frontend/src/api/client.ts`: Centralized HTTP client with CSRF/auth
- `frontend/src/hooks/useAuth.tsx`: Auth state context

**Testing:**
- `backend/src/__tests__/`: Backend tests (unit + integration)
- `frontend/src/test/`: Frontend test infrastructure (setup + mock factories)
- `frontend/src/components/*/*.test.tsx`: Co-located component tests
- `e2e/*.spec.ts`: Playwright E2E tests

## Naming Conventions

**Files:**
- Backend: `kebab-case` with suffixes (e.g., `chore-assignments.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `errorHandler.ts`)
- Frontend: `PascalCase` for components (e.g., `ChoreCard.tsx`, `RecurringChoresList.tsx`), `camelCase` for hooks/utils (e.g., `useAuth.tsx`, `client.ts`), `dot.notation` for domain APIs (e.g., `auth.api.ts`)
- Tests: `*.test.ts` / `*.test.tsx` (unit), `*.integration.test.ts` (integration), `*.spec.ts` (E2E)

**Directories:**
- Backend: `plural-lowercase` (e.g., `controllers/`, `services/`, `routes/`, `middleware/`)
- Frontend: `plural-kebab-case` (e.g., `pocket-money/`, `recurring-chores/`)

## Where to Add New Code

**New API Endpoint (Backend):**
1. Schema: Add Zod schema to `backend/src/schemas/validation.schemas.ts`
2. Service: Create/update service in `backend/src/services/{domain}.service.ts`
3. Controller: Add controller function in `backend/src/controllers/{domain}.controller.ts`
4. Route: Add route with `@swagger` JSDoc in `backend/src/routes/{domain}.routes.ts`
5. Mount in: `backend/src/routes/index.ts` if new module
6. Tests: `backend/src/__tests__/services/` or `backend/src/__tests__/integration/`
7. Regenerate Swagger: `cd backend && npm run docs:generate`

**New Frontend Feature:**
1. Types: Add interfaces to `frontend/src/types/` (main: `index.ts`, domain-specific: `{domain}.ts`)
2. API module: Create `frontend/src/api/{domain}.api.ts` and add to barrel `index.ts`
3. Hook: Create `frontend/src/hooks/use{Feature}.ts` using @tanstack/react-query
4. Components: Create `frontend/src/components/{domain}/` directory with `index.ts` barrel
5. Page: Create `frontend/src/pages/{Feature}Page.tsx`
6. Route: Add lazy-loaded route in `frontend/src/App.tsx`
7. Test: Co-locate `*.test.tsx` with components

**New Database Model:**
1. Add model to `backend/prisma/schema.prisma`
2. Run `prisma db push` (auto-applied in Docker entrypoint)
3. Create service in `backend/src/services/{domain}.service.ts`

**New Background Job:**
1. Create job in `backend/src/jobs/{jobName}.ts`
2. Register in `backend/src/server.ts` or `backend/src/app.ts`

## Special Directories

**`backend/dist/`:**
- Purpose: Compiled TypeScript output
- Generated: Yes (by `tsc`)
- Committed: No (gitignored)

**`frontend/dist/`:**
- Purpose: Vite build output
- Generated: Yes (by `vite build`)
- Committed: No (gitignored)

**`docs/swagger.json`:**
- Purpose: Auto-generated OpenAPI 3.0 spec
- Generated: Yes (by `npm run docs:generate`)
- Committed: Yes (needs to be committed alongside route changes)

**`node_modules/`** (all three):
- Purpose: Package dependencies
- Generated: Yes (by `npm install`)
- Committed: No (gitignored)

**`coverage/`** (backend + frontend):
- Purpose: Test coverage reports
- Generated: Yes
- Committed: No (gitignored)

**`test-db/`:**
- Purpose: Integration test databases (created/destroyed per test run)
- Generated: Yes
- Committed: No (gitignored)

---

*Structure analysis: 2026-05-01*
