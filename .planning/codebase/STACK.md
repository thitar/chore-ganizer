# Stack — Technologies and Dependencies

## Languages

| Language | Version Constraint | Where |
|----------|-------------------|-------|
| TypeScript | `^5.3.3` | Backend, frontend, e2e tests |
| JavaScript (ES modules) | `>=18.0.0` (Node engine) | Frontend `type: "module"` |
| CommonJS | — | Backend `type: "commonjs"` |

All three packages (root, backend, frontend) require **Node.js 18+**. The Docker images use `node:20-alpine3.18`.

## Runtime

- **Node.js 20** (Alpine 3.18 in Docker; local dev uses whatever node is installed)
- **npm** for package management (lockfiles committed)
- No TypeScript execution in production — backend is compiled to `dist/` via `tsc`, then run with `node`

## Frameworks

### Backend

| Component | Technology |
|-----------|-----------|
| HTTP server | **Express 4.18** on Node `http.createServer` |
| TypeScript target | ES2020, CommonJS modules |
| Dev server | `ts-node --transpile-only` + `nodemon` |
| Build | `tsc` |

### Frontend

| Component | Technology |
|-----------|-----------|
| UI library | **React 18.2** (react + react-dom) |
| Bundler / Dev server | **Vite 6.2** (`@vitejs/plugin-react`) |
| Routing | **React Router DOM 6.22** |
| State management | **TanStack React Query 5.95** (server-state cache) |
| HTTP client | **Axios 1.13** |
| CSS framework | **Tailwind CSS 3.4** |
| PostCSS plugins | autoprefixer |
| Icons | **Lucide React 0.577** |
| Fonts | Inter, Space Grotesk (self-hosted via `@fontsource/*`) |
| Animation / effects | `canvas-confetti` (celebration confetti) |

## Key Dependencies

### Backend — Production

| Package | Purpose |
|---------|---------|
| `@prisma/client` ^5.22 | Database ORM client |
| `bcrypt` ^6.0 | Password hashing |
| `express` ^4.18 | HTTP framework |
| `express-session` ^1.17 | Server-side session management |
| `cookie-parser` ^1.4 | Parse cookies from requests |
| `cors` ^2.8 | Cross-origin request handling |
| `helmet` ^8.1 | Security HTTP headers |
| `express-rate-limit` ^8.2 | Rate limiting |
| `zod` ^4.4 | Request body validation (schemas) |
| `dotenv` ^17.3 | Environment variable loading |

### Backend — Dev

| Package | Purpose |
|---------|---------|
| `prisma` ^5.7 | Prisma CLI (generate, push, seed) |
| `typescript` ^5.3 | TypeScript compiler |
| `ts-node` ^10.9 | TS execution for dev and prisma seed |
| `jest` ^30.0 | Test runner |
| `ts-jest` ^29.3 | TS transform for Jest |
| `supertest` ^7.1 | HTTP assertion library for tests |
| `nodemon` ^3.0 | Dev server auto-restart |

