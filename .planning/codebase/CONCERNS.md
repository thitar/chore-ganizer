# Codebase Concerns

**Analysis Date:** 2026-05-01

## Tech Debt

**Dead Code — `recurring-chores.routes.ts`:**
- Issue: `backend/src/routes/recurring-chores.routes.ts` (394 lines) is never imported. The file was replaced by `recurring-chores-crud.routes.ts` and `recurring-chores-occurrences.routes.ts`, but the old file was left in the codebase.
- Files: `backend/src/routes/recurring-chores.routes.ts` (394 lines of unused code with Swagger JSDoc blocks)
- Impact: Misleading to developers; creates confusion about which routes are active. Running `docs:generate` may pick up these routes and create stale Swagger specs.
- Fix approach: Delete the file. Verify no other imports reference it, then remove.

**Deprecated Prisma `$use` Middleware:**
- Issue: `backend/src/config/database.ts` uses `prisma.$use()` (line 15) which was deprecated in Prisma v4. The middleware auto-serializes/deserializes `recurrenceRule` as JSON string for SQLite compatibility.
- Files: `backend/src/config/database.ts` (lines 15–47)
- Impact: Blocks upgrade to Prisma v6+, since `$use` is removed in newer versions. The middleware is fragile — it must handle `create`, `update`, `upsert`, `createMany`, and `updateMany` actions, and manually checks for array vs. single-object args.
- Fix approach: Migrate to Prisma `$extends` with `result` or `query` extension. Use Prisma's native `Json` type if the project moves to PostgreSQL, or add a Prisma-level `transform` extension that handles the serialization at a cleaner boundary.

**Fat Controller — `pocket-money.controller.ts`:**
- Issue: `backend/src/controllers/pocket-money.controller.ts` is 817 lines with 27 direct `prisma` calls, including business logic for balance calculation, pagination with running balances, and transaction creation.
- Files: `backend/src/controllers/pocket-money.controller.ts` (817 lines, 27 `prisma.` calls)
- Impact: Violates layered architecture (controllers should be thin HTTP adapters). Business logic is untestable in isolation — no unit test for this controller exists. Hard to reason about, hard to review.
- Fix approach: Extract a `PocketMoneyService` class/file from this controller. Move `calculatePointBalance`, pagination logic, and all `prisma` calls into the service layer. The controller should only parse request params, call the service, and format responses.

**`as any` Casts in Production Code:**
- Issue: Multiple `as any` casts bypass TypeScript's type system in production paths.
- Files:
  - `frontend/src/api/client.ts` (lines 94, 95, 112, 118, 125) — CSRF retry logic uses `as any` to access `_csrfRetryCount` on Axios config and response data
  - `backend/src/middleware/errorHandler.ts` (line 55) — `const prismaError = err as any` to check Prisma error codes
  - `backend/src/config/database.ts` (line 29) — `(params.args as any)[key]` in the `$use` middleware
- Impact: Type safety is lost; refactoring Axios types or Prisma error types could introduce silent runtime failures.
- Fix approach: For client.ts, extend Axios config type with `_csrfRetryCount` property. For errorHandler.ts, use `PrismaClientKnownRequestError` type guard. For database.ts, replace with `$extends` (see above).

**Inconsistent File Naming Conventions:**
- Issue: Some service files use `camelCase.ts` while others use `dot.case.ts`.
- Files:
  - camelCase: `backend/src/services/emailService.ts`, `backend/src/services/notificationService.ts`
  - dot.case: `backend/src/services/audit.service.ts`, `backend/src/services/auth.service.ts`, `backend/src/services/chore-assignments.service.ts`, `backend/src/services/notifications.service.ts`, etc.
- Impact: Makes file navigation unpredictable; new developers can't guess the correct filename.
- Fix approach: Standardize on `dot.case.ts` (the dominant convention: 13 of 17 service files use it). Rename `emailService.ts` → `email.service.ts` and `notificationService.ts` → `notification-dispatch.service.ts`.

**Confusingly Similar Service Names:**
- Issue: Two notification services with nearly identical names serve different purposes.
- Files:
  - `backend/src/services/notificationService.ts` (214 lines) — dispatches notifications via email and ntfy push
  - `backend/src/services/notifications.service.ts` (174 lines) — CRUD for in-app notification records in the database
