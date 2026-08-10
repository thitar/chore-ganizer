# Persistent Session Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop re-logins by making sessions survive backend restarts/redeploys (persistent SQLite-backed session store) and raising the default session lifetime from 7 to 30 days.

**Architecture:** Add a `Session` model to the existing Prisma SQLite database. Implement a small `PrismaSessionStore` extending `express-session`'s `Store` that reads/writes sessions through the already-present Prisma client (no new dependencies, no native modules). Wire it into the session middleware in `app.ts` and raise the default `SESSION_MAX_AGE`. The existing `prisma db push` in `docker-entrypoint.sh` auto-creates the table on deploy; sessions ride along with the main DB in the existing backup sidecar.

**Tech Stack:** TypeScript, Express, `express-session`, Prisma 5 + SQLite, Jest (ts-jest), supertest.

**Spec:** `docs/superpowers/specs/2026-08-08-persistent-session-storage-design.md`

---

## File Structure

- **Create:** `backend/src/config/sessionStore.ts` — `PrismaSessionStore` class implementing the `express-session` store API (`get`/`set`/`destroy`/`touch`/`all`/`length`/`clear`) plus an hourly expired-session prune. Imports `prisma` from `./prisma` directly (repo convention — see `backend/src/config/prisma.ts`).
- **Create:** `backend/src/config/__tests__/sessionStore.test.ts` — unit tests with the inline `jest.mock('../prisma', ...)` pattern (per AGENTS.md).
- **Create:** `backend/src/__tests__/auth.session.test.ts` — integration test proving a session written by one app instance is replayed by a fresh app instance over the same DB (simulated restart).
- **Modify:** `backend/prisma/schema.prisma` — add `Session` model.
- **Modify:** `backend/src/app.ts` — add `store` to the session config; raise default `SESSION_MAX_AGE`.
- **Modify:** `docker-compose.yml` — raise default `SESSION_MAX_AGE`.
- **Modify:** `backend/package.json`, `frontend/package.json` — bump `APP_VERSION`.
- **Modify (docs):** `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md`, `docs/project_notes/key_facts.md`, `docs/project_notes/decisions.md`, `docs/project_notes/issues.md`.

**Ordering constraint:** Task 1 (schema + `prisma db push`) MUST precede Task 2. The store's module references `prisma.session.*`, which only typechecks after the Prisma client is regenerated with the `Session` model (ts-jest typechecks every compiled file).

---

### Task 1: Add `Session` model and regenerate the Prisma client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the `Session` model**

Append this model to the end of `backend/prisma/schema.prisma` (after the `GameHighScore` model):

```prisma
model Session {
  id        String   @id @default(cuid())
  sid       String   @unique
  data      String   // JSON-serialized express-session session
  expires   DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([expires])
}
```

- [ ] **Step 2: Apply the schema to the dev database and regenerate the client**

Run from the `backend/` directory:

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
```

Expected: output includes `The database is now in sync with the schema` and a regenerated Prisma client. (`db push` also runs `prisma generate`, so no separate generate step is needed.)

- [ ] **Step 3: Verify the client exposes the `session` model**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.session.count().then(c=>{console.log('session count:',c); return p.\$disconnect();})"
```

