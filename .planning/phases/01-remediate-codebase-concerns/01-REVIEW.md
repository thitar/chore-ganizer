---
phase: 01-remediate-codebase-concerns
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - .github/workflows/ci-cd.yml
  - AGENTS.md
  - backend/eslint.config.cjs
  - backend/package.json
  - backend/src/__tests__/integration/global-setup.ts
  - backend/src/__tests__/integration/global-teardown.ts
  - backend/src/__tests__/integration/jest-setup.ts
  - backend/src/__tests__/services/overdue-penalty.service.test.ts
  - backend/src/app.ts
  - backend/src/controllers/auth.controller.ts
  - backend/src/controllers/overdue-penalty.controller.ts
  - backend/src/controllers/recurring-chores-crud.controller.ts
  - backend/src/controllers/recurring-chores-occurrences.controller.ts
  - backend/src/controllers/recurring-chores.controller.ts
  - backend/src/middleware/auth.ts
  - backend/src/middleware/errorHandler.ts
  - backend/src/prisma/seed.ts
  - backend/src/routes/index.ts
  - backend/src/routes/recurring-chores-crud.routes.ts
  - backend/src/routes/recurring-chores-occurrences.routes.ts
  - backend/src/schemas/validation.schemas.ts
  - backend/src/services/audit.service.ts
  - backend/src/services/notification-settings.service.ts
  - backend/src/services/ntfy.service.ts
  - backend/src/services/overdue-penalty.service.ts
  - backend/src/services/recurring-chores/assignment.service.ts
  - backend/src/services/recurring-chores/occurrence-management.service.ts
  - backend/src/services/recurring-chores/occurrence.service.ts
  - backend/src/services/recurring-chores/recurring-chore-management.service.ts
  - backend/src/services/recurring-chores/transform.service.ts
  - backend/src/swagger.config.ts
  - docker-compose.sh
  - docs/JSON-STORAGE-EVALUATION.md
  - frontend/src/App.tsx
  - frontend/src/api/assignments.api.ts
  - frontend/src/api/client.test.ts
  - frontend/src/api/client.ts
  - frontend/src/hooks/useAuth.test.tsx
findings:
  critical: 4
  warning: 15
  info: 3
  total: 22
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-28
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

This review covered backend controllers, services, middleware, routes, tests, CI/CD configuration, and frontend API/hooks. The codebase shows good separation of concerns and consistent API patterns, but several critical issues were found: a malformed CI/CD workflow file, an SSRF vulnerability via ntfy URLs, an unhandled exception in the logout flow, and an authorization bypass allowing unrestricted parent registration. Additionally, multiple warnings were identified around JSON parsing without error handling, response format inconsistencies, N+1 queries, and missing async error handling on several routes.

## Critical Issues

### CR-01: Malformed CI/CD Workflow YAML

**File:** `.github/workflows/ci-cd.yml:69`
**Issue:** The "Validate Swagger documentation" step is not indented under the `backend` job's `steps:` block. It appears as a top-level YAML list item, which will cause GitHub Actions to fail parsing the workflow file entirely.
**Fix:**
```yaml
      - name: Generate Prisma Client
        working-directory: backend
        run: npm run prisma:generate

      - name: Validate Swagger documentation
        working-directory: backend
        run: npm run docs:validate

      - name: Run unit tests with coverage
```

### CR-02: SSRF Vulnerability via Ntfy Notification URL

**File:** `backend/src/services/ntfy.service.ts:38-97`, `backend/src/services/notification-settings.service.ts:204-208`
**Issue:** `sendNtfyNotification` and `checkNtfyConnection` make HTTP requests to a `serverUrl` value that originates from user-configured notification settings (`ntfyServerUrl`). There is no URL validation, allowlist, or SSRF protection. A parent user (or an attacker who compromises a parent account) can set `ntfyServerUrl` to an internal IP (e.g., `http://169.254.169.254/`, `http://localhost:3010/api/...`) and use the test notification feature to probe or attack internal services.
**Fix:** Add URL validation in `updateSettings` and before making requests:
```typescript
// Reject private/internal IPs and non-HTTP(S) protocols
const allowedProtocols = ['http:', 'https:']
const url = new URL(serverUrl)
if (!allowedProtocols.includes(url.protocol)) {
  throw new AppError('Invalid notification server URL', 400, 'VALIDATION_ERROR')
}
// Additionally block private IP ranges
```