- Impact: Developers confuse these. No unit test for `notificationService.ts`.
- Fix approach: Rename `notificationService.ts` → `notification-dispatch.service.ts` or `notification-sender.service.ts` to clarify the distinction.

**database.ts JSON Serialization Middleware:**
- Issue: The `prisma.$use` middleware in `database.ts` intercepts ALL Prisma operations on `RecurringChore` and manually serializes/deserializes `recurrenceRule`. This is fragile because it must handle array vs. single-object arguments for every action type.
- Files: `backend/src/config/database.ts` (lines 15–47)
- Impact: If a new Prisma action type is added to the codebase, the middleware silently misses it. Edge cases with nested relations or `include`/`select` could cause double-serialization.
- Fix approach: Migrate to `$extends` (see above). Add integration tests that verify serialization for all CRUD operations.

**`db push` Instead of Versioned Migrations:**
- Issue: The Docker entrypoint (`backend/docker-entrypoint.sh`, line 70) runs `npx prisma db push --skip-generate` instead of `prisma migrate deploy`. Only 2 migration files exist (`init` and `20260215_add_user_color`).
- Files: `backend/docker-entrypoint.sh` (line 70), `backend/prisma/migrations/` (2 real migrations + lock file)
- Impact: Schema changes are not versioned or trackable. No rollback path. `db push` can cause data loss if a column is renamed or type is changed (because it drops and recreates). Not suitable for production deployments.
- Fix approach: Use `prisma migrate dev` to generate versioned migration files for every schema change. Update entrypoint to use `prisma migrate deploy`. This gives auditability and rollback capability.

**Frontend-Backend Parameter Naming Mismatch:**
- Issue: Frontend uses `userId`/`templateId` internally, but backend expects `assignedToId`/`choreTemplateId`.
- Files: `frontend/src/api/assignments.api.ts` (maps `userId` → `assignedToId`), `backend/src/controllers/chore-assignments.controller.ts`
- Impact: Developers adding new API calls must remember to map parameter names in the API layer; mismatch causes 400 validation errors.
- Fix approach: The mapping is already handled in `frontend/src/api/assignments.api.ts`. Document this convention clearly. Consider standardizing parameter names between frontend and backend.

**Inconsistent Route Mounting Pattern:**
- Issue: `metricsRoutes` is mounted directly in `app.ts` (line 156: `app.use('/api', metricsRoutes)`) while all other routes go through `routes/index.ts`.
- Files: `backend/src/app.ts` (line 156), `backend/src/routes/index.ts`
- Impact: Inconsistency in the route organization pattern. Developers looking at `routes/index.ts` won't find metrics routes.
- Fix approach: Either import `metricsRoutes` in `routes/index.ts` like all other routes, or add a comment in `routes/index.ts` explaining the exception.

**55 Console Statements in Frontend:**
- Issue: 55 `console.log`/`console.error`/`console.warn` calls in frontend source files. While many are gated by `debugEnabled` in `client.ts`, most error handlers use unconditional `console.error`.
- Files: `frontend/src/api/client.ts` (13 conditional), `frontend/src/hooks/useAuth.tsx` (15 calls), `frontend/src/pages/*.tsx` (14 unconditional `console.error` in catch blocks), `frontend/src/components/*.tsx` (7 calls)
- Impact: Unconditional `console.error` in production clutters browser console and may leak error details to end users. Inconsistent logging pattern.
- Fix approach: Gate ALL console statements behind a debug flag (check `window.APP_CONFIG?.debug`). Use a lightweight debug logging utility. For production error reporting, use a proper error tracking service.

## Known Bugs

**Silent Redirect for Unauthorized Access:**
- Symptoms: Children accessing parent-only routes are silently redirected to dashboard without error message.
- Files: `frontend/src/App.tsx` (`ProtectedRoute` component)
- Trigger: Child user navigates to `/users`, `/templates`, `/statistics`, etc.
- Workaround: None — by design, but may confuse users.
- Recommendations: Show a "You don't have access to this page" toast notification via the `sonner` library already in use.