Expected: prints `session count: 0` (table exists, empty).

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add Session model for persistent session storage"
```

---

### Task 2: Implement `PrismaSessionStore` (TDD)

**Files:**
- Create: `backend/src/config/__tests__/sessionStore.test.ts`
- Create: `backend/src/config/sessionStore.ts`

- [ ] **Step 1: Write the failing unit test**

Create `backend/src/config/__tests__/sessionStore.test.ts`:

```ts
jest.mock('../prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const { prisma } = require('../prisma')

let PrismaSessionStore: typeof import('../sessionStore').PrismaSessionStore

beforeEach(() => {
  // Mirror the pattern from points.service.test.ts: reset implementations and
  // re-require the store so it binds to the mocked prisma module.
  prisma.session.findUnique.mockReset().mockResolvedValue(null)
  prisma.session.upsert.mockReset().mockResolvedValue({ id: 'x' })
  prisma.session.updateMany.mockReset().mockResolvedValue({ count: 1 })
  prisma.session.deleteMany.mockReset().mockResolvedValue({ count: 1 })
  prisma.session.findMany.mockReset().mockResolvedValue([])
  prisma.session.count.mockReset().mockResolvedValue(0)
  delete require.cache[require.resolve('../sessionStore')]
  PrismaSessionStore = require('../sessionStore').PrismaSessionStore
})

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    sid: 'abc',
    data: JSON.stringify({ cookie: { originalMaxAge: 2592000000 }, userId: 1, role: 'PARENT' }),
    expires: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('PrismaSessionStore.get', () => {
  it('returns the deserialized session for an existing unexpired row', async () => {
    prisma.session.findUnique.mockResolvedValue(row())
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toEqual(expect.objectContaining({ userId: 1, role: 'PARENT' }))
        resolve()
      })
    })
    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { sid: 'abc' } })
  })

  it('returns null for a missing row', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('missing', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toBeNull()
        resolve()
      })
    })
  })

  it('returns null and deletes an expired row', async () => {
    prisma.session.findUnique.mockResolvedValue(row({ expires: new Date(Date.now() - 1000) }))
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.get('abc', (err, sess) => {
        if (err) return reject(err)
        expect(sess).toBeNull()
        resolve()
      })
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { sid: 'abc' } })
  })
})

describe('PrismaSessionStore.set', () => {
  it('upserts the serialized session with the cookie expiry', async () => {
    const sessionData = {
      cookie: { originalMaxAge: 2592000000, expires: new Date(Date.now() + 60_000) },
      userId: 1,
      role: 'PARENT',
    }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.set('abc', sessionData, (err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.upsert).toHaveBeenCalledWith({
      where: { sid: 'abc' },
      create: { sid: 'abc', data: JSON.stringify(sessionData), expires: sessionData.cookie.expires },
      update: { data: JSON.stringify(sessionData), expires: sessionData.cookie.expires },
    })
  })

  it('uses a far-future expiry when the session cookie has none', async () => {
    const sessionData = { cookie: { originalMaxAge: null }, userId: 1 }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.set('abc', sessionData, (err) => (err ? reject(err) : resolve()))
    })
    const call = prisma.session.upsert.mock.calls[0][0]
    expect(call.create.expires.getTime()).toBeGreaterThan(Date.now() + 300 * 24 * 60 * 60 * 1000)
  })
})

describe('PrismaSessionStore.destroy', () => {
  it('deletes the session row by sid', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.destroy('abc', (err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { sid: 'abc' } })
  })
})

describe('PrismaSessionStore.touch', () => {
  it('updates only the expires column (no re-serialization)', async () => {
    const sessionData = {
      cookie: { originalMaxAge: 2592000000, expires: new Date(Date.now() + 60_000) },
      userId: 1,
    }
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve) => {
      store.touch('abc', sessionData, resolve)
    })
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { sid: 'abc' },
      data: { expires: sessionData.cookie.expires },
    })
    expect(prisma.session.upsert).not.toHaveBeenCalled()
  })
})

describe('PrismaSessionStore.all / length / clear', () => {
  it('all returns only unexpired sessions keyed by sid', async () => {
    const live = row({ sid: 'live' })
    prisma.session.findMany.mockResolvedValue([live, row({ sid: 'stale', expires: new Date(Date.now() - 1000) })])
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.all((err, sessions) => {
        if (err) return reject(err)
        expect(Object.keys(sessions as Record<string, unknown>)).toEqual(['live'])
        resolve()
      })
    })
  })

  it('length returns the row count', async () => {
    prisma.session.count.mockResolvedValue(3)
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.length((err, count) => {
        if (err) return reject(err)
        expect(count).toBe(3)
        resolve()
      })
    })
  })

  it('clear deletes all rows', async () => {
    const store = new PrismaSessionStore()
    await new Promise<void>((resolve, reject) => {
      store.clear((err) => (err ? reject(err) : resolve()))
    })
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({})
  })
})

