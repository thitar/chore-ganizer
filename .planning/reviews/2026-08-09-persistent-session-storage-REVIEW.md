---
phase: persistent-session-storage-review
reviewed: 2026-08-10T19:57:44Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - backend/src/config/sessionStore.ts
  - backend/src/config/__tests__/sessionStore.test.ts
  - backend/src/__tests__/auth.session.test.ts
  - backend/src/app.ts
  - backend/prisma/schema.prisma
  - docker-compose.yml
critical: 0
warning: 3
info: 3
total: 6
status: issues_found
---

# Persistent Session Storage — Code Review Report

**Reviewed:** 2026-08-10T19:57:44Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The PR replaces express-session's in-memory MemoryStore with `PrismaSessionStore`, a Prisma/SQLite-backed store, and raises the default session lifetime from 7 to 30 days. I reviewed the store, its unit tests, the new real-DB integration test, the app wiring, the `Session` schema, and docker-compose, and cross-checked behavior against the installed express-session 1.19.0 runtime (touch/save dispatch, error propagation, cookie renewal) since the store's correctness depends entirely on that contract.

Overall the implementation is solid: the constructor performs no DB work (verified — `app.test.ts`'s lazy-Prisma assumption holds), the cleanup interval is `.unref()`'d, `regenerate()` on login still prevents session fixation with the DB store, cookie attributes (httpOnly/secure/sameSite/path) are unchanged, login/logout/`authenticate` all behave correctly against the store, and the previously-found blanket-`deleteMany` bug is properly fixed — `auth.session.test.ts` scopes cleanup to its own sids and the hourly prune only touches expired rows, so parallel jest workers' live sessions are safe.

Three warnings remain, all in `sessionStore.ts`: the expired-row lazy delete in `get()` can race with a concurrent `touch()`/`set()` renewal and destroy a legitimately renewed session; `touch()` swallows DB errors so rolling renewal silently diverges from the DB row's expiry; and stored-session JSON is parsed without validation, which turns a single corrupted row into a permanent 500 for that sid. None rise to CRITICAL — no injection, no secret exposure, no session-forgery path (sids remain HMAC-signed; DB access alone cannot forge cookies), and the worst impact is an involuntary re-login.

## Warnings

### WR-01: Lazy delete of expired row in `get()` races with concurrent renewal — session can be destroyed after a successful `touch()`

**File:** `backend/src/config/sessionStore.ts:23-27`

**Description:**
When `get()` finds an expired row it fires a fire-and-forget `deleteMany({ where: { sid } })` (line 24, `.catch(() => undefined)`) and returns `null`. This delete is not conditional on the row still being expired at execution time. Concurrent requests for the same sid can interleave:

1. Request A starts before the expiry instant (session still valid) and is in flight — its response will eventually call `store.touch()` (rolling renewal) or `store.set()`, renewing the row's `expires` to now + 30 days.
2. Request B (a parallel tab / the frontend's parallel API burst) arrives after the expiry instant. Its `get()` sees the still-present row, deems it expired, and issues `deleteMany`.
3. If B's `deleteMany` executes after A's `touch`/`set` (issuance order over the shared SQLite write queue is the only guarantee), the *renewed* row is deleted. A's response already re-sent a fresh cookie; the next request's `get()` returns `null`, express-session generates an empty session, and the user is logged out despite having an active, just-renewed session.

This is exactly the "return after ~30 days idle" scenario the feature targets: the frontend fires several parallel API calls, and one landing milliseconds after expiry can wipe the row that a sibling request, started milliseconds before expiry, just renewed. The delete is also invisible — `.catch(() => undefined)` means nothing is logged when it lands destructively.

Note on the other suspected hazard: express-session does **not** call `touch()` before `set()` for the same request — in v1.19.0's `shouldTouch()` (index.js:475) touch is only dispatched when `!shouldSave(req)`, so save and touch are mutually exclusive per request. Cross-request touch/set interleavings on the same sid are benign (touch only writes `expires`; the upsert always wins). The remaining race is specifically the lazy delete above.

**Impact:** Spurious, unrecoverable-by-refresh logout for a valid session; low probability (requires requests straddling the exact expiry instant) but squarely inside the feature's intended "long-idle user returns" usage. Availability, not data loss.

**Suggested fix:** Drop the lazy delete from `get()` entirely — the hourly `pruneExpired()` (which filters on `expires < now` at execution time) already bounds row growth to ≤1 hour of stale rows, and deleting there is atomic with the filter:

```ts
if (row.expires.getTime() <= Date.now()) {
  callback(null, null)
  return
}
```

If lazy deletion must stay, guard it so it cannot delete a row renewed after the `findUnique` snapshot, e.g. delete only rows matching both sid **and** the observed expired `expires` value:

```ts
if (row.expires.getTime() <= Date.now()) {
  prisma.session
    .deleteMany({ where: { sid, expires: row.expires } })
    .catch(() => undefined)
  callback(null, null)
  return
}
```

### WR-02: `touch()` swallows store errors — rolling renewal silently diverges from the DB row

**File:** `backend/src/config/sessionStore.ts:52-58`

**Description:**
`touch()` ends with `.catch(() => callback?.())` — the error argument is discarded. The @types/express-session signature declares `callback?: () => void` (no error param), so this compiles cleanly, but the runtime contract is `store.touch(sid, session, function (err) { ... })` (express-session index.js:362) where a non-null `err` would normally surface via `next(err)` / logging. With the swallow, a transient SQLite failure (e.g. `SQLITE_BUSY` during the hourly prune or a backup snapshot) means:

- express-session still renews the browser cookie (rolling), believing the touch succeeded;
- the DB row's `expires` is not extended;
- on the next request, once the original expiry passes, `get()` returns `null` and the user is logged out — with no error ever logged and no trace in the response.

`set()`, `get()`, and `destroy()` propagate errors correctly; `touch()` is the outlier, and it is the method called on *every* unmodified request (the most frequent store operation).

**Impact:** Silent premature session loss under transient DB write failures; complete absence of observability for a persistence-store write failure. Availability, no security impact.

**Suggested fix:** Log and propagate:

```ts
touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): void {
  const expires = sessionData.cookie?.expires ?? new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MS)
  prisma.session
    .updateMany({ where: { sid }, data: { expires } })
    .then(() => callback?.())
    .catch((err) => {
      console.error('[session-store] touch failed for sid', sid, err)
      callback?.(err)
    })
}
```

(If the intent was to keep the request alive on failure, at minimum log the error — silent swallowing is the defect.)

### WR-03: Unguarded `JSON.parse` of stored session data — one corrupted row = permanent 500 for that sid

**File:** `backend/src/config/sessionStore.ts:28` and `:67`

**Description:**
`get()` and `all()` call `JSON.parse(row.data)` with no validation. `data` is only ever written by this server via `JSON.stringify`, so under normal operation it is always valid — but the SQLite file is bind-mounted into the host (`docker-compose.yml:83`), copied by the backup sidecar, and restorable from backups of arbitrary age. A truncated, hand-edited, or version-mismatched row is plausible. Consequences:

- `get()` (line 28): the throw rejects the promise chain and lands in `.catch(callback)` (line 30), so express-session receives an error and calls `next(err)` (index.js:502-504) → 500 on *every* request carrying that sid, forever, until the row is manually deleted. The user is neither authenticated nor cleanly logged out.
- `all()` (line 67): the throw inside the loop rejects the chain and discards the entire listing built so far — one bad row drops all sessions from introspection.

There is no privilege-escalation vector here (modern express-session's `Session` constructor ignores prototype properties, and the sid must pass HMAC verification before `get()` is even reached), so this is a robustness defect, not a security one.

**Impact:** Permanent per-user outage (500 loop) on corrupted data; no self-healing. Low probability.

**Suggested fix:** Validate, treat as absent, and remove the poisoned row:

```ts
let parsed: session.SessionData
try {
  parsed = JSON.parse(row.data) as session.SessionData
} catch {
  prisma.session.deleteMany({ where: { sid } }).catch(() => undefined)
  callback(null, null)
  return
}
callback(null, parsed)
```

Apply the same guard in `all()` (skip-and-delete the bad row instead of failing the whole listing).

## Info

### IN-01: `DEFAULT_SESSION_EXPIRY_MS` (365 days) diverges from the configured 30-day session lifetime

**File:** `backend/src/config/sessionStore.ts:5, 34, 53`

**Description:** When `sessionData.cookie?.expires` is absent, `set()`/`touch()` fall back to a 365-day expiry. Today the fallback is unreachable — `app.ts` always configures `maxAge`, so express-session always computes `cookie.expires` — but it is a latent trap: if the session config ever drops `maxAge` (browser-session cookie), the DB row outlives the cookie by ~11 months, is immune to the 30-day pruning expectation, and is only reaped by the prune a year later. The unit test (`sessionStore.test.ts:98-106`) even pins this far-future behavior.

**Suggested fix:** Derive the fallback from the same `SESSION_MAX_AGE` used for the cookie (`2592000000`) instead of a divergent magic constant, so DB row lifetime and cookie lifetime can never drift apart by design.

### IN-02: `clear()` is an unrestricted `deleteMany({})` — same hazard class as the bug already fixed

**File:** `backend/src/config/sessionStore.ts:82-87`

**Description:** `clear()` wipes *every* session row in the shared DB. It is currently unreachable from route code (no caller), but it is a one-liner away from recreating the parallel-worker/logged-out-everyone incident the PR explicitly fixed in the integration test. Unlike `pruneExpired()` (scoped by `expires < now`), `clear()` has no guard.

**Suggested fix:** Add a warning comment at the call site (repo convention is minimal comments, but this footgun earned the one on the test file's `extractSid`) or gate it behind an explicit `NODE_ENV !== 'production'` check.

### IN-03: Test coverage gaps — error paths of the store and cross-suite session-row accumulation

**Files:** `backend/src/config/__tests__/sessionStore.test.ts:119-135`; `backend/src/__tests__/auth.session.test.ts:26-30`

**Description:**
- The unit tests cover only happy paths: `touch()`'s error-swallowing (WR-02) is untested and would pass unchanged, `get()`'s `findUnique` rejection path (`callback(err)`) is untested, and the corrupted-`data` path (WR-03) is untested. Given express-session's correctness depends on store callbacks honoring the error contract, at minimum add a `touch`-rejects test asserting the error reaches the callback.
- The other real-DB integration suites (`assignments`, `recurring`, `templates`, `points`, `users`, `auth.routes`) all log in through the new store and now create `Session` rows that nothing ever deletes — only `auth.session.test.ts` has sid-scoped cleanup. Rows accumulate in the shared `dev.db` across every full `npm test` run (the hourly prune only runs in a live server, never in Jest). Harmless today (random sids, 30-day expiry), but the file explicitly documents the shared-DB hazard, so a note or a suite-wide sweep of *expired* rows would keep the hygiene story consistent.

**Suggested fix:** Add the error-path unit tests above; optionally have `auth.session.test.ts`'s `afterAll` (or a shared cleanup) also prune `expires < now` rows, which is safe across workers by construction.

---

_Reviewed: 2026-08-10T19:57:44Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
