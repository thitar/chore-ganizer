---
title: Directory Structure
last_mapped_commit: HEAD
date: 2026-07-12
---

# Directory Structure

## Top-Level Layout

```
chore-ganizer/
├── backend/          # Express.js + TypeScript API
├── frontend/         # React + Vite + Tailwind SPA
├── e2e/              # Playwright end-to-end tests
├── docs/             # Documentation
├── .planning/        # GSD planning artifacts
├── docker-compose.yml
├── docker-compose.sh
├── AGENTS.md
├── CLAUDE.md
├── CHANGELOG.md
└── README.md
```

## Backend (`backend/`)

```
backend/
├── Dockerfile                    # 3-stage: deps → build → runtime (Node 20 Alpine)
├── package.json                  # v3.2.0, commonjs
├── tsconfig.json
├── jest.config.js
├── docker-entrypoint.sh          # UID/GID adjust, prisma push, seed, drop to appuser
├── prisma/
│   ├── schema.prisma             # Data model (7 models)
│   ├── seed.ts                   # Seeds 4 users, 4 templates, 4 point logs, 2 recurring chores
│   └── dev.db                    # SQLite database file
└── src/
    ├── app.ts                    # Express app + all middleware registration
    ├── server.ts                 # HTTP server bootstrap, graceful shutdown
    ├── config/
    │   ├── prisma.ts             # PrismaClient singleton
    │   └── notifications.ts      # ntfy config (isNtfyConfigured, getNtfyConfig)
    ├── middleware/
    │   ├── auth.ts               # authenticate + authorize
    │   ├── csrf.ts               # Double-submit cookie CSRF
    │   ├── errorHandler.ts       # AppError class + global error handler
    │   ├── rateLimiter.ts        # General + auth rate limiters
    │   └── validator.ts          # Zod schema validation
    ├── routes/
    │   ├── index.ts              # Route aggregator
    │   ├── auth.routes.ts
    │   ├── assignments.routes.ts
    │   ├── templates.routes.ts
    │   ├── users.routes.ts
    │   ├── points.routes.ts
    │   ├── recurring.routes.ts
    │   ├── occurrences.routes.ts
    │   └── health.routes.ts
    ├── schemas/
    │   ├── assignment.schema.ts
    │   ├── points.schema.ts
    │   └── template.schema.ts
    ├── services/
    │   ├── auth.service.ts
    │   ├── assignment.service.ts      # 295 lines — largest service
    │   ├── template.service.ts
    │   ├── users.service.ts
    │   ├── points.service.ts
    │   ├── gamification.service.ts    # 265 lines — complex
    │   ├── recurring.service.ts
    │   ├── notification.service.ts
    │   └── notification.formatters.ts
    ├── types/
    │   └── express-session.d.ts       # Session augmentation (userId, role)
    └── __tests__/
        ├── app.test.ts
        ├── assignments.test.ts
        ├── templates.test.ts
        ├── users.test.ts
        ├── points.test.ts
        ├── recurring.test.ts
        ├── middleware/csrf.test.ts
        ├── routes/__tests__/auth.routes.test.ts
        └── services/*.test.ts         # One per service (8 files)
```

## Frontend (`frontend/`)

```
frontend/
├── Dockerfile                    # Node 20 build → nginx 1.25 runtime
├── package.json                  # v3.2.0, ESM
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                # Dev proxy /api → :3010, port 5173
├── vitest.config.ts              # jsdom, globals
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx                  # React root (AuthProvider, QueryClientProvider)
    ├── App.tsx                   # Route definitions
    ├── index.css                 # Tailwind + custom CSS
    ├── api/
    │   ├── auth.api.ts
    │   ├── assignments.api.ts
    │   ├── templates.api.ts
    │   ├── users.api.ts
    │   ├── points.api.ts
    │   ├── recurring.api.ts
    │   └── calendar.api.ts
    ├── hooks/
    │   ├── useAuth.tsx           # AuthContext + useAuth
    │   ├── useAssignments.tsx
    │   ├── useTemplates.tsx
    │   ├── useUsers.tsx
    │   ├── usePoints.tsx
    │   ├── useRecurringChores.tsx
    │   ├── useCalendar.tsx
    │   └── useDismissableMenu.ts
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── MyChoresPage.tsx
    │   ├── TemplatesPage.tsx
    │   ├── AssignmentsPage.tsx
    │   ├── RecurringChoresPage.tsx
    │   ├── PointsPage.tsx
    │   ├── CalendarPage.tsx
    │   ├── UsersPage.tsx
    │   └── ProfilePage.tsx          # 447 lines — largest component
    ├── components/
    │   ├── ProtectedRoute.tsx
    │   ├── AppShell.tsx
    │   ├── TopNav.tsx
    │   ├── BottomTabBar.tsx
    │   ├── Leaderboard.tsx
    │   ├── LevelBar.tsx
    │   ├── BadgeGrid.tsx
    │   ├── FilterBar.tsx
    │   ├── StatusBadge.tsx
    │   ├── GamificationMoments.tsx
    │   ├── ConfirmDelete.tsx
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── Avatar.tsx
    │       ├── Toast.tsx
    │       ├── Skeleton.tsx
    │       ├── StatCard.tsx
    │       ├── CountUp.tsx
    │       ├── ProgressRing.tsx
    │       ├── EmptyState.tsx
    │       ├── PageError.tsx
    │       ├── PageHeader.tsx
    │       └── PageLoading.tsx
    ├── lib/
    │   ├── apiClient.ts          # createApiClient() factory
    │   ├── csrf.ts               # CSRF interceptor for axios
    │   └── celebrate.ts          # canvas-confetti wrapper
    ├── utils/
    │   ├── assignmentKey.ts
    │   ├── dateFormat.ts
    │   └── a11y.ts
    ├── test/
    │   └── setup.ts              # jest-dom matchers + cleanup
    └── __tests__/
        └── *.test.tsx            # Page-level and component tests (15 files)
```

