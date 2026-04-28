# Codebase Concerns

**Analysis Date:** 2026-04-28

## Tech Debt

**Frontend-Backend Parameter Naming Mismatch:**
- Issue: Frontend uses `userId`/`templateId` internally, but backend expects `assignedToId`/`choreTemplateId`
- Files: `frontend/src/api/assignments.api.ts` (line 16 maps `userId` → `assignedToId`), `backend/src/controllers/chore-assignments.controller.ts` (lines 117-120)
- Impact: Developers adding new API calls must remember to map parameter names in the API layer; mismatch causes 400 validation errors
- Fix approach: The mapping is already handled in `frontend/src/api/assignments.api.ts` via `apiParams.assignedToId = params.userId`. Document this convention clearly and ensure all new API functions follow the same pattern.

**Large Controller File:**
- Issue: `backend/src/controllers/recurring-chores.controller.ts` is 1081 lines long
- Files: `backend/src/controllers/recurring-chores.controller.ts`
- Impact: Difficult to maintain, test, and review; likely violates single responsibility principle
- Fix approach: Extract the `transformRecurringChore`, `generateOccurrencesForChore`, and `calculateAssignedUserIds` helper functions into a separate service or utility file. Consider splitting the controller by functionality (CRUD, occurrence management, round-robin logic).

**JSON Storage in Database:**
- Issue: `recurrenceRule` stored as JSON string in DB, parsed/stringified at boundaries
- Files: `backend/src/controllers/recurring-chores.controller.ts` (line 13: `JSON.parse(dbRecord.recurrenceRule)`), `backend/prisma/schema.prisma`
- Impact: Requires manual serialization/deserialization; no DB-level validation of JSON structure
- Fix approach: Consider using Prisma's `Json` type for type safety, or store structured fields separately if querying on recurrence properties is needed.

## Known Bugs

**Silent Redirect for Unauthorized Access:**
- Symptoms: Children accessing parent-only routes are silently redirected to dashboard without error message
- Files: `frontend/src/App.tsx` (lines 32-40, `ProtectedRoute` component)
- Trigger: Child user navigates to `/users`, `/templates`, `/statistics`, etc.
- Workaround: None - by design, but may confuse users; consider showing a "Access Denied" toast notification

**Version Synchronization Complexity:**
- Symptoms: Version numbers must be kept in sync across multiple files
- Files: `backend/package.json`, `frontend/package.json`, `.env` (APP_VERSION)
- Trigger: Forgetting to update all locations causes version mismatch in API responses vs. frontend display
- Workaround: Use `./docker-compose.sh` script which auto-extracts version from `backend/package.json`. The frontend reads version at runtime from `window.APP_CONFIG.appVersion`.

## Security Considerations

**Session Secret Configuration:**
- Risk: `SESSION_SECRET` has no default and must be explicitly set in `.env`
- Files: `backend/src/middleware/auth.ts`, `.env.example`
- Current mitigation: App fails to start gracefully if missing (Helmet/express-session will error)
- Recommendations: Add startup validation in `backend/src/app.ts` that explicitly checks for SESSION_SECRET and logs a clear error message before exiting

**CSRF Token Handling:**
- Risk: CSRF token errors automatically retry requests, which could loop if token refresh fails
- Files: `frontend/src/api/client.ts` (lines 110-129)
- Current mitigation: Token refresh attempted once on 403 CSRF errors
- Recommendations: Add max retry count to prevent infinite loops; consider exponential backoff

**Error Responses May Leak Information:**
- Risk: Stack traces or detailed error messages might be exposed in production
- Files: `backend/src/middleware/errorHandler.ts`
- Current mitigation: `AppError` class with `statusCode` and `code` fields
- Recommendations: Ensure `errorHandler.ts` never returns stack traces in production (check `NODE_ENV === 'production'`)

## Performance Bottlenecks

**Synchronous Recurrence Generation:**
- Problem: `generateOccurrencesForChore` creates occurrences one-by-one in a loop (lines 51-84 in `recurring-chores.controller.ts`)
- Files: `backend/src/controllers/recurring-chores.controller.ts`
- Cause: Sequential database inserts for each occurrence date
- Improvement path: Batch the database inserts using `prisma.choreOccurrence.createMany()` for better performance when generating multiple occurrences

**Console Statements in Production:**
- Problem: 45 `console.log/warn/error` statements in backend source code
- Files: `backend/src/` (multiple files)
- Cause: Debugging statements left in code
- Improvement path: Use Winston logger consistently (which is already configured); remove or conditionally gate console statements

## Fragile Areas

**Integration Test Database Lifecycle:**
- Files: `backend/src/__tests__/integration/global-setup.ts`, `backend/src/__tests__/integration/global-teardown.ts`
- Why fragile: Test DB at `test-db/integration-test.db` is created/destroyed per test run; if teardown fails, stale DB can cause test failures
- Safe modification: Always run tests with `npm run test:integration` which uses `--runInBand`; avoid parallel execution
- Test coverage: Integration tests run serially (`--runInBand` in jest config)