### CR-03: Uncaught Exception in Logout Callback

**File:** `backend/src/controllers/auth.controller.ts:91-108`
**Issue:** The `logout` function is declared `async` but uses `req.session.destroy()` with a callback. If `destroy()` returns an error, the `throw new AppError(...)` on line 93 occurs inside the callback context, not the async function context. Express's `asyncHandler` (or default error handling) cannot catch throws inside callbacks, resulting in an unhandled exception that crashes the process or leaves the request hanging.
**Fix:** Promisify the destroy call:
```typescript
export const logout = async (req: Request, res: Response) => {
  const userId = req.user?.id

  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(new AppError('Failed to logout', 500, 'INTERNAL_ERROR'))
      } else {
        resolve()
      }
    })
  })

  if (userId) {
    auditService.logLogout(req, userId)
  }

  res.clearCookie('connect.sid')
  res.json({ success: true, data: { message: 'Logged out successfully' } })
}
```

### CR-04: Unrestricted Parent Role Registration

**File:** `backend/src/controllers/auth.controller.ts:15-36`
**Issue:** The `register` controller accepts a `role` field from the request body without validation or authorization checks. A new user can set `role: 'PARENT'` during self-registration, bypassing any intended role-gating. This is an authorization bypass vulnerability.
**Fix:** Restrict registration to `CHILD` by default, and require an existing authenticated parent to create new parent accounts:
```typescript
export const register = async (req: Request, res: Response) => {
  const { email, password, name, role } = req.body

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400, 'VALIDATION_ERROR')
  }

  // Only allow CHILD registration via public endpoint
  const effectiveRole = 'CHILD'

  const result = await authService.register({ email, password, name, role: effectiveRole })
  // ...
}
```

## Warnings

### WR-01: Cannot Set Penalty Multiplier to Zero

**File:** `backend/src/controllers/overdue-penalty.controller.ts:72-84`
**Issue:** The validation logic on line 72-78 correctly accepts `0` as a valid multiplier. However, line 83 uses a truthy check (`overduePenaltyMultiplier ? ... : undefined`) which treats `0` and `'0'` as falsy, causing the update to ignore the value and fall back to the existing setting. A parent cannot disable point penalties by setting the multiplier to 0.
**Fix:**
```typescript
overduePenaltyMultiplier: overduePenaltyMultiplier !== undefined 
  ? parseInt(overduePenaltyMultiplier, 10) 
  : undefined,
```

### WR-02: Debug Logs Leak Session Cookies

**File:** `backend/src/middleware/auth.ts:16`
**Issue:** When `LOG_LEVEL=debug`, the authentication middleware logs `req.headers.cookie` which contains the session identifier (`connect.sid`). Session IDs are sensitive credentials; logging them creates an information disclosure risk if logs are accessible to unauthorized parties.
**Fix:** Redact or omit the `Cookie` header from debug logs:
```typescript
logger.debug('Auth middleware session debug', { 
  sessionId: req.sessionID, 
  origin: req.headers.origin, 
  host: req.headers.host 
})
```

### WR-03: API Response Format Inconsistency

**File:** `backend/src/controllers/overdue-penalty.controller.ts:28-48, 87-91, 118-121, 171, 214`
**Issue:** The overdue penalty controller returns responses in multiple non-standard formats: `res.json(settings)` (no envelope), `res.json({ error: '...' })` (missing success/code), and `res.json({ message: ..., ...result })` (mixed envelope). This violates the API response envelope convention documented in AGENTS.md (`{ success, data, error }`).
**Fix:** Standardize all responses to use the envelope format:
```typescript
res.json({ success: true, data: settings })
res.status(400).json({ success: false, error: { message: '...', code: 'VALIDATION_ERROR' } })
```

### WR-04: JSON.parse Without Error Handling

**File:** `backend/src/services/recurring-chores/transform.service.ts:8`, `backend/src/controllers/recurring-chores-occurrences.controller.ts:57, 146, 197, 246`, `backend/src/services/recurring-chores/occurrence-management.service.ts:9, 67`
**Issue:** Multiple call sites parse `assignedUserIds` (a JSON string stored in the database) or `recurrenceRule` without try-catch blocks. If the database contains malformed JSON (due to corruption, manual insertion, or a bug), the request will crash with an unhandled exception.
**Fix:** Wrap JSON.parse in try-catch and return meaningful errors:
```typescript
let assignedUserIds: number[]
try {
  assignedUserIds = JSON.parse(occ.assignedUserIds) as number[]
} catch {
  throw new AppError('Invalid occurrence data', 500, 'DATA_INTEGRITY_ERROR')
}
```

