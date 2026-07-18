# Production Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-safe first-parent bootstrap, Compose-managed SQLite backups, secure-cookie proxy handling, and PR quality gates.

**Architecture:** The backend entrypoint replaces implicit demo seeding with a compiled bootstrap script that only creates one configured parent on an empty database. A small independent backup image performs daily SQLite online backups and retention cleanup. Nginx forwards Caddy's HTTPS protocol header unchanged, while a separate CI workflow validates package and container builds without publishing or deploying.

**Tech Stack:** TypeScript, Prisma 5/SQLite, Express, Docker Compose, Alpine `sqlite3`/`crond`, Nginx, GitHub Actions.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/scripts/bootstrap-parent.ts` | Validates bootstrap environment and creates the sole first parent. |
| `backend/src/__tests__/scripts/bootstrap-parent.test.ts` | Unit coverage for bootstrap validation, idempotency, and no-demo-data behavior. |
| `backend/docker-entrypoint.sh` | Invokes bootstrap only after schema synchronization. |
| `backup/Dockerfile` | Builds the isolated backup sidecar image. |
| `backup/docker-entrypoint.sh` | Renders the configured cron schedule and starts `crond`. |
| `backup/backup.sh` | Creates online SQLite backups and prunes expired files. |
| `backup/test-backup.sh` | Verifies backup creation, readability, and retention against a disposable database. |
| `docker-compose.yml` | Wires bootstrap variables and the backup sidecar into the stack. |
| `frontend/nginx.conf.template` | Preserves Caddy's forwarded protocol header for Express. |
| `frontend/test-nginx-proxy.sh` | Asserts the Nginx template preserves the incoming forwarded protocol. |
| `.github/workflows/quality.yml` | Pull-request test, typecheck, build, and Docker build gates. |
| `.env.example`, `backend/.env.example` | Document Compose and standalone backend bootstrap/backup settings. |
| `docs/OPERATIONS.md` | Documents bootstrap, backup, proxy, secure-cookie rollout, and smoke testing. |
| `docs/HANDOFF-2026-07-13.md` | Removed after its remaining findings are represented above. |

### Task 1: First-Parent Bootstrap

**Files:**
- Create: `backend/src/scripts/bootstrap-parent.ts`
- Create: `backend/src/__tests__/scripts/bootstrap-parent.test.ts`
- Modify: `backend/docker-entrypoint.sh:31-39`
- Modify: `docker-compose.yml:47-68`
- Modify: `.env.example:38-70`
- Modify: `backend/.env.example:8-42`

- [ ] **Step 1: Write failing bootstrap tests**

Create `backend/src/__tests__/scripts/bootstrap-parent.test.ts`. Mock `../../config/prisma` and `bcrypt`, import `bootstrapParent`, and isolate process environment between tests. Cover all four required values, optional color, and existing-user no-op behavior:

```ts
jest.mock('../../config/prisma', () => ({
  prisma: { user: { count: jest.fn(), create: jest.fn() } },
}))
jest.mock('bcrypt', () => ({ hash: jest.fn() }))

import { prisma } from '../../config/prisma'
import { hash } from 'bcrypt'
import { bootstrapParent } from '../../scripts/bootstrap-parent'

