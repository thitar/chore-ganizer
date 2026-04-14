# swagger-jsdoc Implementation Guide

This document describes the swagger-jsdoc setup and provides step-by-step instructions for adding `@swagger` JSDoc annotations to all API routes.

## Current Status

✅ **Complete** — all routes documented end-to-end. The generated `docs/swagger.json` covers **61 paths / 79 operations** across 14 route files, with 0 missing operationIds, summaries, responses, or tags. CI runs `npm run docs:validate` on every backend build and fails if `swagger.json` is stale relative to the source JSDoc.

**What's wired up:**

- `swagger-jsdoc` + `@types/swagger-jsdoc` installed as devDependencies (`backend/package.json`)
- `backend/src/swagger.config.ts` — OpenAPI 3.0.3 base definition (15 tags, 55 schemas, `cookieAuth` security scheme)
- `backend/scripts/generate-swagger.ts` — generation script with `--validate` mode for CI
- `npm run docs:generate` — regenerate `docs/swagger.json`
- `npm run docs:validate` — fail if `docs/swagger.json` doesn't match what the source would generate
- `@swagger` JSDoc on every route in `backend/src/routes/` (auth, users, chore-templates, chore-assignments, chore-categories, recurring-chores, notifications, notification-settings, overdue-penalty, pocket-money, statistics, audit, metrics, health/version in `index.ts`)
- CI step `Validate Swagger documentation` in `.github/workflows/ci-cd.yml`

**When you add or change a route**, add/update its `@swagger` block (template below), run `npm run docs:generate`, and commit `docs/swagger.json` alongside the route change. The CI gate will catch you if you forget.

## How swagger-jsdoc Works

When you run `npm run docs:generate`:

1. Reads `backend/src/swagger.config.ts` for base OpenAPI definition (info, servers, tags, components/schemas)
2. Searches all files in `apis` array for `@swagger` JSDoc blocks
3. Parses JSDoc blocks and merges them with base definition
4. Outputs complete OpenAPI 3.0 spec to `docs/swagger.json`

## Adding @swagger JSDoc

Each route needs a `@swagger` JSDoc block immediately above its `router.*()` call.

### Basic Template

```typescript
/**
 * @swagger
 * /path/to/resource:
 *   method:
 *     tags: [TagName]
 *     summary: Brief one-line description
 *     description: Longer description of what this endpoint does
 *     operationId: functionName
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 *       401:
 *         description: Unauthorized
 */
router.method('/path/to/resource', ...)
```

### Example: POST /auth/login

```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     description: Authenticate a user and create a session
 *     operationId: login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login))
```

### Example: GET /users/{id}

```typescript
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user (Parent-only)
 *     operationId: getUserById
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden
 */
router.get('/:id', authenticate, authorize('PARENT'), ...)
```

## Routes Needing JSDoc (47 total)

### auth.routes.ts (4 routes)
- [ ] POST /auth/register
- [ ] POST /auth/login
- [ ] POST /auth/logout
- [ ] GET /auth/me

### users.routes.ts (3 routes)
- [ ] GET /users
- [ ] GET /users/{id}
- [ ] GET /users/{id}/assignments

### chore-templates.routes.ts (5 routes)
- [ ] GET /chore-templates
- [ ] POST /chore-templates
- [ ] GET /chore-templates/{id}
- [ ] PUT /chore-templates/{id}
- [ ] DELETE /chore-templates/{id}

### chore-assignments.routes.ts (9 routes)
- [ ] GET /chore-assignments
- [ ] POST /chore-assignments
- [ ] GET /chore-assignments/upcoming
- [ ] GET /chore-assignments/overdue
- [ ] GET /chore-assignments/calendar
- [ ] GET /chore-assignments/{id}
- [ ] PUT /chore-assignments/{id}
- [ ] DELETE /chore-assignments/{id}
- [ ] POST /chore-assignments/{id}/complete

### chore-categories.routes.ts (6 routes)
- [ ] GET /chore-categories
- [ ] POST /chore-categories
- [ ] GET /chore-categories/{id}
- [ ] PUT /chore-categories/{id}
- [ ] DELETE /chore-categories/{id}
- [ ] GET /chore-categories/{id}/templates

### notifications.routes.ts (3 routes)
- [ ] GET /notifications
- [ ] PUT /notifications/{id}/read
- [ ] PUT /notifications/read-all

### notification-settings.routes.ts (3 routes)
- [ ] GET /notification-settings
- [ ] PUT /notification-settings
- [ ] POST /notification-settings/test

### overdue-penalty.routes.ts (5 routes)
- [ ] GET /overdue-penalty/settings
- [ ] PUT /overdue-penalty/settings
- [ ] POST /overdue-penalty/process
- [ ] GET /overdue-penalty/chores
- [ ] GET /overdue-penalty/history

