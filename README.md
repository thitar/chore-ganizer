# Chore-Ganizer

A family chore tracker: parents create and assign chores, kids complete them and earn points, with recurring chores and a points/gamification layer (streaks, levels, badges). Built for self-hosted/homelab deployment by a single family, not multi-tenant SaaS.

## Quick Start (Local Development)

Requires Node.js 18+, Docker, and Docker Compose.

**Frontend + Backend via Docker:**

```bash
git clone https://github.com/thitar/chore-ganizer.git
cd chore-ganizer
cp .env.example .env
docker compose up -d
```

Frontend: `http://localhost:3002` | Backend: `http://localhost:3010`

Login with dev credentials:

- **Email:** `dad@home.local` or `alice@home.local`
- **Password:** `password123`

**Backend only (npm):**

```bash
cd backend
npm install
npm run dev    # http://localhost:3010
```

**Frontend only (npm):**

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, proxies /api/* to the backend
```

See [docs/OPERATIONS.md](./docs/OPERATIONS.md) for environment variables, health checks, and troubleshooting.

## Production Deployment

For a production setup (without dev credentials), see [docs/PRODUCTION-INSTALLATION.md](./docs/PRODUCTION-INSTALLATION.md). You'll set your own bootstrap parent account and configure backups, secure cookies, and CORS origins.

## Architecture

Express + TypeScript + Prisma + SQLite backend, React + TypeScript + Vite frontend, session-based auth with CSRF protection. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design, data model, and key decisions.

## Contributing / AI Agents

This is a personal project; see [AGENTS.md](./AGENTS.md) for the conventions an AI coding agent (or human contributor) needs to know before making changes — testing patterns, non-obvious gotchas, and the project's memory system.