describe('PrismaSessionStore.pruneExpired', () => {
  it('deletes rows whose expires is in the past', async () => {
    const store = new PrismaSessionStore()
    await store.pruneExpired()
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { expires: { lt: expect.any(Date) } },
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest src/config/__tests__/sessionStore.test.ts
```

Expected: FAIL — `Cannot find module '../sessionStore'` (the module doesn't exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `backend/src/config/sessionStore.ts`:

```ts
import session from 'express-session'
import { prisma } from './prisma'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_SESSION_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000

export class PrismaSessionStore extends session.Store {
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    super()
    this.startCleanup()
  }

  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void {
    prisma.session
      .findUnique({ where: { sid } })
      .then((row) => {
        if (!row) {
          callback(null, null)
          return
        }
        if (row.expires.getTime() <= Date.now()) {
          prisma.session.deleteMany({ where: { sid } }).catch(() => undefined)
          callback(null, null)
          return
        }
        callback(null, JSON.parse(row.data) as session.SessionData)
      })
      .catch(callback)
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): void {
    const expires = sessionData.cookie?.expires ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MS)
    prisma.session
      .upsert({
        where: { sid },
        create: { sid, data: JSON.stringify(sessionData), expires },
        update: { data: JSON.stringify(sessionData), expires },
      })
      .then(() => callback?.())
      .catch(callback)
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    prisma.session
      .deleteMany({ where: { sid } })
      .then(() => callback?.())
      .catch(callback)
  }

  touch(sid: string, sessionData: session.SessionData, callback?: () => void): void {
    const expires = sessionData.cookie?.expires ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MS)
    prisma.session
      .updateMany({ where: { sid }, data: { expires } })
      .then(() => callback?.())
      .catch(() => callback?.())
  }

  all(callback: (err: any, obj?: session.SessionData[] | { [sid: string]: session.SessionData } | null) => void): void {
    prisma.session
      .findMany()
      .then((rows) => {
        const sessions: { [sid: string]: session.SessionData } = {}
        for (const row of rows) {
          if (row.expires.getTime() > Date.now()) {
            sessions[row.sid] = JSON.parse(row.data) as session.SessionData
          }
        }
        callback(null, sessions)
      })
      .catch(callback)
  }

  length(callback: (err: any, length?: number) => void): void {
    prisma.session
      .count()
      .then((count) => callback(null, count))
      .catch(callback)
  }

  clear(callback?: (err?: any) => void): void {
    prisma.session
      .deleteMany({})
      .then(() => callback?.())
      .catch(callback)
  }

  async pruneExpired(): Promise<void> {
    await prisma.session.deleteMany({ where: { expires: { lt: new Date() } } })
  }

  private startCleanup(): void {
    const interval = setInterval(() => {
      this.pruneExpired().catch((err) => {
        console.error('[session-store] Failed to prune expired sessions:', err)
      })
    }, CLEANUP_INTERVAL_MS)
    if (typeof (interval as NodeJS.Timeout).unref === 'function') {
      interval.unref()
    }
  }
}
```

Notes for the implementer:
- The cleanup `setInterval` MUST stay `.unref()`'d (guard included) so it never blocks process exit or keeps Jest from finishing.
- The constructor performs no DB work — Prisma's client is lazy, so constructing the store at import time never connects.

- [ ] **Step 4: Run the test to verify it passes**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest src/config/__tests__/sessionStore.test.ts
```

Expected: PASS — all `describe` blocks green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/sessionStore.ts backend/src/config/__tests__/sessionStore.test.ts
git commit -m "feat: add Prisma-backed express-session store"
```

---

### Task 3: Wire the store into the session middleware

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Add the import**

In `backend/src/app.ts`, add after the existing imports (line 10, `import { isSmtpConfigured } from './config/smtp'`):

```ts
import { PrismaSessionStore } from './config/sessionStore'
```

- [ ] **Step 2: Pass the store to the session middleware**

In `backend/src/app.ts`, change the `app.use(session({...}))` block (lines 70-82) so it reads:

```ts
app.use(session({
  secret: sessionSecret,
  store: new PrismaSessionStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: isSecureCookie,
    httpOnly: true,
    maxAge: sessionMaxAge,
    sameSite: sameSitePolicy,
    path: '/',
  },
}))
```

- [ ] **Step 3: Run the unit-level app tests**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest src/__tests__/app.test.ts src/routes/__tests__/auth.routes.test.ts
```

