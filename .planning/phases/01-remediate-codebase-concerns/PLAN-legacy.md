# Phase 1 Plan: Remediate Codebase Concerns

**Phase:** 1 — Remediate Codebase Concerns  
**Goal:** Systematically address all concerns documented in `.planning/codebase/CONCERNS.md` to improve security, reliability, performance, and maintainability.  
**Created:** 2026-04-28

---

## Executive Summary

The codebase audit identified **18 distinct concerns** across 8 categories. This plan organizes them into 5 execution waves by priority and dependency. Each wave contains related work that can be completed and verified independently.

| Wave | Theme | Priority | Est. Effort |
|------|-------|----------|-------------|
| 1 | Security Hardening | **Critical** | Medium |
| 2 | Critical Bug Fixes | **Critical** | Small |
| 3 | Test Coverage Expansion | **High** | Medium |
| 4 | Performance Improvements | **Medium** | Medium |
| 5 | Tech Debt Reduction | **Low** | Large |
| 6 | Scaling & Future Prep | **Deferred** | Large |

---

## Wave 1: Security Hardening (Priority: Critical)

### 1.1 Startup Session Secret Validation
- **Concern:** `SESSION_SECRET` has no default; app fails cryptically if missing
- **File:** `backend/src/app.ts`
- **Action:** Add explicit startup check for `SESSION_SECRET`. If missing, log a clear fatal error and exit with code 1.
- **Verification:** 
  - Start app without `SESSION_SECRET` → see clear error, exits immediately
  - Start app with `SESSION_SECRET` → boots normally

### 1.2 CSRF Token Retry Loop Prevention
- **Concern:** CSRF token errors trigger automatic retry that could infinite-loop if refresh fails
- **File:** `frontend/src/api/client.ts` (lines 110-129)
- **Action:** 
  - Add `maxRetries: 1` counter to the retry logic
  - Track retry state per-request to prevent loops
  - On second 403, propagate error to caller (triggers logout via existing `auth:unauthorized` flow)
- **Verification:**
  - Mock 403 response twice → request fails after exactly 1 retry
  - Single 403 → retries once with new token, succeeds

### 1.3 Production Error Response Sanitization
- **Concern:** Stack traces or detailed errors might leak in production
- **File:** `backend/src/middleware/errorHandler.ts`
- **Action:**
  - Check `NODE_ENV === 'production'`
  - In production: return only `{ success: false, error: { code, message } }` — never `stack`, never internal details
  - In development: keep full error details for debugging
- **Verification:**
  - Throw error in production mode → response contains no stack trace
  - Throw error in development mode → response contains stack trace

---

## Wave 2: Critical Bug Fixes (Priority: Critical)

### 2.1 Access Denied Notification for Child Users
- **Concern:** Children accessing parent-only routes are silently redirected without feedback
- **File:** `frontend/src/App.tsx` (lines 32-40, `ProtectedRoute` component)
- **Action:**
  - In `ProtectedRoute`, before redirecting child users, dispatch a toast/notification event
  - Show "Access Denied — This page is for parents only" toast
  - Then redirect to dashboard
- **Verification:**
  - Log in as child, navigate to `/users` → see toast notification, then redirect to dashboard

### 2.2 Version Synchronization Automation
- **Concern:** Version numbers must be manually kept in sync across `backend/package.json`, `frontend/package.json`, `.env`
- **Files:** `backend/package.json`, `frontend/package.json`, `.env`, `docker-compose.sh`
- **Action:**
  - Add a pre-build validation script that reads `backend/package.json` version and validates `frontend/package.json` matches
  - Update `docker-compose.sh` to automatically sync `APP_VERSION` from `backend/package.json` if `.env` is stale
  - Add CI gate: fail build if versions don't match
- **Verification:**
  - Change only backend version → build fails with clear mismatch error
  - Versions match → build passes

---

## Wave 3: Test Coverage Expansion (Priority: High)

