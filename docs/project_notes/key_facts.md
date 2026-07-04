# Key Facts

Non-sensitive project configuration and reference information.

## ⚠️ Security Warning

**NEVER store passwords, API keys, or sensitive credentials in this file.**

Store secrets in `.env` (excluded via `.gitignore`) or a password manager.

---

### Project Overview

- **Name**: Chore-Ganizer
- **Stack**: Express.js + TypeScript / React 18 + TypeScript / SQLite / Prisma
- **Auth**: Express sessions (SQLite store), bcrypt, CSRF tokens
- **Roles**: `PARENT`, `CHILD`

### Local Development

**Backend:**
- URL: `http://localhost:3010`
- Dev command: `npm run dev` (from `backend/`)
- Build command: `npm run build`

**Frontend:**
- URL: `http://localhost:5173` (Vite dev server)
- Dev command: `npm run dev` (from `frontend/`)
- Build command: `npm run build`

**API Proxy:** Frontend proxies `/api/*` to backend automatically

### Docker

**Registry:** `ghcr.io/thitar/`
**Images:**
- Backend: `ghcr.io/thitar/chore-ganizer-backend:VERSION`
- Frontend: `ghcr.io/thitar/chore-ganizer-frontend:VERSION`

**Compose file:** `docker-compose.yml` (single file)
**Helper script:** `./docker-compose.sh`

**Ports:**
- Frontend: `3002`
- Backend: `3010`

### Environment Variables

| Variable | Purpose |
|---|---|
| `APP_VERSION` | Must match `backend/package.json` version |
| `SESSION_SECRET` | No default — must be explicitly set |
| `DATA_DIR` | Host path for persistent data (default: `/opt/app-data/chore-ganizer`) |
| `PUID` / `PGID` | Host UID/GID for bind mount file ownership (default: `1001`) |
| `OVERDUE_PENALTY_*` | Configure automatic overdue point deductions |
| `SLOW_REQUEST_THRESHOLD_MS` | Log requests slower than this threshold |
| `COMPRESSION_ENABLED` | Toggle gzip/brotli response compression |
| `ERROR_WEBHOOK_*` | ntfy.sh webhook URL for 500-error alerts |
| `SMTP_*` / `NTFY_*` | Email and push notification config |
| `BACKEND_PORT` | Backend port (default: `3010`) |
| `VITE_API_URL` | Frontend API URL override (empty = relative/proxy) |

### Health & Observability

- `/api/health` — Full health check (DB, memory, disk)
- `/api/health/live` — Liveness probe
- `/api/health/ready` — Readiness probe (DB connectivity)
- `/api/metrics` — Prometheus metrics

### API Response Envelope

```json
{ "success": true, "data": { ... }, "error": null }
```

### Testing

**Backend:**
- Unit tests: `npm test` or `npm run test:unit` (mocked Prisma)
- Integration tests: `npm run test:integration` (real DB, `--runInBand`)
- Test DB: `test-db/integration-test.db`

**Frontend:**
- Tests: `npm test` (Vitest)
- Mock utils: `src/test/utils.tsx`

**E2E:**
- Playwright tests in `e2e/`
- Run: `npm run test:e2e`

### Default Credentials (Dev Only)

- Parents: `dad@home.local`, `mom@home.local`
- Children: `alice@home.local`, `bob@home.local`
- Password: `password123`

### Domain Concepts

- **ChoreTemplate** — Reusable chore definition
- **ChoreAssignment** — One-off instance assigned to a user
- **RecurringChore** — Defines recurrence rule with JSON `recurrenceRule`
- **ChoreOccurrence** — Instances pre-generated daily by background job
- **Chore statuses**: `PENDING`, `COMPLETED`, `PARTIALLY_COMPLETE`
- **PointTransaction types**: `EARNED`, `BONUS`, `DEDUCTION`, `PENALTY`, `PAYOUT`, `ADVANCE`, `ADJUSTMENT`
- **Pocket money**: Stored in cents (integer), not floats
- **OverduePenalty** — Auto point deduction for overdue chores

### Frontend-Backend Parameter Mapping

| Frontend | Backend |
|---|---|
| `userId` | `assignedToId` |
| `fromDate` | `dueDateFrom` |
| `toDate` | `dueDateTo` |

Mapping happens in `frontend/src/api/` files, never in components or hooks.

### Monorepo Structure

```
chore-ganizer/
├── backend/     # Express.js + TypeScript
├── frontend/    # React + Vite
├── e2e/         # Playwright tests
├── docker-compose.yml
└── AGENTS.md    # AI agent instructions
```