Expected: PASS. `app.test.ts` requires the real app (store construction does no DB work, interval is unref'd); `auth.routes.test.ts` builds its own MemoryStore-backed app and is unaffected.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat: use persistent PrismaSessionStore in session middleware"
```

---

### Task 4: Raise the default session lifetime to 30 days

**Files:**
- Modify: `backend/src/app.ts:43-44`
- Modify: `docker-compose.yml:73`

- [ ] **Step 1: Update the default in app.ts**

In `backend/src/app.ts`, change the `sessionMaxAge` default:

```ts
const sessionMaxAge = (!process.env.SESSION_MAX_AGE || isNaN(raw) || raw <= 0) ? 2592000000 : raw
```

(`2592000000` ms = 30 days. The env-var override behavior is unchanged.)

- [ ] **Step 2: Update the default in docker-compose.yml**

In `docker-compose.yml`, change line 73:

```yaml
      - SESSION_MAX_AGE=${SESSION_MAX_AGE:-2592000000}
```

- [ ] **Step 3: Verify app startup tests still pass**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest src/__tests__/app.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts docker-compose.yml
git commit -m "feat: raise default session lifetime from 7 to 30 days"
```

---

### Task 5: Integration test — session survives a simulated backend restart

**Files:**
- Create: `backend/src/__tests__/auth.session.test.ts`

- [ ] **Step 1: Write the integration test**

Create `backend/src/__tests__/auth.session.test.ts` (follows the real-DB suite pattern of `backend/src/__tests__/users.test.ts`):

```ts
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/prisma'

describe('persistent session storage', () => {
  let dadId: number | null = null

  beforeAll(async () => {
    await prisma.session.deleteMany({})
    const dad = await prisma.user.findUnique({ where: { email: 'dad@home.local' } })
    dadId = dad ? dad.id : null
  })

  it('stores the session in the DB and replays it across a simulated backend restart', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dad@home.local', password: 'password123' })
    expect(loginRes.status).toBe(200)

    const setCookie = loginRes.headers['set-cookie']
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
    expect(cookies.length).toBeGreaterThan(0)

    const row = await prisma.session.findFirst({
      where: { data: { contains: `"userId":${dadId}` } },
    })
    expect(row).not.toBeNull()
    expect(row!.expires.getTime()).toBeGreaterThan(Date.now())

    // Simulate a backend restart: evict the app module from the require cache so
    // re-requiring builds a fresh app + fresh PrismaSessionStore over the same DB.
    const appPath = require.resolve('../app')
    delete require.cache[appPath]
    const { app: freshApp } = require('../app')

    const meRes = await request(freshApp)
      .get('/api/auth/me')
      .set('Cookie', cookies)
    expect(meRes.status).toBe(200)
    expect(meRes.body.data.email).toBe('dad@home.local')
  })
})
```

- [ ] **Step 2: Run the new test**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest src/__tests__/auth.session.test.ts
```

Expected: PASS. (If it fails with a `P2021 table does not exist`-style error, re-run `DATABASE_URL="file:./dev.db" npx prisma db push` from Task 1 and retry.)

- [ ] **Step 3: Run the full backend suite to confirm no regressions**

Run from `backend/` (cwd matters — running jest from the repo root collects frontend/e2e specs too):

```bash
DATABASE_URL="file:./dev.db" npm test
```

Expected: PASS — all suites. Note: existing integration suites (`users`, `assignments`, etc.) log in via the real app, so they now create `Session` rows in the dev DB; that is expected and not asserted against.

- [ ] **Step 4: Commit**

```bash
git add backend/src/__tests__/auth.session.test.ts
git commit -m "test: prove sessions persist across a simulated backend restart"
```

---

### Task 6: Bump APP_VERSION

**Files:**
- Modify: `backend/package.json:3`
- Modify: `frontend/package.json:4`

- [ ] **Step 1: Bump both versions to 3.4.0**

In `backend/package.json` and `frontend/package.json`, change the `"version"` field from `3.3.12` to `3.4.0`. Both files must carry identical versions (see AGENTS.md — the root `package.json` is independent and is left alone).

- [ ] **Step 2: Verify the build still typechecks**

Run from `backend/`:

```bash
npm run build
```

Expected: `tsc` exits 0 (the `**/__tests__/**` exclude means tests aren't compiled here).

- [ ] **Step 3: Commit**

```bash
git add backend/package.json frontend/package.json backend/package-lock.json frontend/package-lock.json
git commit -m "chore: bump APP_VERSION to 3.4.0 for persistent session storage"
```

(If the lockfiles don't change, commit without them.)

---

### Task 7: Update docs and project memory

**Files:**
- Modify: `docs/ARCHITECTURE.md` (lines 17, 58, 97)
- Modify: `docs/OPERATIONS.md` (lines 50, 135)
- Modify: `docs/project_notes/key_facts.md` (line 17)
- Modify: `docs/project_notes/decisions.md` (append ADR-009 after ADR-008)
- Modify: `docs/project_notes/issues.md` (append work log entry)
- Modify: `backend/.env.example:39`, `.env.example:59` (best-effort — write access to `.env*` files has historically been denied; see `docs/project_notes/bugs.md`; if denied, surface the exact lines to the user instead)

- [ ] **Step 1: Update ARCHITECTURE.md**

- Line 17 — replace the auth summary:
  ```
  **Auth:** `express-session`, persistent SQLite-backed session store (`PrismaSessionStore`, see [Auth Flow](#auth-flow) below), `bcrypt` for password hashing, a hand-rolled double-submit-cookie CSRF middleware (`backend/src/middleware/csrf.ts`) — not a library like `csurf`.
  ```
- Line 58 — replace the trailing sentence of the History note:
  ```
  The session store is now a persistent Prisma-backed `Session` table in the main DB (implemented 2026-08-08); see `docs/OPERATIONS.md` for the tradeoff that preceded it.
  ```
- Line 97 — replace the "Session store caveat" paragraph:
  ```
  **Session store:** `express-session` is backed by `PrismaSessionStore` (`backend/src/config/sessionStore.ts`), which stores sessions in a `Session` table in the same SQLite database as the rest of the app. Sessions survive backend restarts/redeploys and are included in the existing DB backups. `rolling: true` keeps active users signed in; the default `SESSION_MAX_AGE` is 30 days; expired rows are pruned hourly by the store.
  ```

- [ ] **Step 2: Update OPERATIONS.md**

- Line 50 — update the `SESSION_MAX_AGE` row:
  ```
  | `SESSION_MAX_AGE` | Optional | `2592000000` (30 days, ms) | Session cookie max age. Invalid/non-positive values silently fall back to the default (`app.ts`). |
  ```
- Line 135 — replace the troubleshooting note:
  ```
  Expected if sessions are wiped mid-day — this used to happen because `express-session` ran on the in-memory `MemoryStore`, so a container restart logged everyone out. Sessions are now persisted in a `Session` table in the main DB (`PrismaSessionStore`), so only explicit logouts or a 30-day idle period end a session. If sessions still seem to drop, check that the backend actually restarted and that the `Session` table exists (`npx prisma db push`).
  ```

- [ ] **Step 3: Update key_facts.md**

Line 17 — replace the auth line:
```
- **Auth**: Express sessions (persistent SQLite-backed store via `PrismaSessionStore` — sessions survive backend restarts and are backed up with the main DB; default lifetime 30 days), bcrypt, double-submit-cookie CSRF tokens
```

- [ ] **Step 4: Append ADR-009 to decisions.md**

Add after the ADR-008 block (after line 158):

```markdown
### ADR-009: Persistent SQLite-Backed Session Store — Supersedes ADR-008 (2026-08-08)

**Context:**
- ADR-008 accepted the in-memory `MemoryStore` and deferred a SQLite-backed store pending a concrete trigger: "restarts becoming frequent enough that re-logins are a real nuisance."
- That trigger was met — the family keeps re-entering credentials on multiple devices after every redeploy.

**Decision:**
- Implement the deferred option: a `Session` table in the existing SQLite database, written by a small `PrismaSessionStore` (`backend/src/config/sessionStore.ts`) wrapping the existing Prisma client. Default `SESSION_MAX_AGE` raised from 7 to 30 days.
- Redis remains rejected (no new infrastructure for a single-instance family app). Multi-instance/horizontal scaling would still require revisiting the store choice.

**Consequences:**
- ✅ Sessions survive backend restarts/redeploys; each device logs in once and stays in for up to 30 idle days (`rolling: true`).
- ✅ Sessions are backed up with the main DB by the existing backup sidecar — no new failure modes or containers.
- ✅ No new dependencies; the Prisma client and SQLite were already present. The `Session` table is created automatically by the deploy-time `prisma db push`.
- ⚠️ Every session-touching request now performs a SQLite write instead of an in-memory one; negligible at family scale.
```

- [ ] **Step 5: Log the work in issues.md**

Append a dated entry following the existing format (`### YYYY-MM-DD — description`), e.g.:

```markdown
### 2026-08-08 — Implemented persistent session storage (ADR-009)
- Added a `Session` model to the Prisma schema and a `PrismaSessionStore` (`backend/src/config/sessionStore.ts`) so `express-session` sessions persist in the main SQLite DB across backend restarts/redeploys.
- Raised the default `SESSION_MAX_AGE` from 7 to 30 days (`app.ts`, `docker-compose.yml`).
- Added unit tests for the store and an integration test (`backend/src/__tests__/auth.session.test.ts`) that replays a session across a simulated restart.
- Bumped APP_VERSION to 3.4.0. Supersedes the ADR-008 deferral.
```

- [ ] **Step 6: Update .env.example files (best-effort)**

- `backend/.env.example:39` — change `# SESSION_MAX_AGE=604800000` to `# SESSION_MAX_AGE=2592000000` (30 days).
- `.env.example:59` — change `SESSION_MAX_AGE=604800000` to `SESSION_MAX_AGE=2592000000`.

If either file is read-denied (per `docs/project_notes/bugs.md`, `.env*` paths have historically been write-denied), do NOT force it — report the two exact lines to the user to paste manually.

- [ ] **Step 7: Commit**

```bash
git add docs/ARCHITECTURE.md docs/OPERATIONS.md docs/project_notes/key_facts.md docs/project_notes/decisions.md docs/project_notes/issues.md backend/.env.example .env.example
git commit -m "docs: document persistent session storage and supersede ADR-008"
```

(If an `.env.example` edit failed due to permissions, note it in the commit message and leave it out of the `git add`.)

---

## Final Verification

From the `backend/` directory, with a freshly-synced dev DB:

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npm test
```

Expected: all suites pass, including the new `auth.session.test.ts` and `sessionStore.test.ts`. Then confirm `git log --oneline -8` shows the six feature commits plus the spec commit from brainstorming.

## Non-Goals (from the spec)

- No "Remember me" checkbox or login-form changes.
- No Redis or new containers.
- No multi-instance support.
- No changes to logout, CSRF, rate limiting, or password reset.