### Frontend — Production

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` ^18.2 | UI framework |
| `react-router-dom` ^6.22 | Client-side routing |
| `@tanstack/react-query` ^5.95 | Server-state management / caching |
| `axios` ^1.13 | HTTP client |
| `lucide-react` ^0.577 | Icon library |
| `canvas-confetti` ^1.9 | Confetti animation effects |
| `@fontsource/inter` / `@fontsource/space-grotesk` | Self-hosted fonts |

### Frontend — Dev

| Package | Purpose |
|---------|---------|
| `vite` ^6.2 | Build tool / dev server |
| `@vitejs/plugin-react` ^4.2 | React Fast Refresh for Vite |
| `typescript` ^5.3 | TypeScript type checking |
| `tailwindcss` ^3.4 | Utility-first CSS |
| `postcss` ^8.5 / `autoprefixer` ^10.4 | CSS processing |
| `vitest` ^4.1 | Test runner (Vite-native) |
| `jsdom` ^23.0 | DOM environment for tests |
| `@testing-library/react` ^16.3 | React component testing |
| `@testing-library/jest-dom` ^6.1 | Custom DOM matchers |
| `@testing-library/user-event` ^14.5 | User interaction simulation |

### Root (monorepo) — Dev

| Package | Purpose |
|---------|---------|
| `@playwright/test` ^1.50 | E2E browser testing |

## Database

| Aspect | Detail |
|--------|--------|
| Engine | **SQLite** (single file) |
| ORM | **Prisma 5.22** |
| Schema | `backend/prisma/schema.prisma` |
| Migration strategy | `prisma db push` (schema push, no numbered migrations). Run idempotently at container startup via `docker-entrypoint.sh`. Accepts `--accept-data-loss` in production. |
| Seeding | `prisma db seed` via `prisma/seed.ts`. Idempotent: checks if users exist before seeding. |
| File location | `/opt/app-data/chore-ganizer/chore-ganizer.db` in Docker; `backend/dev.db` in local dev |
| Data models | User, ChoreTemplate, ChoreAssignment, PointLog, RecurringChore, RecurringOccurrence, UserBadge |

## Auth Mechanism

| Aspect | Detail |
|--------|--------|
| Strategy | **Server-side sessions** via `express-session` |
| Session store | Default MemoryStore (in-process, not persistent across restarts) |
| Session cookie | `connect.sid`, httpOnly, secure (when `SECURE_COOKIES=true`), SameSite (configurable, default `strict`) |
| Password hashing | **bcrypt** with default 10-round cost factor |
| CSRF protection | **Double-submit cookie pattern**: backend sets `XSRF-TOKEN` cookie, frontend reads it and sends `x-xsrf-token` header on mutating requests |
| Session regeneration | `req.session.regenerate()` on login |
| Role-based auth | Middleware checks `req.session.role` against allowed roles (PARENT / CHILD) |
| Session secret | Required in production; `SESSION_SECRET` env var. Refuses to start without it in `NODE_ENV=production`. |

## Dev Tools

### Testing

| Tool | Scope | Config |
|------|-------|--------|
| **Jest 30** + **ts-jest** | Backend unit tests | `backend/jest.config.js`; tests in `backend/src/__tests__/`; Prisma mocked inline per test file |
| **Vitest 4.1** + **jsdom** | Frontend unit tests | `frontend/vite.config.ts` (test section); setup in `frontend/src/test/setup.ts` |
| **Playwright 1.50** | E2E tests (Chromium) | `e2e/playwright.config.ts` (dev) and `e2e/playwright.uat.config.ts` (Docker/UAT) |
| **Supertest 7.1** | Backend HTTP assertions | Used within Jest test files |

### Linting / Formatting

- **None configured.** No ESLint, Prettier, or similar tools are installed or configured in any package. No `npm run lint` or `npm run format` scripts exist.

## Deployment

### Docker

| Aspect | Detail |
|--------|--------|
| Backend image | `ghcr.io/thitar/chore-ganizer-backend:VERSION` (built locally, no CI publishing) |
| Frontend image | `ghcr.io/thitar/chore-ganizer-frontend:VERSION` (built locally, no CI publishing) |
| Base images | `node:20-alpine3.18` (both build stages), `nginx:1.25-alpine` (frontend runtime) |
| Build strategy | Multi-stage builds (deps -> build -> runtime) |
| Process manager | `tini` (backend, proper signal handling) |
| Runtime user | `appuser` (UID/GID configurable via `PUID`/`PGID`) |
| Frontend server | **nginx** (reverse proxy + static file serving) |
| Entrypoint scripts | `backend/docker-entrypoint.sh`, `frontend/docker-entrypoint.sh` |

### Docker Compose

- `docker-compose.yml` at repo root
- Two services: `frontend` (port 3002:80) and `backend` (port 3010:3010)
- Bridge network: `chore-ganizer-network`
- Health checks on both services
- Frontend depends on backend (healthy condition)
- Persistent data via bind mount at `DATA_DIR` (default `/opt/app-data/chore-ganizer`)

### CI/CD

- **Single workflow**: `.github/workflows/security.yml` — security scanning only
  - CodeQL (SAST for JS/TS)
  - npm audit (backend + frontend)
  - Gitleaks (secret scanning)
  - Semgrep (SAST)
  - Trivy (container filesystem scanning)
- **No build, test, or deployment pipeline** exists in CI
- **Dependabot** configured for weekly npm updates, monthly Docker/GitHub Actions updates
- **No image publishing pipeline** — Docker images are built and tagged locally

### Runtime Configuration

- Frontend runtime config injected via `config.js` (generated at container start from env vars)
- nginx config generated from template via `envsubst` at container start
- All config via environment variables (no config files baked into images)
