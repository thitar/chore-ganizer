# Technology Stack

**Analysis Date:** 2026-05-01

## Languages

**Primary:**
- TypeScript 5.3+ - Used across both backend and frontend
- JavaScript (ES2022) - Build output for Node.js runtime

**Secondary:**
- HTML/CSS - Frontend markup via React JSX and Tailwind CSS
- SQL (SQLite dialect) - Database queries via Prisma ORM
- Shell (Bash) - Docker entrypoint scripts and backup automation

## Runtime

**Environment:**
- Node.js 18+ (CI uses Node.js 20)
- Docker production image: `node:25-slim` (backend), `nginx:alpine` (frontend)
- Docker build image: `node:25-slim` (backend), `node:25-alpine` (frontend)

**Package Manager:**
- npm (with `package-lock.json`)
- Lockfile: present for all three packages (root, backend, frontend)

## Frameworks

**Core Backend:**
- Express.js 4.18 - Web framework and REST API server
- Prisma 5.22 (ORM) + `@prisma/client` 5.22 - Database ORM for SQLite
- node-cron 4.2 - Cron job scheduling for recurring chore occurrences

**Core Frontend:**
- React 18.2 - UI framework
- React Router DOM 6.22 - Client-side routing with lazy loading
- @tanstack/react-query 5.95 - Server state management and API data caching
- Zustand 5.0 - Client-side state management (used sparingly; auth is via React Context)
- Tailwind CSS 3.4 - Utility-first CSS framework
- Recharts 3.7 - Charting library for statistics
- Vite 6.2 - Build tool and dev server

**Testing:**
- Backend: Jest 30 (with ts-jest 29 for TypeScript)
- Frontend: Vitest 4.1 (with @testing-library/react 16)
- E2E: Playwright 1.50 (in root `package.json`)

**Build/Dev:**
- TypeScript compiler (`tsc`) - Backend build output
- Vite (via `vite build`) - Frontend build output
- Nodemon 3.0 - Backend dev server with auto-reload
- ESLint 10 (backend + frontend)
- Prettier (via `npm run format` scripts)
- Docker Compose - Container orchestration

## Key Dependencies

**Critical Backend:**
- `bcrypt` 6.0 - Password hashing for authentication
- `express-session` 1.17 - Server-side session management (SQLite store via Prisma)
- `helmet` 8.1 - Security headers (CSP, XSS, HSTS, etc.)
- `cors` 2.8 - Cross-Origin Resource Sharing
- `express-rate-limit` 8.2 - API rate limiting
- `zod` 4.3 - Request validation schemas
- `winston` 3.11 - Structured JSON logging with correlation IDs
- `prom-client` 15.1 - Prometheus metrics (histograms, counters, gauges)
- `compression` 1.8 - Gzip/brotli response compression
- `dotenv` 17.3 - Environment variable loading
- `nodemailer` 8.0 - SMTP email notifications
- `axios` 1.14 - HTTP client for ntfy notifications
- `node-cache` 5.1 - In-memory caching (10-min TTL)
- `uuid` 13.0 - UUID generation for correlation IDs and family IDs
- `tar` 7.5 - Backup/restore archive creation

**Critical Frontend:**
- `axios` 1.13 - HTTP client with CSRF token injection
- `lucide-react` 0.577 - Icon library
- `sonner` 1.3 - Toast notification system
- `zod` 4.3 - Form validation schemas
- `workbox-window` 7.4 - PWA service worker
- `vite-plugin-pwa` 1.2 - PWA support (offline, install prompts)

**Infrastructure:**
- `supercronic` 0.2.29 - Cron daemon for backup scheduling in production Docker

## Configuration

**Environment:**
- `.env` file at project root (never committed)
- `SESSION_SECRET` required (no default) - generated via `openssl rand -base64 32`
- `APP_VERSION` required - must match `backend/package.json` version
- `DATA_DIR` - Host path for persistent SQLite database (default: `/opt/app-data/chore-ganizer`)
- `DATABASE_URL` - SQLite file path (default: `file:${DATA_DIR}/chore-ganizer.db`)
- `PUID`/`PGID` - Host user/group IDs for bind mount file ownership (default: `1001`)
- `CORS_ORIGIN` - Allowed frontend origin (default: `http://localhost:3002`)
- `VITE_API_URL` - Frontend API base URL (empty = relative URLs via nginx proxy)
- `VITE_DEBUG` - Enable frontend debug logging
- `VITE_APP_VERSION` - Frontend version display
- `BACKEND_PORT` - Backend port for nginx API proxy (default: `3010`)

**Build:**
- `backend/tsconfig.json` - Target ES2022, CommonJS modules, strict mode
- `frontend/tsconfig.json` - Target ES2020, ESNext modules, React JSX, strict mode
- `frontend/vite.config.ts` - Vite build config with manual chunk splitting, PWA plugin
- `frontend/vitest.config.ts` - Vitest with jsdom environment
- `backend/jest.config.js` - Jest unit test config, ts-jest preset
- `backend/jest.integration.config.js` - Jest integration test config with global setup/teardown
- `frontend/postcss.config.js` - PostCSS with Tailwind
- `frontend/tailwind.config.js` - Custom theme colors (sidebar, primary, surface, border)

## Platform Requirements

**Development:**
- Node.js 18+ (20+ recommended)
- npm
- SQLite (bundled via Prisma, no external install needed)
- Docker + Docker Compose (for containerized builds)

**Production:**
- Docker Compose with pre-built images from `ghcr.io/thitar/chore-ganizer/`
- SQLite (embedded, no separate DB server)
- Reverse proxy in front of nginx (Caddy/Traefik) for TLS termination
- Persistence via host bind mount for SQLite database and backups

---

*Stack analysis: 2026-05-01*