### 3.1 Frontend Error Handling Path Tests
- **Concern:** API errors, network failures, 401 auto-logout are untested
- **Files:** `frontend/src/api/client.ts`, `frontend/src/hooks/useAuth.tsx`
- **Action:**
  - Add Vitest tests for `client.ts` interceptors:
    - Network failure → proper error thrown
    - 401 response → `auth:unauthorized` event dispatched
    - 500 response → error propagated to caller
  - Add tests for `useAuth.tsx`:
    - Event listener responds to `auth:unauthorized` by clearing state and redirecting
- **Verification:**
  - Run `npm test` in frontend → all new tests pass
  - Coverage report shows `client.ts` and `useAuth.tsx` error paths covered

### 3.2 CSRF Token Refresh Logic Tests
- **Concern:** Automatic CSRF retry mechanism is untested
- **File:** `frontend/src/api/client.ts`
- **Action:**
  - Mock Axios to return 403 on first call, 200 on second
  - Verify interceptor fetches new CSRF token and retries exactly once
  - Mock 403 on both calls → verify error is thrown, no infinite loop
- **Verification:**
  - New tests pass; no regressions in existing tests

### 3.3 Overdue Penalty Edge Case Tests
- **Concern:** Double-penalty prevention and timezone handling are untested
- **File:** `backend/src/services/overdue-penalty.service.ts`
- **Action:**
  - Add unit tests for:
    - Chore overdue → penalty applied → same chore checked again → no second penalty (`penaltyApplied` flag respected)
    - Timezone boundary: due date at 23:59 UTC vs local timezone
    - Leap year Feb 29 handling
    - DST transition handling
  - Use mocked Prisma and date-fns/spacetime for timezone control
- **Verification:**
  - Run `npm run test:unit` → new tests pass

---

## Wave 4: Performance Improvements (Priority: Medium)

### 4.1 Batch Recurrence Generation
- **Concern:** `generateOccurrencesForChore` inserts occurrences one-by-one in a loop
- **File:** `backend/src/controllers/recurring-chores.controller.ts` (lines 51-84)
- **Action:**
  - Refactor to build an array of occurrence objects
  - Use `prisma.choreOccurrence.createMany()` for single batch insert
  - Keep transaction safety: wrap in `$transaction` if needed for related updates
- **Verification:**
  - Integration test generates 30 occurrences → completes in <100ms (vs current sequential time)
  - All existing recurring chore tests pass

### 4.2 Remove Console Statements from Backend
- **Concern:** 45 `console.log/warn/error` statements in backend source code
- **Files:** `backend/src/**/*.ts` (multiple)
- **Action:**
  - Replace all `console.*` calls with Winston logger (`import logger from '../utils/logger'`)
  - For debug-level logs: use `logger.debug()`
  - For errors: use `logger.error()` with structured metadata
  - Add lint rule (`no-console`) to `.eslintrc` for `backend/src/` to prevent regressions
- **Verification:**
  - `grep -r "console\." backend/src/ --include="*.ts"` → returns only test files and `logger.ts` itself
  - Backend starts and logs normally via Winston
  - `npm run lint` passes

---

## Wave 5: Tech Debt Reduction (Priority: Low)

### 5.1 Document Frontend-Backend Parameter Naming Convention
- **Concern:** Developers must remember to map `userId`→`assignedToId`, `templateId`→`choreTemplateId`
- **Files:** `frontend/src/api/assignments.api.ts`, `backend/src/controllers/chore-assignments.controller.ts`
- **Action:**
  - Add JSDoc comment block at top of `frontend/src/api/assignments.api.ts` documenting the convention
  - Add comment at each mapping site: `// Naming convention: frontend uses 'userId', backend expects 'assignedToId'`
  - Update AGENTS.md with a note under "Non-Obvious Conventions"
- **Verification:**
  - New developer can understand the mapping by reading the file header comments