### WR-05: N+1 Query in Overdue Penalty Processing

**File:** `backend/src/services/overdue-penalty.service.ts:275-283`
**Issue:** Inside the `for...of` loop that processes overdue chores, `getAllParents()` is called on every iteration. This queries the database once per overdue chore instead of once total. If there are many overdue chores, this creates unnecessary load and could return inconsistent results if parent data changes mid-loop.
**Fix:** Move `getAllParents()` outside the loop:
```typescript
const parents = await getAllParents()
for (const assignment of overdueChores) {
  // ...
  for (const parent of parents) {
    await notifyParentOfOverdue(parent.id, { ... })
  }
}
```

### WR-06: Wrong Notification Type for Penalty

**File:** `backend/src/services/overdue-penalty.service.ts:195-199`
**Issue:** `notifyChildOfPenalty` sends a `POINTS_EARNED` notification type instead of a `PENALTY` type. The child receives a push notification styled as a positive points-earned event when they have actually been penalized. This is confusing UX and misrepresents the event semantically.
**Fix:** Use a dedicated `PENALTY` notification type or at minimum use `CHORE_OVERDUE`:
```typescript
return sendPushNotification(userId, 'PENALTY', {
  choreTitle: context.choreTitle,
  points: context.penaltyPoints,
})
```

### WR-07: Jest Mock Path Mismatch

**File:** `backend/src/__tests__/services/overdue-penalty.service.test.ts:10, 15, 21`
**Issue:** The test imports modules without `.js` extensions (e.g., `../../services/notifications.service`) but mocks them with `.js` extensions (`../../services/notifications.service.js`). Depending on Jest's module resolution configuration, the mock may not be applied to the actual import, causing tests to use real implementations and potentially fail or have side effects.
**Fix:** Align mock paths with import paths:
```typescript
jest.mock('../../services/notifications.service', () => ({ ... }))
jest.mock('../../services/notification-settings.service', () => ({ ... }))
jest.mock('../../config/database', () => ({ ... }))
```

### WR-08: unhandledRejection Handler Masks Test Failures

**File:** `backend/src/__tests__/integration/jest-setup.ts:28-29`
**Issue:** The global `process.on('unhandledRejection', ...)` handler logs errors instead of letting them propagate. In a test environment, an unhandled promise rejection should fail the test. By catching and merely logging it, this handler can mask real bugs and cause tests to pass when they should fail.
**Fix:** Remove the global handler for the test environment, or re-throw the error:
```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise, reason })
  throw reason // Ensure tests fail
})
```

### WR-09: Empty Object Cast as ChoreAssignment

**File:** `frontend/src/api/assignments.api.ts:118-126`
**Issue:** The `complete` method falls back to `{} as ChoreAssignment` when the response doesn't contain an assignment object. This is a runtime type lie — downstream code expecting valid assignment properties will encounter `undefined` values, leading to confusing runtime errors far from the source.
**Fix:** Throw an error if the response is malformed:
```typescript
if (!data?.assignment) {
  throw new Error('Invalid response: missing assignment data')
}
return {
  assignment: data.assignment,
  pointsAwarded: data.pointsAwarded ?? 0,
}
```

### WR-10: Session Configuration Not Validated

**File:** `backend/src/app.ts:101-102`
**Issue:** `SESSION_MAX_AGE` and `SAMESITE_POLICY` environment variables are parsed and cast without validation. Invalid values (e.g., `SESSION_MAX_AGE=abc`) result in `NaN` for cookie maxAge, which browsers typically treat as a session cookie. Invalid `SAMESITE_POLICY` values are passed to the browser unchecked via a TypeScript cast.
**Fix:** Add runtime validation:
```typescript
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE) || 604800000
if (isNaN(sessionMaxAge) || sessionMaxAge <= 0) {
  logger.error('Invalid SESSION_MAX_AGE')
  process.exit(1)
}
const validSameSite = ['strict', 'lax', 'none']
const sameSitePolicy = validSameSite.includes(rawSameSite) ? rawSameSite : 'strict'
```

