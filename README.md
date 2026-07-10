# Chore-Ganizer

A family chore tracker: parents create and assign chores, kids complete them and earn points, with recurring chores and a points/gamification layer (streaks, levels, badges). Built for self-hosted/homelab deployment by a single family, not multi-tenant SaaS.

## Quick Start

Requires Docker and Docker Compose.

```bash
git clone https://github.com/thitar/chore-ganizer.git
cd chore-ganizer

# Create .env with at minimum:
#   SESSION_SECRET=<openssl rand -base64 32>
#   APP_VERSION=<matches backend/package.json and frontend/package.json>

docker compose up -d
```

Frontend: `http://localhost:3002`. See [docs/OPERATIONS.md](./docs/OPERATIONS.md) for the full environment variable reference, health checks, backups, and troubleshooting.

## Local Development

Requires Node.js 18+.

```bash
cd backend && npm install && npm run dev    # http://localhost:3010
cd frontend && npm install && npm run dev   # http://localhost:5173, proxies /api/* to the backend
```

## Default Credentials

Auto-seeded on first start (only if the database is empty):

- **Parents:** `dad@home.local`, `mom@home.local`
- **Children:** `alice@home.local`, `bob@home.local`
- **Password (all accounts):** `password123`

These are first-run defaults for a private/self-hosted deployment — change them (`backend/prisma/seed.ts`) before exposing the app beyond your own network.

## Architecture

Express + TypeScript + Prisma + SQLite backend, React + TypeScript + Vite frontend, session-based auth with CSRF protection. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design, data model, and key decisions.

## Contributing / AI Agents

This is a personal project; see [AGENTS.md](./AGENTS.md) for the conventions an AI coding agent (or human contributor) needs to know before making changes — testing patterns, non-obvious gotchas, and the project's memory system.