**Auth State Management with React StrictMode:**
- Files: `frontend/src/App.tsx` (lines 140-151), `frontend/src/hooks/useAuth.tsx`
- Why fragile: React StrictMode double-rendering in development can cause DOM reconciliation issues during login/logout
- Safe modification: The `AppContentWithKey` wrapper forces remount on auth state change using a key-based approach; maintain this pattern when modifying auth flow
- Test coverage: Auth flows tested in `backend/src/__tests__/integration/auth.integration.test.ts`

## Scaling Limits

**SQLite Database:**
- Current capacity: Suitable for single-family use (typically 4-6 users)
- Limit: SQLite has concurrent write limitations; maximum practical DB size ~140TB but performance degrades with many concurrent writes
- Scaling path: For multi-family support, migrate to PostgreSQL by updating `prisma/schema.prisma` datasource and connection string

**In-Memory Caching:**
- Current capacity: `node-cache` stores data in memory (configured in `backend/src/services/`)
- Limit: Cache is per-instance; doesn't work with multiple backend replicas
- Scaling path: For multi-instance deployment, switch to Redis or similar shared cache

## Dependencies at Risk

**Prisma ORM:**
- Risk: Major version upgrades (e.g., Prisma 5.x → 6.x) may require schema and query changes
- Impact: Database migration complexity increases with major versions
- Migration plan: Test all Prisma queries after upgrade; check breaking changes in Prisma changelog; run `prisma:migrate` carefully

**Lucide React (Frontend):**
- Risk: Large icon library increases bundle size
- Impact: `lucide-react/dynamic.d.ts` is 37,765 lines; tree-shaking may not catch all imports
- Migration plan: Consider using specific icon imports rather than dynamic imports; use `lucide-react/dist/...` prefixed builds for smaller bundles

## Missing Critical Features

**API Rate Limiting Visibility:**
- Problem: Rate limiting is configured (`backend/src/middleware/rateLimiter.ts`) but no admin UI to view rate limit status
- Blocks: Cannot easily diagnose if legitimate users are being rate-limited

**Test Coverage for Edge Cases:**
- Problem: Recurring chore edge cases (leap years, month-end dates, DST transitions) may not be fully tested
- Files: `backend/src/services/recurrence.service.ts`
- Blocks: Potential bugs in date calculation for unusual recurrence patterns

## Test Coverage Gaps

**Frontend Error Handling Paths:**
- What's not tested: API error responses, network failures, 401 auto-logout flow
- Files: `frontend/src/api/client.ts`, `frontend/src/hooks/useAuth.tsx`
- Risk: Error handling code paths may not work correctly in production
- Priority: Medium

**CSRF Token Refresh Logic:**
- What's not tested: The automatic CSRF token retry mechanism in `client.ts` (lines 110-129)
- Files: `frontend/src/api/client.ts`
- Risk: If CSRF token refresh fails, requests may fail silently or loop
- Priority: Medium

**Overdue Penalty Edge Cases:**
- What's not tested: Penalty applied flag preventing double-penalizing, timezone handling for due dates
- Files: `backend/src/services/overdue-penalty.service.ts`
- Risk: Users might be penalized twice or not at all due to timezone issues
- Priority: High

## Non-Obvious Conventions

**API Response Envelope:**
- All API responses use `{ "success": true, "data": { ... }, "error": null }` format
- Files: `backend/src/controllers/*.ts`, `frontend/src/types/index.ts`
- Note: Frontend API layer (`frontend/src/api/client.ts`) returns `response.data` which contains the inner `data` object

**Pocket Money Stored in Cents:**
- Point values converted to currency using `pointValueInCents` (integer math, not floats)
- Files: `backend/src/services/pocket-money.service.ts`, `backend/prisma/schema.prisma` (PointTransaction model)
- Note: Always use integer arithmetic for money calculations to avoid floating-point errors

**E2E Test Naming Convention:**
- E2E tests in `e2e/` use `.spec.ts` suffix (Playwright convention)
- Backend unit tests use `.test.ts` suffix (Jest convention)
- Backend integration tests use `.integration.test.ts` pattern (matched by jest config)
- Files: `e2e/*.spec.ts`, `backend/src/__tests__/**/*.test.ts`, `backend/src/__tests__/integration/*.integration.test.ts`

**Swagger Documentation Generation:**
- OpenAPI spec at `docs/swagger.json` is auto-generated from `@swagger` JSDoc blocks in route files
- Files: `backend/src/routes/*.ts`, `backend/scripts/generate-swagger.ts`, `backend/src/swagger.config.ts`
- Note: Never hand-edit `swagger.json` - changes will be overwritten; use `npm run docs:generate` and commit updated file
- CI gate: `npm run docs:validate` fails build if `swagger.json` is stale

**Auth:unauthorized Event Flow:**
- 401 responses trigger auto-logout via custom DOM event `auth:unauthorized`
- Files: `frontend/src/api/client.ts` (lines 102-108), `frontend/src/hooks/useAuth.tsx`
- Note: Any API call can trigger logout; ensure error handling doesn't interfere with this mechanism

---

*Concerns audit: 2026-04-28*