## E2E (`e2e/`)

```
e2e/
├── playwright.config.ts          # Dev config (starts dev servers, baseURL :5173)
├── playwright.uat.config.ts      # UAT config (Docker, baseURL :3002, --disable-gpu)
├── auth.setup.ts                 # Session-based auth setup project
├── helpers/
│   ├── auth.ts                   # login() helper — replays storageState
│   ├── csrf.ts                   # getCsrfToken() helper
│   └── nav.ts                    # Navigation helpers
├── *.spec.ts                     # Test specs (uat-checklist, m1-the-look, m2-the-game, etc.)
├── screenshots/                  # Test screenshots
└── .auth/                        # Saved session state files
```

## Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design, domain model, middleware stack |
| `OPERATIONS.md` | Env vars, startup, health, troubleshooting, backups |
| `project_notes/bugs.md` | Bug log with solutions |
| `project_notes/decisions.md` | Architectural Decision Records |
| `project_notes/key_facts.md` | Configuration, ports, credentials |
| `project_notes/issues.md` | Work log with ticket references |
| `UAT-CHECKLIST.md` | Manual click-through verification |
| `UAT-RESULTS.md` | Automated UAT results |
| `CHANGELOG.md` | Version history |

## Key File Locations by Concern

| Concern | Backend | Frontend |
|---------|---------|----------|
| Routes | `src/routes/*.routes.ts` (8 files) | `src/App.tsx` |
| Services | `src/services/*.service.ts` (9 files) | — |
| Schemas | `src/schemas/*.schema.ts` (3 files) | — |
| Hooks | — | `src/hooks/use*.tsx` (8 files) |
| Components | — | `src/components/*.tsx` (12) + `ui/*.tsx` (12) |
| API layer | — | `src/api/*.api.ts` (7 files) |
| Middleware | `src/middleware/*.ts` (5 files) | — |
| Config | `src/config/*.ts` (2 files) | `vite.config.ts`, `tailwind.config.js` |
| Utils | — | `src/utils/*.ts` (3 files) |
| Shared lib | — | `src/lib/*.ts` (3 files) |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Backend routes | `{domain}.routes.ts` | `assignments.routes.ts` |
| Backend services | `{domain}.service.ts` | `assignment.service.ts` |
| Backend schemas | `{domain}.schema.ts` | `assignment.schema.ts` |
| Backend middleware | `camelCase.ts` | `errorHandler.ts` |
| Frontend pages | `{Name}Page.tsx` | `DashboardPage.tsx` |
| Frontend components | `{Name}.tsx` | `TopNav.tsx` |
| Frontend hooks | `use{Name}.tsx` | `useAssignments.tsx` |
| Frontend API | `{domain}.api.ts` | `assignments.api.ts` |
| Frontend utils | `camelCase.ts` | `dateFormat.ts` |
| Test files | `{name}.test.ts(x)` | `assignment.service.test.ts` |
| E2E specs | `{name}.spec.ts` | `uat-checklist.spec.ts` |

## Build Output

| Artifact | Location |
|----------|----------|
| Backend build | `backend/dist/` (tsc) |
| Frontend build | `frontend/dist/` (Vite) |
| Prisma client | `backend/node_modules/.prisma/` |
