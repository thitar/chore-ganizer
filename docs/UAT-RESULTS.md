# UAT Results

Automated Playwright UAT run against the Docker-deployed app (`docker compose up --build -d`), frontend `localhost:3002`, backend `localhost:3010`.

**Run date:** 2026-07-12
**Result:** 54/54 items PASS (53 PASS + 1 INFO for 6.3 which is a non-blocking celebration check)
**Suite:** `e2e/uat-checklist.spec.ts` (Playwright, `--project=chromium`), config `playwright.uat.config.ts`
**Duration:** ~4.0 min

## Summary by section

| Section | Items | Result |
|---|---|---|
| 1. Auth | 1.1–1.6 | ✅ 6/6 |
| 2. Chores (child) | 2.1–2.2 | ✅ 2/2 |
| 3. Chores (parent) | 3.1–3.6 | ✅ 6/6 |
| 4. Recurring chores | 4.1–4.6 | ✅ 6/6 |
| 5. Points | 5.1–5.6 | ✅ 6/6 |
| 6. Gamification | 6.1–6.3 | ✅ 3/3 (6.3 INFO) |
| 7. Notifications | 7.0–7.3 | ✅ 4/4 (real push, see below) |
| 8. Profile / family | 8.1–8.6 | ✅ 6/6 |
| 9. Mobile (390px) | 9.1–9.5 | ✅ 5/5 |
| 10. Calendar | 10.1–10.6 | ✅ 6/6 |

## Section 7 — Notifications (verified end-to-end)

Section 7 is implemented as **real** notification tests, not skipped:

- **7.0** — `NTFY_BASE_URL` is configured in `.env` (verified `https://ntfy.thitar.ovh`).
- **7.1** — Set Dad's ntfy topic to `chore-dad-1a54lu` via the profile page.
- **7.2** — Assigned a chore to Alice → push notification arrived on `chore-dad-1a54lu`: `"Make Bed — due 2026-07-13"`.
- **7.3** — Created a chore due today → due-soon push arrived: `"Wash Dishes — 10 pts, due today"`.

`notifyChoreAssigned` fires on assignment create; `notifyDueSoon` fires when a parent loads `/assignments` (getAll). Both confirmed delivering to the ntfy server.

## Infrastructure notes (required for the suite to run green)

These were discovered/fixed while getting a clean run and matter for any future re-run:

1. **`NTFY_BASE_URL` must reach the backend container.** The env var is renamed from the old `NTFY_DEFAULT_SERVER_URL`. `docker-compose.yml` backend `environment` now passes `NTFY_BASE_URL=${NTFY_BASE_URL:-}` and `NTFY_DEFAULT_TOPIC=${NTFY_DEFAULT_TOPIC:-}`. `isNtfyConfigured` is evaluated at module import, so the backend must be **rebuilt/restarted** after a `.env` change (`docker compose up --build backend`).
2. **Auth rate limit.** The login limiter (`AUTH_RATE_LIMIT_MAX`, default 10/15min) is keyed by the frontend container IP, so *all* `uiLogin` calls in the suite share one bucket. `.env` sets `AUTH_RATE_LIMIT_MAX=500`. The limiter counter is **in-memory in the running backend and persists across Playwright runs** — exhaust it and logins start failing with "Invalid email or password". Restart the backend (or reset the DB, which restarts it) before a fresh run.
3. **DB reset for a clean run.** The suite pollutes the SQLite DB (creates users/chores every run). Left unchecked this eventually destabilizes logins. To reset: stop `backend`+`frontend`, `sudo rm` the host SQLite file at `${DATA_DIR}/chore-ganizer.db` (default `/opt/app-data/chore-ganizer/chore-ganizer.db`), restart. The container entrypoint runs `prisma db push` but **cannot seed** (no `ts-node` in the `--omit=dev` runtime image), so seed from the host: `cd backend && DATABASE_URL="file:/opt/app-data/chore-ganizer/chore-ganizer.db" npx prisma db seed`. The data dir must be world-writable (e.g. `chmod 777` dir / `666` db) because the container's `appuser` is uid **1001** while the host user is uid 1000 — otherwise the backend gets "attempt to write a readonly database".
4. **Headless Chromium + canvas-confetti.** `confetti` triggers GPU memory exhaustion/crashes in headless. `playwright.uat.config.ts` launches chromium with `--disable-gpu --disable-software-rasterizer` and `animations: 'disabled'`. Toasts auto-dismiss after 3s, so tests wait on `[role="status"]` (10s) rather than exact toast text.

## How to re-run

```bash
# ensure clean state
docker compose stop backend frontend
sudo rm -f /opt/app-data/chore-ganizer/chore-ganizer.db
docker compose start backend        # re-pushes schema, stays unseeded
sudo chmod 777 /opt/app-data/chore-ganizer && sudo chmod 666 /opt/app-data/chore-ganizer/chore-ganizer.db
cd backend && DATABASE_URL="file:/opt/app-data/chore-ganizer/chore-ganizer.db" npx prisma db seed
docker compose start frontend
# (re)set Dad's ntfy topic via API if verifying Section 7, then, from the repo root:
npm run test:e2e:uat
```

