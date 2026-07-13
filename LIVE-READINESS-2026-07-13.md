# Live-Readiness Review — 2026-07-13

> Follow-up to `.planning/codebase/CONCERNS.md` (2026-07-12). This session verified the
> **currently running** app (not just the code), found and fixed a live rate-limit gap by
> restarting the stale backend container, fixed several real bugs in code, and left one
> `.env` decision (`SECURE_COOKIES`) plus a deploy step for you to approve.

## TL;DR

- **The running app is stable**: healthy, DB connected, no error-log churn, all 256 backend +
  106 frontend tests pass.
- **Fixed this session**: the login rate limiter was live at 50x weaker than your `.env`'s own
  value — the container was just stale. Restarted it; verified correct values now live (#1).
- **One remaining decision, needs your call**: `SECURE_COOKIES` hardening (see #2) — deliberately
  not auto-applied since a wrong guess can silently break login for everyone.
- **Everything else I fixed is staged in the working tree, not deployed** — needs
  `docker compose up -d --build backend frontend` when you're ready (see #3).

---

## 1. ✅ RESOLVED (2026-07-13, same session) — login rate limit was live at 50x weaker than `.env`

**What I found:** I checked the *running* container's actual env, not just `CONCERNS.md`:

```
$ docker compose exec backend printenv | grep RATE_LIMIT
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=500
```

Your `.env` already had the correct values (`AUTH_RATE_LIMIT_MAX=10`) — the *running container*
was just stale, still holding the values from an earlier e2e-testing session (`docker-compose.yml`'s
own defaults are `300`/`10`, matching your `.env`). Editing `.env` alone never takes effect
until the process restarts and re-reads it, and it hadn't been restarted since.

**Why this mattered more than the original note suggested:** confirmed via `curl -I
https://chore.thitar.ovh` that this app is reverse-proxied through **Caddy** and served on the
**public internet** (not LAN-only) with a real domain. At `500`/15min, that's ~33 login
attempts/minute available to anyone on the internet.

**Fix applied:** `docker compose up -d --force-recreate backend`. Verified after restart:
`RATE_LIMIT_MAX=300`, `AUTH_RATE_LIMIT_MAX=10`, health check green, DB intact (8 users,
no data loss), uptime reset as expected for a restart.

---

## 2. 🟡 Best-practice hardening, but verify carefully before flipping — `SECURE_COOKIES=false`

**What I found:** Also observed live: `SECURE_COOKIES=false` even though `NODE_ENV=production`
and the app is served exclusively over HTTPS (Caddy adds HSTS with `preload`). Session/CSRF
cookies are currently missing the `Secure` flag, which in principle lets them be sent over a
plaintext connection if one ever occurred.

**Why I'm not just telling you to flip it to `true`:** `backend/src/app.ts` sets
`app.set('trust proxy', 1)`, and `express-session` only marks a cookie `Secure` when it sees
`X-Forwarded-Proto: https` from the proxy in front of it. **If Caddy isn't forwarding that
header, setting `SECURE_COOKIES=true` will silently break login for the entire family** — the
session cookie will simply never get set, and every login will appear to succeed but not
persist. It's plausible someone (past-me, in an earlier session) set it `false` specifically
because of this.

**Options:**
- **A. (Recommended, but verify)** Set `SECURE_COOKIES=true` in `.env`, restart the backend,
  then **immediately test a real login** on `chore.thitar.ovh` before walking away. If it
  works, you're done. If login silently fails, revert `SECURE_COOKIES=false` and instead fix
  Caddy to forward `X-Forwarded-Proto` (or add `reverse_proxy` header directives), then retry.
- **B.** Leave it as `false`. Since HSTS+preload is already active, the actual plaintext-cookie
  exposure window is already close to zero in practice — this is hardening, not a hole. Lower
  urgency than #1.

**I did not touch this** — same `.env` restriction, and it's genuinely double-edged.

---

## 3. Fixed in code, staged — needs your go-ahead to deploy

These are real, verified bugs. Nothing below has shipped to the live containers; the fixes
sit in the working tree (`git status` will show them). None of the family's currently-running
app is affected by these until you rebuild/redeploy.

| Fix | File(s) | What was actually wrong |
|---|---|---|
| Broken favicon | `frontend/index.html`, `frontend/public/favicon.svg` (new) | Referenced a Vite-template `vite.svg` that was never checked in — nginx logged a 404 on every page load, and the browser tab showed no icon. Added a real one in the app's accent purple. |
| No crash diagnostics | `backend/src/server.ts` | No `unhandledRejection`/`uncaughtException` handler existed. Node already crashes on these by default (the safe behavior) — I added logging before the same `exit(1)`, so a future crash is diagnosable in `docker compose logs` instead of silent. Behavior-preserving, purely additive. `restart: unless-stopped` already covers the restart. This is a CONCERNS.md "Low" item, slightly beyond "fix bugs" — veto it if you'd rather not touch the live backend's process lifecycle. |

**To deploy:** `docker compose up -d --build backend frontend` (both need a rebuild — favicon
is a static asset baked into the frontend image, server.ts is compiled into the backend image).

---

## 4. Fixed in code — test/CI hygiene only, zero live impact

These fix things that were wrong, but only affect `npm test`, not the running app at all. No
deploy needed, no live risk. Listed for completeness since the task was "fix bugs found," but
don't let these read as urgent — they aren't.

- **2 stale test assertions** (`backend/src/__tests__/users.test.ts`,
  `assignments.test.ts`) expected `GET /api/users` to *not* return `email` — stale since a
  2026-07-10 decision to have that endpoint return email addresses. Tests failed on every
  `npm test` run. Updated assertions to match the intentional, correct behavior.
- **Real outbound network calls escaping backend unit tests**: `assignment.service.test.ts`
  had `isNtfyConfigured: true` mocked but never mocked `global.fetch`, so one test triggered
  a genuine `fetch()` to a fake ntfy host, failing asynchronously *after* the test finished
  (`Cannot log after tests are done` warning — a real Jest anti-pattern, not just noise: it can
  cause flaky/hanging CI runs). Added a file-level `fetch` mock.
  in **5 frontend test files** (`AssignmentsPage`, `MyChoresPage`, `CalendarPage`,
  `RecurringChoresPage`, `UsersPage`) that mocked every hook their page uses *except*
  `usePoints`/`useGamification` — `AppShell` (which every page renders) mounts
  `GamificationMoments`, which calls `useGamification()` unconditionally. Same failure mode
  as above: a real, unmocked axios request fired during the test and failed asynchronously.
  Added the missing mock to all 5.
- **`ts-jest` deprecation warning**: `isolatedModules: true` was set on the `ts-jest`
  transform option (deprecated, slated for removal in `ts-jest` v30) instead of
  `tsconfig.json`. Moved it. Verified: tests, `tsc --noEmit`, and `npm run build` all still
  pass clean — this changes TypeScript's compile mode for the whole project, so I actually ran
  the build rather than assuming it was safe.

---

## 5. Reviewed, no action needed

- Full backend (256) and frontend (106) test suites: all pass.
- e2e/UAT suite: **skipped initially** — host had only ~630MB free RAM at that point (~20
  other containers running on this shared box), and `bugs.md` already documents that headless
  Chromium produces false failures under this exact condition. Re-checked (not re-assumed)
  later in the session: RAM had recovered to ~2.8Gi available, so the risk that blocked it no
  longer applies. Still not run this session (no new app-code changes to verify beyond the
  backend restart, which the health check + DB integrity check already covered) — say the word
  if you want a fresh 54/54 confirmation.
- `CONCERNS.md`'s remaining medium items (in-memory session store, SQLite ownership
  quirks, e2e rate-limiter persistence) — re-checked, still accurately described as accepted
  trade-offs for a homelab-scale app, not bugs. No new information changes that assessment.
- 24h of backend/frontend container logs — the only errors present are all from yesterday's
  documented UAT/reseed maintenance session (before the current 13h uptime began at
  2026-07-12 17:01 UTC). Nothing has recurred since.

---

## Suggested order of operations

1. #1 is done — no action needed.
2. Decide on #2 (secure cookies) — recommend Option A, but test login immediately after.
3. If you want #3's fixes live, `docker compose up -d --build backend frontend`.
4. #4 is already safe to leave as-is; no urgency.
