# Technology Stack

**Analysis Date:** 2026-04-28

## Languages

**Primary:**
- TypeScript 5.3.3 - Backend (`backend/`) and Frontend (`frontend/`) codebases

**Secondary:**
- SQL (SQLite) - Database schema definitions in `backend/prisma/schema.prisma`

## Runtime

**Environment:**
- Node.js 18+ (required for local development, per AGENTS.md Quick Start)

**Package Manager:**
- npm (used for all dependency management and scripts)
- Lockfile: `backend/package-lock.json`, `frontend/package-lock.json` (present)

## Frameworks

**Core:**
- Express.js 4.18.x - Backend web framework (`backend/package.json`)
- React 18.2.x - Frontend UI library (`frontend/package.json`)

**Testing:**
- Jest 30.0.x - Backend unit and integration tests (`backend/package.json`)
- Vitest 4.1.x - Frontend unit tests (`frontend/package.json`)
- Playwright - End-to-end tests (e2e/ directory, per AGENTS.md)

**Build/Dev:**
- Vite 6.2.x - Frontend build tool and dev server (`frontend/package.json`)
- TypeScript 5.3.x - Type checking and compilation for both backend and frontend
- ts-node/nodemon - Backend dev server execution (used by `npm run dev` in backend)

## Key Dependencies

**Critical:**
- Prisma 5.22.x (runtime: @prisma/client ^5.22.0, CLI: prisma ^5.7.1 dev) - ORM for SQLite database
- Express.js 4.18.x - Backend web framework
- React 18.2.x - Frontend UI library
- Axios 1.13.x (frontend), 1.14.x (backend) - HTTP client for API requests
- express-session 1.17.x - Session management for authentication (`backend/package.json`)
- bcrypt 6.0.x - Password hashing for user authentication (`backend/package.json`)
- Tailwind CSS 3.4.x - Frontend utility-first styling (`frontend/package.json`)
- Zod 4.3.x - Request/response validation (shared between backend and frontend)

**Infrastructure:**
- SQLite 3 - Embedded relational database (no separate server required)
- Docker 24.x+ - Containerization for development and production
- nginx - Static file serving and reverse proxy for frontend container
- node-cache 5.1.x - In-memory caching for backend (`backend/package.json`)
- prom-client 15.1.x - Prometheus metrics collection (`backend/package.json`)
- winston 3.11.x - Structured logging for backend (`backend/package.json`)

## Configuration

**Environment:**
- Configured via `.env` file in project root (copy from `.env.example`)
- Critical required variables: `SESSION_SECRET`, `APP_VERSION`
- Full list of variables documented in AGENTS.md and INTEGRATIONS.md

**Build:**
- `backend/tsconfig.json` - TypeScript configuration for backend
- `frontend/tsconfig.json` - TypeScript configuration for frontend
- `frontend/vite.config.ts` - Vite build and dev server configuration
- `docker-compose.yml` - Docker Compose orchestration for backend and frontend containers
- `frontend/postcss.config.js` - PostCSS configuration for Tailwind CSS

## Platform Requirements

**Development:**
- Node.js 18+
- Docker and Docker Compose (for containerized run)
- SQLite (embedded, no separate installation required)
- Git

**Production:**
- Docker-compatible hosting platform
- Persistent volume for data (configured via `DATA_DIR` env var)
- Network access for container ports (frontend: 3002, backend: 3010 by default)

---

*Stack analysis: 2026-04-28*