**Always run `npm run test:e2e:uat` from the repo root — never hand-type the `playwright test` invocation.** That script is pinned to `--config e2e/playwright.uat.config.ts`, so it's immune to both failure modes below regardless of your shell's cwd:

- **Wrong/missing config path.** A hand-typed command run from the repo root with a *relative* config path like `--config playwright.uat.config.ts` (no `e2e/` prefix) fails immediately with `does not exist` — verified 2026-07-12. This is loud, not silent, but it's still easy to paste wrong.
- **Silent wrong-target hit.** This is *cwd-dependent*, not a blanket risk as earlier phrasing here implied: since the `e2e/` configs were moved out of the repo root (commit `fbb0bb0`), running the suite **from the repo root** with `--config` fully omitted now fails loudly too (`Project(s) "chromium" not found` — there's no `playwright.config.ts` at the root for Playwright to fall back to). But running **from inside `e2e/`** with `--config` omitted *does* silently succeed against `e2e/playwright.config.ts`'s `baseURL: http://localhost:5173` (the frontend dev-server config) instead of the Docker deployment on `:3002` — Playwright auto-discovers by exact filename match only, never falls back to `playwright.uat.config.ts`. Verified 2026-07-12 by comparing `--list` output run from both directories with and without `--config`.
- No npm script other than `test:e2e:uat` supplies the UAT config — `test:e2e`/`test:e2e:chromium` in the root `package.json` both still omit it and target the dev-server config.

## 2026-07-12 re-verification attempt (see-below caveat)

A same-day re-run was attempted to confirm the 54/54 result above still holds. Findings:

- **First attempt** (`npx playwright test e2e/uat-checklist.spec.ts --project=chromium`, no `--config`) silently ran against a stray `:5173` Vite dev server instead of Docker — see the mandatory-flag note above. 52/54 passed against that target (confirming core app logic works), 2 failed on Chromium "Page crashed" / 30s timeout — both are consequences of the wrong config (missing `--disable-gpu` launch args, and the default 30s test timeout is too short for the 30s ntfy poll in 7.3), not app defects.
- **Corrected attempt** (with `--config playwright.uat.config.ts`, against a freshly reset+reseeded DB) failed at the `auth.setup.ts` stage — 3 of 4 seeded-user logins hit "Page crashed" or timed out before the checklist tests could even start.
- Root-caused to the **host**, not the app: `free -h` showed only ~485Mi available (9.3Gi/9.8Gi used) on this machine, which runs ~20 unrelated Docker containers alongside chore-ganizer. `bob`'s login (the one setup test that did complete) succeeded against `:3002`, and `curl localhost:3002` returned 200 throughout — so the Docker-deployed app itself is up and serving correctly; there simply wasn't enough free memory for headless Chromium to run reliably project-wide on this box at the time.
- **Net result at the time: the 54/54 PASS claim above was unverified** — not contradicted, but not reproduced either.

## 2026-07-12 re-verification, confirmed clean

Once host memory pressure eased (`free -h` showed 3.7Gi available vs. ~485Mi earlier), the suite was re-run with the corrected command from "How to re-run" above (`--config playwright.uat.config.ts`, fresh containers, no DB reset needed):

**Result: 54/54 PASS** (53 PASS + 1 INFO for 6.3), duration 2.6 min. Every section came back green, including 7.2/7.3 real ntfy push delivery ("Make Bed — due 2026-07-13", "Wash Dishes — 10 pts, due today"). This confirms the original 54/54 result — the earlier same-day failures were the host's memory pressure and this session's own config mistake, not a regression in the app.

## 2026-07-12 follow-up: the documented re-run command itself didn't work from the repo root

A later audit tried to literally run the command this doc had prescribed (`npx playwright test e2e/uat-checklist.spec.ts --config playwright.uat.config.ts --project=chromium --reporter=list`) from the repo root and got `Error: .../playwright.uat.config.ts does not exist` — the config path was missing its `e2e/` prefix, so it only ever worked if you happened to `cd e2e` first, which the surrounding instructions never said to do. Root-caused and fixed:

- Added `npm run test:e2e:uat` (`package.json`) pinned to `--config e2e/playwright.uat.config.ts --project=chromium uat-checklist.spec.ts`, verified to `--list` correctly from the repo root regardless of cwd assumptions.
- Rewrote "How to re-run" above to use that script instead of a hand-typed `playwright test` invocation.
- Corrected the mandatory-flag note: the "omitting `--config` silently hits `:5173`" risk is real but was previously stated as unconditional — it's actually cwd-dependent (see the note above for specifics), and from the repo root omitting `--config` now fails loudly instead, since the e2e configs moved out of the root in commit `fbb0bb0`.

None of this changes the 54/54 verdict above — the actual runs that produced it did use a working config, just not the exact literal command this doc told the *next* person to type.