describe('bootstrapParent', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = {
      ...originalEnv,
      BOOTSTRAP_PARENT_NAME: 'Parent',
      BOOTSTRAP_PARENT_EMAIL: 'parent@example.test',
      BOOTSTRAP_PARENT_PASSWORD: 'initial-password',
      BOOTSTRAP_PARENT_COLOR: '#4F46E5',
    }
  })

  afterAll(() => { process.env = originalEnv })

  it('creates exactly one bcrypt-hashed parent on an empty database', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
    ;(hash as jest.Mock).mockResolvedValue('bcrypt-hash')
    ;(prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 })

    await bootstrapParent()

    expect(hash).toHaveBeenCalledWith('initial-password', 10)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Parent', email: 'parent@example.test', password: 'bcrypt-hash',
        role: 'PARENT', color: '#4F46E5',
      },
    })
  })

  it('fails without creating data when an empty database lacks bootstrap credentials', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(0)
    delete process.env.BOOTSTRAP_PARENT_PASSWORD

    await expect(bootstrapParent()).rejects.toThrow(/BOOTSTRAP_PARENT_PASSWORD/)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('skips bootstrap without reading credentials when a user already exists', async () => {
    ;(prisma.user.count as jest.Mock).mockResolvedValue(1)
    delete process.env.BOOTSTRAP_PARENT_NAME
    delete process.env.BOOTSTRAP_PARENT_EMAIL
    delete process.env.BOOTSTRAP_PARENT_PASSWORD

    await expect(bootstrapParent()).resolves.toEqual({ created: false })
    expect(prisma.user.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest src/__tests__/scripts/bootstrap-parent.test.ts`

Expected: FAIL because `../../scripts/bootstrap-parent` does not exist.

- [ ] **Step 3: Implement the minimal bootstrap script**

Create `backend/src/scripts/bootstrap-parent.ts`:

```ts
import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

function required(name: 'BOOTSTRAP_PARENT_NAME' | 'BOOTSTRAP_PARENT_EMAIL' | 'BOOTSTRAP_PARENT_PASSWORD') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} must be set when initializing an empty database`)
  return value
}

export async function bootstrapParent() {
  if (await prisma.user.count() > 0) return { created: false }

  const name = required('BOOTSTRAP_PARENT_NAME')
  const email = required('BOOTSTRAP_PARENT_EMAIL')
  const password = required('BOOTSTRAP_PARENT_PASSWORD')
  const color = process.env.BOOTSTRAP_PARENT_COLOR || '#4F46E5'

  if (name.length > 50) throw new Error('BOOTSTRAP_PARENT_NAME must be 1-50 characters')
  if (!EMAIL_REGEX.test(email)) throw new Error('BOOTSTRAP_PARENT_EMAIL must be a valid email address')
  if (password.length < 6) throw new Error('BOOTSTRAP_PARENT_PASSWORD must be at least 6 characters')
  if (!HEX_REGEX.test(color)) throw new Error('BOOTSTRAP_PARENT_COLOR must be a hex color (#RRGGBB)')

  await prisma.user.create({
    data: { name, email, password: await bcrypt.hash(password, 10), role: 'PARENT', color },
  })
  return { created: true }
}

if (require.main === module) {
  bootstrapParent()
    .then(({ created }) => console.log(created ? '[bootstrap] Created first parent' : '[bootstrap] User exists; skipped'))
    .catch((error) => { console.error(`[bootstrap] ${error.message}`); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
```

- [ ] **Step 4: Replace implicit demo seeding with bootstrap invocation**

Replace `backend/docker-entrypoint.sh` lines 31-39 with:

```sh
# Initialize a real household only when no user exists. Demo fixtures remain
# available through the explicit `prisma db seed` development command.
echo "[entrypoint] Checking whether first-parent bootstrap is needed"
USER_COUNT=$(su-exec appuser node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => { console.log(c); p.\$disconnect(); })")
if [ "$USER_COUNT" = "0" ]; then
    echo "[entrypoint] Initializing first parent"
    su-exec appuser node dist/scripts/bootstrap-parent.js
else
    echo "[entrypoint] Database already has $USER_COUNT users, skipping bootstrap"
fi
```

Add these backend environment pass-through values immediately after `SESSION_SECRET` in `docker-compose.yml`:

```yaml
      - BOOTSTRAP_PARENT_NAME=${BOOTSTRAP_PARENT_NAME:-}
      - BOOTSTRAP_PARENT_EMAIL=${BOOTSTRAP_PARENT_EMAIL:-}
      - BOOTSTRAP_PARENT_PASSWORD=${BOOTSTRAP_PARENT_PASSWORD:-}
      - BOOTSTRAP_PARENT_COLOR=${BOOTSTRAP_PARENT_COLOR:-#4F46E5}
```

- [ ] **Step 5: Document bootstrap variables in both templates**

Add this root `.env.example` block after `SESSION_SECRET`:

```dotenv
# Required only for the first startup of an empty production database. Creates
# one PARENT and no demo chores/templates. Remove after first successful login.
BOOTSTRAP_PARENT_NAME=Parent
BOOTSTRAP_PARENT_EMAIL=parent@example.com
BOOTSTRAP_PARENT_PASSWORD=CHANGE_ME_TO_A_TEMPORARY_PASSWORD
BOOTSTRAP_PARENT_COLOR=#4F46E5
```

Add the equivalent commented block to `backend/.env.example`, explaining it is used only by the Docker Compose entrypoint, not `npm run dev`.

- [ ] **Step 6: Run focused and full backend verification**

Run:

```bash
cd backend
npx jest src/__tests__/scripts/bootstrap-parent.test.ts
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npm run prisma:seed
DATABASE_URL="file:./dev.db" npm test
npx tsc --noEmit
npm run build
```

Expected: bootstrap tests pass, all backend tests pass, typecheck/build exit 0.

- [ ] **Step 7: Commit the bootstrap slice**

```bash
git add backend/src/scripts/bootstrap-parent.ts backend/src/__tests__/scripts/bootstrap-parent.test.ts backend/docker-entrypoint.sh docker-compose.yml .env.example backend/.env.example
git commit -m "feat: bootstrap first production parent"
```

### Task 2: Compose-Managed SQLite Backups

**Files:**
- Create: `backup/Dockerfile`
- Create: `backup/docker-entrypoint.sh`
- Create: `backup/backup.sh`
- Modify: `docker-compose.yml:38-79`
- Modify: `.env.example:22-37`

- [ ] **Step 1: Create a failing shell-level backup test script**

Create `backup/test-backup.sh` with an isolated temporary database. It must create a source database, run `backup.sh` with `DATABASE_FILE`/`BACKUP_DIR` pointing at the temp paths, and assert one readable backup exists:

```sh
#!/bin/sh
set -eu
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sqlite3 "$tmp/source.db" 'create table check_data (value text); insert into check_data values ("ok");'
DATABASE_FILE="$tmp/source.db" BACKUP_DIR="$tmp/backups" BACKUP_RETENTION_DAYS=14 ./backup.sh
backup=$(find "$tmp/backups" -name 'chore-ganizer-*.db' -type f)
test -n "$backup"
test "$(sqlite3 "$backup" 'select value from check_data;')" = 'ok'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backup && chmod +x test-backup.sh && ./test-backup.sh`

Expected: FAIL because `backup.sh` does not exist.

- [ ] **Step 3: Implement the backup command and scheduler entrypoint**

Create `backup/backup.sh`:

```sh
#!/bin/sh
set -eu

DATABASE_FILE="${DATABASE_FILE:-/data/chore-ganizer.db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

test -r "$DATABASE_FILE" || { echo "[backup] Database is not readable: $DATABASE_FILE" >&2; exit 1; }
case "$BACKUP_RETENTION_DAYS" in ''|*[!0-9]*) echo "[backup] BACKUP_RETENTION_DAYS must be a positive integer" >&2; exit 1;; esac
test "$BACKUP_RETENTION_DAYS" -gt 0 || { echo "[backup] BACKUP_RETENTION_DAYS must be positive" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_DIR/chore-ganizer-$timestamp.db"

sqlite3 "$DATABASE_FILE" ".backup '$target'"
sqlite3 "$target" 'pragma integrity_check;' | grep -qx ok
expire_after=$((BACKUP_RETENTION_DAYS - 1))
find "$BACKUP_DIR" -type f -name 'chore-ganizer-*.db' -mtime +"$expire_after" -delete
echo "[backup] Created and verified $target"
```

Create `backup/docker-entrypoint.sh`:

```sh
#!/bin/sh
set -eu

schedule="${BACKUP_SCHEDULE:-0 3 * * *}"
printf '%s /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1\n' "$schedule" > /etc/crontabs/root
echo "[backup] Scheduled '$schedule'; retaining ${BACKUP_RETENTION_DAYS:-14} days"
exec crond -f -l 2
```

Create `backup/Dockerfile`:

```dockerfile
FROM alpine:3.22
RUN apk add --no-cache sqlite
COPY backup.sh /usr/local/bin/backup.sh
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
```

- [ ] **Step 4: Add the isolated sidecar to Compose**

Add this service after `backend` in `docker-compose.yml`:

```yaml
  backup:
    build:
      context: ./backup
      dockerfile: Dockerfile
    container_name: chore-ganizer-backup
    restart: unless-stopped
    environment:
      - DATABASE_FILE=/data/chore-ganizer.db
      - BACKUP_DIR=/backups
      - BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-0 3 * * *}
      - BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
    volumes:
      - ${DATA_DIR:-/opt/app-data/chore-ganizer}:/data:ro
      - ${BACKUP_DIR:-/opt/app-data/chore-ganizer-backups}:/backups
    depends_on:
      backend:
        condition: service_healthy
```

Add `BACKUP_DIR`, `BACKUP_SCHEDULE`, and `BACKUP_RETENTION_DAYS` examples to root `.env.example`.

- [ ] **Step 5: Run backup and Compose verification**

Run:

```bash
cd backup
./test-backup.sh
docker build -t chore-ganizer-backup:local .
cd ..
docker compose config
```

Expected: test creates an integrity-checked SQLite copy, the image builds, and Compose validates.

- [ ] **Step 6: Commit the backup slice**

```bash
git add backup docker-compose.yml .env.example
git commit -m "feat: add scheduled sqlite backups"
```

### Task 3: Preserve HTTPS Through Nginx and Add PR Quality Gates

**Files:**
- Modify: `frontend/nginx.conf.template:13-22`
- Create: `.github/workflows/quality.yml`

- [ ] **Step 1: Add a failing Nginx-template assertion**

Create `frontend/test-nginx-proxy.sh`:

```sh
#!/bin/sh
set -eu
grep -F 'proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;' nginx.conf.template
```

- [ ] **Step 2: Run the assertion to verify it fails**

Run: `cd frontend && chmod +x test-nginx-proxy.sh && ./test-nginx-proxy.sh`

Expected: exit 1 because the template currently uses `$scheme`.

- [ ] **Step 3: Preserve Caddy's protocol header**

Replace the proxy header in `frontend/nginx.conf.template`:

```nginx
proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
```

This ensures Caddy's default `X-Forwarded-Proto: https` reaches the backend instead of being replaced by Nginx's internal HTTP scheme.

- [ ] **Step 4: Add the PR quality workflow**

Create `.github/workflows/quality.yml`:

```yaml
name: Quality

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx prisma db push
        env:
          DATABASE_URL: file:./dev.db
      - run: npm run prisma:seed
        env:
          DATABASE_URL: file:./dev.db
      - run: npm test
        env:
          DATABASE_URL: file:./dev.db
      - run: npx tsc --noEmit
      - run: npm run build

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npx tsc --noEmit
      - run: npm run build

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: docker build --tag chore-ganizer-backend:ci ./backend
      - run: docker build --tag chore-ganizer-frontend:ci ./frontend
      - run: docker build --tag chore-ganizer-backup:ci ./backup
```

- [ ] **Step 5: Verify proxy and workflow syntax locally**

Run:

```bash
cd frontend && ./test-nginx-proxy.sh && npm test && npx tsc --noEmit && npm run build
cd ..
docker build -t chore-ganizer-frontend:local ./frontend
```

Expected: Nginx assertion passes; all frontend checks and image build exit 0.

- [ ] **Step 6: Commit the proxy and CI slice**

```bash
git add frontend/nginx.conf.template frontend/test-nginx-proxy.sh .github/workflows/quality.yml
git commit -m "ci: validate production builds on pull requests"
```

### Task 4: Production Documentation and Handoff Cleanup

**Files:**
- Modify: `docs/OPERATIONS.md:22-100`
- Delete: `docs/HANDOFF-2026-07-13.md`

- [ ] **Step 1: Update startup and environment documentation**

Replace the automatic demo-seeding statement in `docs/OPERATIONS.md` with the first-parent bootstrap behavior. Add table rows for `BOOTSTRAP_PARENT_NAME`, `BOOTSTRAP_PARENT_EMAIL`, `BOOTSTRAP_PARENT_PASSWORD`, `BOOTSTRAP_PARENT_COLOR`, `BACKUP_DIR`, `BACKUP_SCHEDULE`, and `BACKUP_RETENTION_DAYS`. Remove the inaccurate `LOG_LEVEL` row because Compose no longer passes it through.

- [ ] **Step 2: Replace manual-backup-only documentation**

Document the backup container commands:

```bash
docker compose logs backup
docker compose exec backup /usr/local/bin/backup.sh
ls -lh "${BACKUP_DIR}"
```

Document restoration with an explicit selected backup:

```bash
docker compose stop backend
cp "${BACKUP_DIR}/chore-ganizer-YYYYMMDDTHHMMSSZ.db" "${DATA_DIR}/chore-ganizer.db"
docker compose start backend
```

- [ ] **Step 3: Add a secure-cookie rollout runbook**

Add these ordered requirements to `OPERATIONS.md`:

```text
1. Validate and reload the host Caddyfile; Caddy must terminate HTTPS and preserve its default X-Forwarded-Proto header.
2. Deploy the branch with ./docker-compose.sh up --build -d.
3. Confirm nginx forwards the incoming header with docker compose exec frontend nginx -T.
4. Set SECURE_COOKIES=true in the host .env and recreate backend/frontend.
5. In a private browser window, verify persistent login, one mutating request, chore completion, configured notification delivery, and /api/health.
6. On failed persistent login, restore SECURE_COOKIES=false and recreate services before investigating.
```

- [ ] **Step 4: Remove the obsolete handoff**

Delete `docs/HANDOFF-2026-07-13.md`; its outstanding environment, deployment, and secure-cookie details are now represented in `.env.example` and `OPERATIONS.md`.

- [ ] **Step 5: Verify documentation references and Compose configuration**

Run:

```bash
git diff --check
if git grep -n 'LOG_LEVEL\|NTFY_DEFAULT_TOPIC' -- docker-compose.yml .env.example backend/.env.example docs/OPERATIONS.md; then
  exit 1
fi
docker compose config
```

Expected: no whitespace errors; no live configuration references to the removed variables; Compose validates.

- [ ] **Step 6: Commit the documentation slice**

```bash
git add docs/OPERATIONS.md .env.example backend/.env.example docs/HANDOFF-2026-07-13.md
git commit -m "docs: document production operations"
```

### Task 5: Final Branch Verification and Production Checkpoint

**Files:**
- Modify: `docs/OPERATIONS.md` only if verification identifies an incorrect command.

- [ ] **Step 1: Run all local quality checks**

Run:

```bash
cd backend && npm ci && DATABASE_URL="file:./dev.db" npx prisma db push && DATABASE_URL="file:./dev.db" npm run prisma:seed && DATABASE_URL="file:./dev.db" npm test && npx tsc --noEmit && npm run build
cd ../frontend && npm ci && npm test && npx tsc --noEmit && npm run build
cd ..
docker build -t chore-ganizer-backend:local ./backend
docker build -t chore-ganizer-frontend:local ./frontend
docker build -t chore-ganizer-backup:local ./backup
docker compose config
```

Expected: all commands exit 0.

- [ ] **Step 2: Review the branch before requesting merge**

Run:

```bash
git status --short
git diff main...HEAD --check
git log --oneline main..HEAD
```

Expected: only the planned bootstrap, backup, proxy, CI, env, and documentation changes are present.

- [ ] **Step 3: Commit any verification-only documentation correction**

If a command in `OPERATIONS.md` required correction during verification:

```bash
git add docs/OPERATIONS.md
git commit -m "docs: correct production verification commands"
```

- [ ] **Step 4: Use the post-merge live checkpoint**

Do not automatically deploy the branch. After merge, follow the runbook's Caddy validation, Compose rebuild, first-parent bootstrap, backup verification, secure-cookie flip, private-window login, CSRF mutation, completion, notification, and health checks. Roll back `SECURE_COOKIES=false` immediately if login does not persist.

## Plan Self-Review

- Spec coverage: Task 1 implements first-parent bootstrap and preserves explicit demo seeding; Task 2 implements daily 14-day SQLite backups; Task 3 fixes proxy forwarding and PR quality gates; Task 4 reconciles environments/docs and removes the handoff; Task 5 specifies local and live validation.
- Placeholder scan: no unresolved placeholders, TODOs, or undefined implementation choices remain.
- Type consistency: bootstrap variables, backup environment names, script paths, and test commands are defined once and used consistently across tasks.