**Version Synchronization Complexity:**
- Symptoms: Version numbers must be kept in sync across `backend/package.json`, `frontend/package.json`, and `.env` (`APP_VERSION`).
- Files: `backend/package.json`, `frontend/package.json`, `.env`
- Trigger: Forgetting to update all locations causes version mismatch.
- Workaround: `./docker-compose.sh` auto-extracts version from `backend/package.json`. Frontend reads version at runtime from `window.APP_CONFIG.appVersion`.

**Nested Ternary in Controller:**
- Symptoms: Hard-to-read nested ternary in `recurring-chores-occurrences.controller.ts` line 52:
  ```typescript
  const filterUserId = userId ? Number(userId) : (assignedToMe === 'true' ? req.user!.id : null)
  ```
- Files: `backend/src/controllers/recurring-chores-occurrences.controller.ts` (line 52)
- Impact: Ternary inside ternary is a code smell; difficult to debug and test.
- Fix approach: Extract into a named function or use if/else for clarity.

## Security Considerations

**Session Management:**
- Risk: `SESSION_SECRET` must be explicitly set in `.env`; the app logs a fatal error and exits if missing (good).
- Files: `backend/src/app.ts` (lines 25–27, 126–138)
- Current mitigation: App validates at startup (line 25: `if (!process.env.SESSION_SECRET)`). Session cookies use `httpOnly: true`, `secure: true` in production, and `sameSite: 'strict'` by default.
- Recommendations: Session config is solid. Long-term: consider rotating `SESSION_SECRET` periodically.

**Express Session Uses MemoryStore:**
- Risk: Default `MemoryStore` for `express-session` — sessions are lost on restart and leak memory over time.
- Files: `backend/src/app.ts` (line 126: `app.use(session({...}))` — no custom `store` option)
- Current mitigation: Single-instance Docker deployment means restart wipes all sessions (acceptable for family app). Session timeout is 7 days by default.
- Recommendations: If multi-instance or production scaling is needed, use `connect-sqlite3` or a Redis-based session store.

**CSRF Token Retry Logic Uses `as any`:**
- Risk: CSRF token refresh uses `(originalRequest as any)._csrfRetryCount` to track retries and `(error.response.data as any)` to read error codes — breaks type safety.
- Files: `frontend/src/api/client.ts` (lines 112, 118, 125)
- Current mitigation: Retry count limits to 1 (line 119: `if (retryCount >= 1)`). CSRF token is re-fetched before retry.
- Recommendations: Type the `_csrfRetryCount` property in a custom Axios config type. Add a Jest/Vitest test for the CSRF retry path (currently untested).

**CORS Default Origin:**
- Risk: CORS defaults to `http://localhost:5173` if `CORS_ORIGIN` env var is not set. In Docker deployment, nginx proxies requests so CORS may not apply — but if directly exposed, it's restrictive.
- Files: `backend/src/app.ts` (line 94: `const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'`)
- Current mitigation: Single-origin default is safe; `credentials: true` is needed for session cookies.
- Recommendations: In production, explicitly set `CORS_ORIGIN` to the frontend URL. Validate the origin against an allowlist if multi-origin is needed.

**Helmet CSP Uses `'unsafe-inline'`:**
- Risk: Content Security Policy allows `'unsafe-inline'` for scripts and styles.
- Files: `backend/src/app.ts` (lines 41–56)
- Current mitigation: Helmet is enabled with `xssFilter: true` and `noSniff: true`. `connectSrc` restricted to `'self'`.
- Recommendations: Migrate inline scripts/styles to external files or use nonces/hashes. For a React app, inline scripts are typically from the build toolchain — consider using a CSP nonce generated per-request.

**Lockout Bypass via Login with Different Case:**
- Risk: Account lockout uses `MAX_LOGIN_ATTEMPTS` (default 5) and `ACCOUNT_LOCKOUT_MINUTES` (default 15). After lockout expires, failed attempts reset.
- Files: `backend/src/utils/lockout.ts` (lines 4–5), `backend/src/services/users.service.ts` (line 269: manual lock for 30 days)
- Current mitigation: Lockout counters reset on successful login. Admin can manually lock for 30 days.
- Recommendations: No critical issue — appropriate for home use. For multi-tenant, add IP-based rate limiting on login endpoint (already in place via `authLimiter`).