### recurring-chores.routes.ts (11 routes)
- [ ] GET /recurring-chores
- [ ] POST /recurring-chores
- [ ] GET /recurring-chores/occurrences
- [ ] GET /recurring-chores/{id}
- [ ] PUT /recurring-chores/{id}
- [ ] DELETE /recurring-chores/{id}
- [ ] PATCH /recurring-chores/{id}/toggle-active
- [ ] PATCH /recurring-chores/occurrences/{id}/complete
- [ ] PATCH /recurring-chores/occurrences/{id}/skip
- [ ] PATCH /recurring-chores/occurrences/{id}/unskip
- [ ] POST /recurring-chores/trigger-occurrences

### pocket-money.routes.ts (9 routes)
- [ ] GET /pocket-money/config
- [ ] PUT /pocket-money/config
- [ ] GET /pocket-money/balance/{userId}
- [ ] GET /pocket-money/transactions/{userId}
- [ ] POST /pocket-money/bonus
- [ ] POST /pocket-money/deduction
- [ ] POST /pocket-money/advance
- [ ] GET /pocket-money/payouts/{userId}
- [ ] POST /pocket-money/payout
- [ ] GET /pocket-money/projected/{userId}

### statistics.routes.ts (2 routes)
- [ ] GET /statistics/family
- [ ] GET /statistics/child/{childId}

### audit.routes.ts (1 route)
- [ ] GET /audit

### metrics.routes.ts (1 route)
- [x] GET /metrics (done)

## Quick Reference: Available Schemas

All schemas defined in `backend/src/swagger.config.ts` are available via `$ref`:

**Auth:**
- `#/components/schemas/RegisterRequest`
- `#/components/schemas/LoginRequest`
- `#/components/schemas/AuthResponse`

**Users:**
- `#/components/schemas/User`
- `#/components/schemas/CreateUserRequest`
- `#/components/schemas/UpdateUserRequest`
- `#/components/schemas/UpdateMyProfileRequest`

**Chores:**
- `#/components/schemas/ChoreTemplate`, `CreateChoreTemplateRequest`, `UpdateChoreTemplateRequest`
- `#/components/schemas/ChoreAssignment`, `CreateChoreAssignmentRequest`, `UpdateChoreAssignmentRequest`
- `#/components/schemas/ChoreCategory`, `CreateChoreCategoryRequest`, `UpdateChoreCategoryRequest`

**Notifications:**
- `#/components/schemas/Notification`
- `#/components/schemas/NotificationSettings`, `UpdateNotificationSettingsRequest`

**Recurring Chores:**
- `#/components/schemas/RecurringChore`, `CreateRecurringChoreRequest`, `UpdateRecurringChoreRequest`
- `#/components/schemas/ChoreOccurrence`, `CompleteOccurrenceRequest`, `SkipOccurrenceRequest`

**Pocket Money:**
- `#/components/schemas/PointTransaction`, `TransactionResponse`
- `#/components/schemas/AddBonusRequest`, `AddDeductionRequest`, `AddAdvanceRequest`

**And more...** See full list in `backend/src/swagger.config.ts`.

## Workflow

1. **Pick a route file** (or multiple files)
2. **For each route**, add `@swagger` JSDoc block above the `router.*()` call
3. **Regenerate docs**: `cd backend && npm run docs:generate`
4. **Check output**: `docs/swagger.json` should show increasing path count
5. **Verify with UI**: Use Swagger UI or similar tool to view the spec
6. **Commit**: `git add backend/src/routes/*.ts docs/swagger.json && git commit -m "docs: add swagger JSDoc to [file].ts"`

## Testing

After adding JSDoc to routes:

```bash
cd backend

# Generate
npm run docs:generate
# Should output: ✓ Generated docs/swagger.json (N paths)

# Validate
npm run docs:validate
# Should output: ✓ docs/swagger.json is up to date
```

## Integration with CI

Once all JSDoc is added, CI will validate that:
1. `npm run docs:validate` passes in the "Backend Tests & Build" job
2. If a route is added/modified but JSDoc not updated, CI fails
3. Developers must regenerate docs when adding/changing routes

## Notes

- **Tag names** must match tags defined in `swagger.config.ts` (Auth, Users, Chores, Notifications, etc.)
- **OperationId** should be camelCase and unique (used by code generators)
- **Parameter paths** use OpenAPI notation `{id}` not Express `:id`
- **Security** field indicates if authentication required (cookieAuth = session cookie)
- **$ref** references must match schema names exactly in `swagger.config.ts`

## References

- [swagger-jsdoc documentation](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3)
- [Current swagger.json](../../docs/swagger.json)

---

**Status:** The foundation is in place. Adding JSDoc is straightforward—copy patterns from existing routes in `docs/swagger.json` reference, replace path parameters, and adjust summaries.