### WR-11: Route Mounting Ambiguity for Recurring Chores

**File:** `backend/src/routes/index.ts:124-125`
**Issue:** Both `recurringChoresOccurrencesRoutes` and `recurringChoresCrudRoutes` are mounted on `/recurring-chores`. While Express processes them in order, a `GET /recurring-chores/occurrences/123` (without `/complete`) does not match any occurrence route and falls through to the CRUD router, where `/:id` tries to parse `occurrences/123` as an ID. This returns a 400 validation error instead of a proper 404.
**Fix:** Mount occurrence routes under a dedicated path or add a catch-all 404 handler in the occurrences router:
```typescript
router.use('/recurring-chores/occurrences', recurringChoresOccurrencesRoutes)
router.use('/recurring-chores', recurringChoresCrudRoutes)
```

### WR-12: Missing asyncHandler on Several Routes

**File:** `backend/src/routes/index.ts:51, 81, 94, 132`
**Issue:** `/health/live`, `/health/cache`, `/.well-known/security.txt`, and `/api/csrf-token` are not wrapped in `asyncHandler`. If any of their controllers are async and throw, the error will be an unhandled promise rejection rather than being caught by the global error handler.
**Fix:** Wrap all route handlers that could be async:
```typescript
router.get('/health/live', asyncHandler(healthController.livenessCheck))
router.get('/health/cache', asyncHandler(healthController.getCacheStatsHandler))
router.get('/.well-known/security.txt', asyncHandler(healthController.getSecurityTxt))
app.get('/api/csrf-token', asyncHandler(getCsrfToken))
```

### WR-13: Swagger Schema Missing YEARLY Frequency

**File:** `backend/src/swagger.config.ts:45`
**Issue:** The `RecurrenceFrequency` enum in the OpenAPI schema only lists `['DAILY', 'WEEKLY', 'MONTHLY']`, but the Zod schema and implementation support `'YEARLY'` as well. API consumers relying on the swagger docs will not know this value is valid.
**Fix:**
```typescript
RecurrenceFrequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
```

### WR-14: Import Missing .js Extension

**File:** `backend/src/swagger.config.ts:2`
**Issue:** `import { VERSION } from './version'` is missing the `.js` extension. The project uses Node.js ESM (evidenced by `.js` extensions on all other local imports), and this import is inconsistent. Depending on the module resolution strategy, this could cause import failures.
**Fix:**
```typescript
import { VERSION } from './version.js'
```

## Info

### IN-01: Multiple `any` Type Usages

**File:** `backend/src/services/audit.service.ts:12`, `backend/src/controllers/recurring-chores-crud.controller.ts:115, 201`, `frontend/src/api/assignments.api.ts:33, 70`
**Issue:** Several places use `any` instead of proper types, reducing type safety and maintainability. These should be replaced with specific types or interfaces.
**Fix:** Replace `any` with appropriate Prisma types, Zod inferred types, or defined interfaces.

### IN-02: Redundant parseInt Call

**File:** `backend/src/controllers/overdue-penalty.controller.ts:72-84`
**Issue:** The `overduePenaltyMultiplier` is parsed with `parseInt` on line 73 for validation, then parsed again on line 83 for the update call. The validated value is not reused.
**Fix:** Store the parsed value and reuse it:
```typescript
let parsedMultiplier: number | undefined
if (overduePenaltyMultiplier !== undefined) {
  parsedMultiplier = parseInt(overduePenaltyMultiplier, 10)
  if (isNaN(parsedMultiplier) || parsedMultiplier < 0 || parsedMultiplier > 10) { ... }
}
// ...
overduePenaltyMultiplier: parsedMultiplier,
```

### IN-03: Hardcoded Default Password in Seed

**File:** `backend/src/prisma/seed.ts:11`
**Issue:** The seed file uses a hardcoded password (`password123`) for all default users. While this is only for initial development/demo data and is documented in AGENTS.md, it should be prominently noted that these credentials must be changed immediately in any production deployment.
**Fix:** Add a prominent comment warning in the seed file:
```typescript
// WARNING: Default password for development only. Change immediately in production.
const passwordHash = await bcrypt.hash('password123', 10)
```

---

_Reviewed: 2026-04-28_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