**NPM Vulnerabilities — Production Dependencies:**

| Package | Severity | Impact | Location |
|---------|----------|--------|----------|
| axios (1.0.0–1.14.0) | moderate | SSRF via NO_PROXY bypass, header injection chain | backend, frontend |
| follow-redirects (≤1.15.11) | moderate | Auth header leak to cross-domain redirects | backend, frontend |
| nodemailer (≤8.0.4) | moderate | SMTP command injection via CRLF | backend |
| lodash (≤4.17.23) | high | Prototype pollution, code injection via `_.template` | frontend |
| vite (≤6.4.1) | high | Path traversal, arbitrary file read via dev server | frontend (dev) |

- Files: `backend/package.json`, `frontend/package.json`
- Fix approach: Run `npm audit fix` in both packages. For `nodemailer` and `lodash`, verify no breaking changes. For `vite`, upgrade to >6.4.1 (dev-only, but affects dev environment security).

**Hardcoded Seed Password:**
- Risk: Default seed data uses `password123` for all demo users.
- Files: `backend/src/prisma/seed.ts` (line 11: `const passwordHash = await bcrypt.hash('password123', 10)`)
- Impact: If seed runs in production (e.g., on first deploy), all users get the same weak password.
- Current mitigation: Seed only runs when DB is empty (docker-entrypoint check). Demo users have `@home.local` emails.
- Recommendations: Document in README that default passwords must be changed immediately. Consider requiring password change on first login for seeded users.

