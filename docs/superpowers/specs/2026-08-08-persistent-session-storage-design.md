# Persistent Session Storage Design

## Goal

Stop family members from re-entering username/password so often. Sessions must survive backend restarts/redeploys, and the default session lifetime should be raised so logins last longer across browsers/devices.

## Root Cause

`backend/src/app.ts` uses `express-session`'s default in-memory `MemoryStore` with no `store:` option. Every backend restart (deploy, crash-restart, `docker compose up -d --force-recreate`) wipes all sessions, logging out every device simultaneously. This was documented and accepted in ADR-008 (`docs/project_notes/decisions.md`), which deferred a SQLite-backed session store pending a concrete trigger — frequent re-logins. That trigger has now been met.

Cookie-based auth is inherently per-browser; each device/browser keeps its own session cookie. A persistent store means each device logs in once and that login survives redeploys up to the cookie lifetime.

## Approach

Add a `Session` model to the existing Prisma SQLite database (`chore-ganizer.db`) and a small custom `express-session` store that reads/writes it through the already-present Prisma client. Raise the default `SESSION_MAX_AGE` from 7 days to 30 days. No new dependencies, no native modules, no new containers.

Rejected alternatives:
- `connect-sqlite3` drop-in store — pulls in native `sqlite3`, requiring Docker build tooling not present in `backend/Dockerfile`; creates a second DB file the backup sidecar (`backup/backup.sh`, which only copies `chore-ganizer.db`) does not cover.
- Raising `SESSION_MAX_AGE` alone — does not fix restart-triggered logouts; the MemoryStore is wiped on every restart regardless of cookie maxAge.

## Data Model

Add to `backend/prisma/schema.prisma`:

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

The table is created automatically on next deploy by the existing `npx prisma db push` in `backend/docker-entrypoint.sh` (line 29), and on local bootstrap via the documented `prisma db push` sequence. Sessions are backed up and restored together with the main DB by the existing backup sidecar.

## Store Implementation

New file `backend/src/config/sessionStore.ts` exporting `PrismaSessionStore`, a class extending `express-session`'s `Store`:

- `get(sid, cb)` — `findUnique` by `sid`; missing or expired row → `cb(null, null)`; otherwise `cb(null, JSON.parse(data))`. Expired rows are also deleted lazily here.
- `set(sid, session, cb)` — upsert by `sid`: `JSON.stringify(session)` into `data`, `expires` from `session.cookie.expires` (fallback to a far-future date if absent, since this app always sets `maxAge`).
- `destroy(sid, cb)` — `deleteMany` by `sid`.
- `touch(sid, session, cb)` — update `expires` only (no re-serialization), used by `rolling: true` on every unmodified request.
- `all(cb)` / `clear(cb)` / `length(cb)` — implemented for completeness (used by `req.sessionStore` introspection).
- Cleanup — an hourly `setInterval` running `deleteMany({ where: { expires: { lt: new Date() } } })`, `.unref()`'d so it never blocks process exit or Jest, wrapped in try/catch with a logged warning on failure.

Constraints:
- The constructor must perform no DB work — Prisma's client is lazy, so constructing the store at module load never opens a connection or issues a query. This keeps `app.test.ts` (which requires the real app but issues no requests) passing.
- The cleanup interval must be `.unref()`'d so Jest can exit.

## Wiring and Session Lifetime

In `backend/src/app.ts`:
- Construct `const sessionStore = new PrismaSessionStore(prisma)` (importing the existing `prisma` from `../config/prisma`) and pass `store: sessionStore` to the `session({...})` call at line 70.
- Change the default `SESSION_MAX_AGE` from `604800000` (7 days) to `2592000000` (30 days) at line 44. The env-var override behavior is unchanged.

In `docker-compose.yml`:
- Update the default at line 73: `SESSION_MAX_AGE=${SESSION_MAX_AGE:-2592000000}`.

`rolling: true` remains: an actively used session never expires; an inactive session is dropped after 30 days. Logout behavior is unchanged (`session.destroy` + cookie clear, `auth.routes.ts`).

## Error Handling

- Store failures (e.g., transient SQLite lock) surface as errors from the store callbacks; `express-session` forwards them to the standard Express error handler. No bespoke handling beyond the existing middleware chain.
- Cleanup interval failures are caught and logged; a failed cleanup never crashes the process and never affects request handling.

## Tests

- **Unit (`backend/src/config/__tests__/sessionStore.test.ts`)**: mock `prisma` via the inline `jest.mock('../../config/prisma', ...)` pattern. Cover `get` (hit, miss, expired), `set` (upsert path), `destroy`, `touch` (expires-only update), and the cleanup `deleteMany` call.
- **Integration** (`backend/src/__tests__/auth.session.test.ts`, following the pattern of the other real-DB suites in that directory): imports the real `app` (which now uses `PrismaSessionStore`). After a real login via supertest, assert a `Session` row exists in the DB; then simulate a backend restart by mounting a fresh `app` instance over the same DB and replaying the `connect.sid` cookie against `GET /api/auth/me`, expecting 200 with the logged-in user. This is the core proof that sessions survive redeploys.
- **`app.test.ts`**: must continue to pass unchanged (no requests issued; store construction does no DB work; cleanup interval is unref'd).
- **e2e**: unaffected. The Playwright suite already replays `storageState` sessions instead of driving live logins.

## Version Bump and Docs

- Bump `APP_VERSION` from `3.3.12` to `3.4.0` in both `backend/package.json` and `frontend/package.json` (identical versions per AGENTS.md).
- Update `docs/ARCHITECTURE.md` — remove/replace the MemoryStore caveat in the auth flow section.
- Update `docs/OPERATIONS.md` — `SESSION_MAX_AGE` default now 30 days.
- Update `docs/project_notes/key_facts.md` — auth line now describes the persistent SQLite-backed store.
- Add an ADR entry superseding ADR-008 (persistent store implemented; Redis still rejected).
- Log the work in `docs/project_notes/issues.md`.

## Non-Goals

- No "Remember me" checkbox or login-form changes.
- No Redis or any new container/service.
- No multi-instance/horizontal-scaling support (in-memory and single-DB stores both assume one backend process; revisit per ADR-008 if the app ever scales out).
- No changes to logout, CSRF, rate limiting, or password reset behavior.