### 5.2 Extract Helper Functions from Recurring-Chores Controller
- **Concern:** `recurring-chores.controller.ts` is 1081 lines, violating single responsibility
- **File:** `backend/src/controllers/recurring-chores.controller.ts`
- **Action:**
  - Extract `transformRecurringChore()` → `backend/src/services/recurring-chores/transform.service.ts`
  - Extract `generateOccurrencesForChore()` → `backend/src/services/recurring-chores/occurrence.service.ts`
  - Extract `calculateAssignedUserIds()` → `backend/src/services/recurring-chores/assignment.service.ts`
  - Controller imports and calls these services; routes remain unchanged
- **Verification:**
  - All existing tests pass without modification
  - Controller file is <300 lines
  - New service files each have <400 lines and clear single responsibility

### 5.3 Evaluate JSON Storage for Recurrence Rules
- **Concern:** `recurrenceRule` stored as JSON string requires manual parse/stringify
- **Files:** `backend/prisma/schema.prisma`, `backend/src/controllers/recurring-chores.controller.ts`
- **Action:**
  - Evaluate Prisma's native `Json` type vs keeping string with Zod validation
  - If `Json` type: update schema, add migration, remove all `JSON.parse/stringify` calls
  - If keeping string: add Zod schema validation at DB boundary with clear error messages
- **Verification:**
  - Recurring chore CRUD operations work correctly
  - Invalid recurrence rule JSON is rejected with clear validation error

---

## Wave 6: Scaling & Future Preparation (Priority: Deferred)

### 6.1 Document SQLite-to-PostgreSQL Migration Path
- **Concern:** SQLite won't scale beyond single-family use
- **Action:** Document migration steps in `docs/MIGRATION-POSTGRES.md`:
  - Update `prisma/schema.prisma` datasource
  - Connection string changes
  - Data export/import considerations
- **No code changes yet.**

### 6.2 Document Redis Cache Migration Path
- **Concern:** `node-cache` is per-instance
- **Action:** Document Redis integration steps in `docs/MIGRATION-REDIS.md`
- **No code changes yet.**

### 6.3 Evaluate Lucide React Bundle Size
- **Concern:** `lucide-react/dynamic.d.ts` is 37,765 lines; tree-shaking may fail
- **Action:**
  - Run `npm run build` in frontend and analyze bundle (`vite-bundle-visualizer`)
  - If Lucide is oversized, switch to specific icon imports (`import { Home } from 'lucide-react'`)
- **No code changes unless analysis confirms issue.**

### 6.4 Prisma Major Version Upgrade Prep
- **Concern:** Future Prisma 5.x → 6.x may have breaking changes
- **Action:**
  - Pin Prisma version in `package.json` with explicit minor version
  - Add CI step that runs `prisma generate` and validates schema compiles
  - Monitor Prisma changelog for deprecation warnings
- **No upgrade yet.**

---

## Verification & Exit Criteria

Before marking this phase complete, verify:

- [ ] **Security:** All 3 security concerns are addressed and manually verified
- [ ] **Bugs:** Silent redirect shows toast; version sync is automated
- [ ] **Tests:** Frontend error paths, CSRF retry, and overdue penalties all have passing tests
- [ ] **Performance:** Recurrence generation uses batch inserts; no `console.*` in backend source
- [ ] **Tech Debt:** Controller refactored; parameter naming documented; JSON storage evaluated
- [ ] **CI/CD:** All tests pass (`npm test` in backend and frontend); lint passes; build succeeds
- [ ] **Documentation:** AGENTS.md updated with any new conventions

---

## Sequencing

```
Week 1: Waves 1-2 (Security + Bugs) — deployable immediately
Week 2: Waves 3-4 (Tests + Performance) — deployable
Week 3: Wave 5 (Tech Debt) — deployable
Ongoing: Wave 6 (Scaling docs) — no deployment needed
```

Each wave can be merged independently. Waves 1-2 should be prioritized for immediate release.

---

*Plan created: 2026-04-28*
*Source: .planning/codebase/CONCERNS.md*
