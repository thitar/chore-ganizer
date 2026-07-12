---
title: Technology Stack
last_mapped_commit: HEAD
date: 2026-07-12
---

# Technology Stack

## Languages

| Language | Where | Version |
|----------|-------|---------|
| TypeScript | backend, frontend, e2e | `^5.3.3` |
| JavaScript | PostCSS, Tailwind, Jest configs, shell scripts | N/A |

## Runtime

| Property | Value |
|----------|-------|
| Node.js | `>=18.0.0` (Dockerfiles use `node:20-alpine3.18`) |
| TypeScript target | `ES2020` (backend + frontend main); `ES2022` (frontend Vite config) |
| Module system | Backend: `commonjs`; Frontend: `ESNext` (ESM) |

## Frameworks

| Layer | Framework | Details |
|-------|-----------|---------|
| Backend | **Express 4** (`^4.18.2`) | HTTP API; `http.createServer(app)` in `server.ts`; listens `0.0.0.0:3010` |
| Frontend | **React 18** (`^18.2.0`) | SPA with `react-dom` `createRoot`; `react-router-dom` v6 (`^6.22.0`) |
| Frontend build | **Vite 6** (`^6.2.0`) | `@vitejs/plugin-react`; dev server port 5173 with `/api` proxy to backend:3010 |
| Frontend CSS | **Tailwind CSS 3** (`^3.4.0`) | PostCSS + Autoprefixer; dark theme with Inter + Space Grotesk fonts |
| Frontend data | **TanStack React Query 5** (`^5.95.2`) | `QueryClient` with `retry: false`, `staleTime: 5min` |
| Production server | **nginx 1.25** (Alpine) | Serves frontend static assets; reverse-proxies `/api/*` to backend |

## Key Dependencies

### Backend (`chore-ganizer-backend-v2` v3.2.0)

| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | `^5.22.0` | Database ORM |
| `express` | `^4.18.2` | HTTP framework |
| `express-session` | `^1.17.3` | Server-side sessions |
| `bcrypt` | `^6.0.0` | Password hashing (10-round salt) |
| `helmet` | `^8.1.0` | Security headers |
| `cors` | `^2.8.5` | CORS middleware |
| `express-rate-limit` | `^8.2.2` | Rate limiting |
| `cookie-parser` | `^1.4.7` | Cookie parsing |
| `zod` | `^4.4.3` | Request body validation (partial) |
| `dotenv` | `^17.3.1` | Environment variables |

### Frontend (`chore-ganizer-frontend-v2` v3.2.0)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` / `react-dom` | `^18.2.0` | UI framework |
| `react-router-dom` | `^6.22.0` | Client-side routing |
| `@tanstack/react-query` | `^5.95.2` | Server state management |
| `axios` | `^1.13.6` | HTTP client |
| `lucide-react` | `^0.577.0` | Icon library |
| `canvas-confetti` | `^1.9.4` | Celebration animations |
| `tailwindcss` | `^3.4.0` | Utility CSS |

### Root (monorepo, Playwright e2e only)

| Package | Version | Purpose |
|---------|---------|---------|
| `@playwright/test` | `^1.50.1` | E2E testing |

## Build Tools

| Tool | Config | Notes |
|------|--------|-------|
| TypeScript | `backend/tsconfig.json`, `frontend/tsconfig.json` | Backend: `tsc` emits to `dist/`; Frontend: `tsc` for typecheck only (`noEmit: true`) |
| Vite | `frontend/vite.config.ts` | React plugin, dev proxy, Vitest integration |
| Prisma CLI | `backend/prisma/schema.prisma` | `prisma generate`, `prisma db push`, `prisma db seed` |
| ts-node | Backend dev scripts | `ts-node --transpile-only` for dev and seed |
| ts-jest | `backend/jest.config.js` | Preset for backend unit tests |
| PostCSS | `frontend/postcss.config.js` | Tailwind + Autoprefixer |

## Database

| Property | Value |
|----------|-------|
| Engine | **SQLite** (file-based) |
| ORM | **Prisma** (`@prisma/client ^5.22.0`) |
| Schema | `backend/prisma/schema.prisma` |
| Dev path | `file:./dev.db` |
| Production path | `${DATA_DIR}/chore-ganizer.db` (default `/opt/app-data/chore-ganizer/chore-ganizer.db`) |
| Models | `User`, `ChoreTemplate`, `ChoreAssignment`, `PointLog`, `RecurringChore`, `RecurringOccurrence`, `UserBadge` |
| Migration strategy | **No migration files**; `prisma db push` (schema push) only |
| Enums | Not used (SQLite has none); `role`, `status`, `type`, `frequency` are plain `String` |

## Auth Mechanism

| Component | Implementation |
|-----------|---------------|
| Password hashing | `bcrypt` with 10-round salt |
| Session management | `express-session` with in-memory `MemoryStore` (no persistence across restarts) |
| Session cookie | `connect.sid`; `httpOnly`, configurable `secure`/`sameSite` |
| CSRF | Hand-rolled double-submit cookie (`XSRF-TOKEN` + `x-xsrf-token` header) |
| Auth middleware | `authenticate` (verifies session + DB user); `authorize(...roles)` (role check) |
| Roles | `PARENT`, `CHILD` (plain strings) |
| No OAuth/SSO | Custom email+password only |

## Dev Tools

| Tool | Framework | Config |
|------|-----------|--------|
| Backend unit tests | Jest v30 + ts-jest | `backend/jest.config.js` |
| Backend test HTTP | supertest v7 | Integration-style route testing |
| Frontend unit tests | Vitest v4 + React Testing Library | `frontend/vitest.config.ts` (jsdom, globals) |
| E2E tests | Playwright v1.50 | `e2e/playwright.uat.config.ts` (chromium only) |
| Linting | **None** | No ESLint config |
| Formatting | **None** | No Prettier config |
| Dependency updates | Dependabot | `.github/dependabot.yml` |

## Deployment

| Component | Details |
|-----------|---------|
| Docker images | Two multi-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`); Node 20 Alpine |
| Docker Compose | `docker-compose.yml`; two services on bridge network; bind-mount for data |
| Entrypoint | Backend: `docker-entrypoint.sh` (UID/GID adjust, prisma push, seed if empty, drop to appuser) |
| Image registry | `ghcr.io/thitar/chore-ganizer-{backend,frontend}:{VERSION}` (manual/local build) |
| CI/CD | `.github/workflows/security.yml` only (CodeQL, npm audit, Gitleaks, Semgrep, Trivy). No build/test/deploy. |
| Health checks | Backend: `GET /api/health`; Frontend: `curl -f http://localhost:80` |