**`prisma.$queryRaw` Used in Health Checks:**
- Risk: `backend/src/controllers/health.controller.ts` uses `prisma.$queryRaw\`SELECT 1\`` (lines 46, 203) for DB connectivity checks.
- Files: `backend/src/controllers/health.controller.ts` (lines 46, 203)
- Impact: `$queryRaw` with template literals is safe when using static queries, but could be dangerous if parameters are interpolated (not the case here — it's a static `SELECT 1`).
- Recommendations: Safe as-is. Note for future: never use `$queryRawUnsafe`.

## Performance Bottlenecks

**Sequential Penalty Processing in `processAllOverdue`:**
- Problem: `processAllOverdue` iterates overdue chores in a `for...of` loop, making sequential `await` calls for penalty application and parent/child notifications. For N overdue chores and P parents, this makes `N × (1 + P + 1)` sequential database and network calls.
- Files: `backend/src/services/overdue-penalty.service.ts` (lines 259–301)
- Cause: Sequential processing — each assignment's penalty + notifications block the next.
- Improvement path: Process penalties in parallel using `Promise.allSettled()` for independent chores. Batch notification creation. Use `prisma.$transaction` for the penalty update to ensure atomicity.

**Overdue Penalty Race Condition:**
- Problem: `applyOverduePenalty` at `backend/src/services/overdue-penalty.service.ts` line 77 does `findUnique` check, then two separate `update` calls (lines 96, 106) without a database transaction. If two processes call this simultaneously, both could pass the `penaltyApplied === false` check and double-penalize.
- Files: `backend/src/services/overdue-penalty.service.ts` (lines 77–112)
- Cause: Read-then-write without `$transaction`.
- Improvement path: Wrap in `prisma.$transaction(async (tx) => { ... })`. The `chore-assignments.service.ts` already does this correctly (line 331), so the pattern exists in the codebase.

**N+1 Notification Queries in Penalty Flow:**
- Problem: Inside the penalty processing loop, `notifyParentOfOverdue` is called for each parent individually, each making its own DB query for notification settings.
- Files: `backend/src/services/overdue-penalty.service.ts` (lines 278–285)
- Cause: Sequential `await notifyParentOfOverdue` inside a loop over parents, which is already inside a loop over overdue chores.
- Improvement path: Fetch all parent notification settings once before the loop. Batch-create notifications.

## Fragile Areas

**`transformRecurringChore` Loses Type Safety:**
- Files: `backend/src/services/recurring-chores/transform.service.ts` (line 5: `export function transformRecurringChore(dbRecord: any)`)
- Why fragile: The function signature takes `dbRecord: any`, so there's zero compile-time checking that callers pass valid Prisma results. If the Prisma query's `include` changes, the transform silently returns undefined/malformed data.
- Safe modification: Define a proper TypeScript interface for the input (the Prisma query result type). Use Prisma's generated types.
- Test coverage: No unit test for this function.

**`safeParseAssignedUserIds` Catches and Rethrows:**
- Files: `backend/src/services/recurring-chores/occurrence-management.service.ts` (lines 4–9)
- Why fragile: Catches JSON parse errors and rethrows as `AppError`, but wraps the original error. If `assignedUserIds` is malformed JSON, data corruption is silently surfaced as a 500 error with no record of the bad data.
- Safe modification: Log the original `assignedUserIds` value (or its hash) in the error message for debugging. Add data validation before the parse.

**Integration Test Database Lifecycle:**
- Files: `backend/src/__tests__/integration/global-setup.ts`, `backend/src/__tests__/integration/global-teardown.ts`
- Why fragile: Test DB at `test-db/integration-test.db` is created/destroyed per test run. If teardown fails silently, stale DB can cause test failures.
- Safe modification: Always run tests with `npm run test:integration` which uses `--runInBand`. Add a DB health check at the start of the test run.
- Test coverage: Integration tests run serially (`--runInBand` in jest config).

**Auth State Management with React StrictMode:**
- Files: `frontend/src/App.tsx`, `frontend/src/hooks/useAuth.tsx`
- Why fragile: React StrictMode double-rendering in development can cause DOM reconciliation issues during login/logout. The `AppContentWithKey` wrapper forces remount on auth state change using a key-based approach.
- Safe modification: Maintain the `AppContentWithKey` pattern when modifying auth flow. Test auth state transitions with StrictMode enabled.

**Rate Limiter Keyed by User ID (Memory Only):**
- Files: `backend/src/middleware/rateLimiter.ts` (line 26: `requestCounter.windowStart` — in-memory state)
- Why fragile: Rate limit counters live in memory only. Server restart resets all counters. No persistence across instances.
- Safe modification: For single-instance use, this is acceptable. Document that restart resets rate limits.

## Scaling Limits

**SQLite Database:**
- Current capacity: Suitable for single-family use (typically 4–6 users).
- Limit: SQLite has concurrent write limitations. Writes are serialized at the DB level.
- Scaling path: For multi-family support, migrate to PostgreSQL by updating `prisma/schema.prisma` datasource and connection string.

**In-Memory Caching (`node-cache`):**
- Current capacity: `node-cache` stores data in memory (configured in `backend/src/utils/cache.ts`).
- Limit: Cache is per-instance; doesn't work with multiple backend replicas.
- Scaling path: For multi-instance deployment, switch to Redis or similar shared cache.

**Express Session MemoryStore:**
- Current capacity: Sessions in memory. Restart = all users logged out.
- Limit: Cannot scale horizontally. Memory grows unbounded with session count.
- Scaling path: Use `connect-sqlite3` (for SQLite persistence) or Redis (for multi-instance).

## Dependencies at Risk

**Prisma ORM (5.22.0):**
- Risk: `prisma.$use()` is used (deprecated). Prisma v6 removes `$use`.
- Impact: Cannot upgrade Prisma without rewriting the `recurrenceRule` serialization middleware.
- Migration plan: Replace `$use` with `$extends`. Test all RecurringChore operations after migration.

**Axios (1.14.0):**
- Risk: SSRF and header injection vulnerabilities in production. Used for ntfy webhook calls and frontend API client.
- Impact: Backend ntfy notifications could be exploited if an attacker controls the ntfy server URL.
- Migration plan: Upgrade to latest axios. The SSRF vuln requires control of the proxy config (not applicable here), but fix for safety. Frontend axios vulns are less exploitable (browser environment).

**lodash (frontend):**
- Risk: HIGH severity prototype pollution and code injection vulnerability (via `_.template`). Likely a transitive dependency.
- Impact: If used in user-facing code paths, could be exploited.
- Migration plan: Run `npm audit fix` to upgrade lodash. If lodash is a transitive dependency, consider replacing the parent dependency or adding a `pnpm.overrides`.

**Nodemailer (8.0.4):**
- Risk: SMTP command injection via CRLF in transport name option.
- Impact: If SMTP is configured, a crafted transport name could inject commands.
- Migration plan: Upgrade to nodemailer ≥8.0.4. The current version is exactly at the vulnerable boundary.

## Missing Critical Features

**API Rate Limiting Visibility:**
- Problem: Rate limiting is configured (`backend/src/middleware/rateLimiter.ts`) but no admin UI to view rate limit status.
- Blocks: Cannot easily diagnose if legitimate users are being rate-limited.
- Existing partial mitigation: `/api/admin/rate-limits` endpoint returns config and current request count (in `backend/src/routes/admin.routes.ts`).

**SSRF Protection in ntfy Service:**
- Status: Implemented and solid. `backend/src/services/ntfy.service.ts` (lines 38–83) validates URLs with protocol allowlist, hostname validation, and private/internal IP blocking.
- Note: Not a missing feature — confirmed as properly implemented.

## Test Coverage Gaps

**Zero Controller Unit Tests:**
- What's not tested: All 15 controllers have zero dedicated unit tests.
- Files: `backend/src/controllers/*.ts` (15 files, no `__tests__/controllers/` directory)
- Risk: HTTP parameter parsing, response formatting, and error handling in controllers are untested. Integration tests cover happy paths but not edge cases like malformed params.
- Priority: High

**Missing Service Unit Tests (8 services):**

| Service | Lines | File |
|---------|-------|------|
| chore-templates | ~200 | `backend/src/services/chore-templates.service.ts` |
| chore-categories | ~90 | `backend/src/services/chore-categories.service.ts` |
| transform (recurring chores) | 22 | `backend/src/services/recurring-chores/transform.service.ts` |
| recurring-chore-management | ~80 | `backend/src/services/recurring-chores/recurring-chore-management.service.ts` |
| occurrence.service | ~80 | `backend/src/services/recurring-chores/occurrence.service.ts` |
| occurrence-management | 83 | `backend/src/services/recurring-chores/occurrence-management.service.ts` |
| assignment.service | ~50 | `backend/src/services/recurring-chores/assignment.service.ts` |
| notificationService (dispatch) | 214 | `backend/src/services/notificationService.ts` |

- Risk: These services form the core of the recurring chores system. Untested recurrence logic is particularly dangerous (date calculations, round-robin logic, occurrence generation).
- Priority: High for recurring-chores services, Medium for chore-templates/categories.

**Frontend Test Coverage (22%):**
- What's not tested: 18 test files for 81 source files. Only `Settings.test.tsx` tests a page component. 13 pages have zero tests.
- Files: Only 18 test files exist across all front-end code.
- Risk: UI regressions, broken user flows, and component rendering errors go undetected.
- Priority: Medium — the E2E test suite (5 spec files) provides some coverage of critical flows.

**CSRF Token Retry Logic Untested:**
- What's not tested: The automatic CSRF token retry mechanism in `frontend/src/api/client.ts` (lines 110–129).
- Files: `frontend/src/api/client.ts`
- Risk: If CSRF token refresh fails, requests fail silently or retry infinitely (mitigated by retryCount check).
- Priority: Medium

**Overdue Penalty Edge Cases Untested:**
- What's not tested: Double-penalty guard, timezone handling for due dates (UTC vs local), integer rounding for penalty calculation.
- Files: `backend/src/services/overdue-penalty.service.ts`
- Risk: Users penalized twice or not at all due to race conditions or timezone bugs.
- Priority: High

**Frontend Error Handling Paths Untested:**
- What's not tested: API error responses in UI components, network failure states, 401 auto-logout flow triggered by DOM events.
- Files: `frontend/src/api/client.ts`, `frontend/src/hooks/useAuth.tsx`, `frontend/src/pages/*.tsx`
- Risk: Error handling code paths may not work correctly in production.
- Priority: Medium

---

*Concerns audit: 2026-05-01*
