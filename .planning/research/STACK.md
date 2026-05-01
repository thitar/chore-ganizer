# Technology Stack Remediation

**Project:** Chore-Ganizer Codebase Health & Quality
**Researched:** 2026-05-01
**Overall confidence:** HIGH

## 1. Prisma `$use` → `$extends` Migration for recurrenceRule Serialization

### Current State

`backend/src/config/database.ts` (lines 15-47) uses deprecated `prisma.$use()` middleware to auto-serialize/deserialize `recurrenceRule` as a JSON string for SQLite compatibility. The middleware intercepts ALL operations on the `RecurringChore` model and manually handles `create`, `update`, `upsert`, `createMany`, `updateMany` actions, plus deserialization on read. It also contains the `as any` cast at line 29 for the `upsert` sub-operation args.

### Why This Must Change

- `prisma.$use()` was **deprecated in Prisma v4** and **removed in Prisma v6** (current Prisma is at v7.9.x-dev, with v6.19.3 as the latest stable 6.x).
- Blocked from all Prisma upgrades beyond 5.22.0.
- The middleware is fragile: manually handles array vs. single-object args, must be updated for every new action type.
- Contains an `as any` cast that must be eliminated.

### Target: Prisma `$extends` Query Extension

The `$extends` API was introduced in Prisma v4 and is the canonical replacement. A **query extension** on the `recurringChore` model is the correct approach — it intercepts specific operations (create, update, upsert, etc.) on a per-model basis, with full type safety on `args`.

### Recommended Code

Replace the entire `$use` block in `database.ts` with:

```typescript
import { PrismaClient } from '@prisma/client'

// --- Helper: deserialize recurrenceRule in a result ---
function deserializeRule<T>(record: T): T {
  if (!record || typeof record !== 'object') return record
  const r = record as Record<string, unknown>
  if (r.recurrenceRule && typeof r.recurrenceRule === 'string') {
    r.recurrenceRule = JSON.parse(r.recurrenceRule as string)
  }
  return record
}

// --- Create base client ---
const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createExtendedClient> }

function createExtendedClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  return base.$extends({
    query: {
      recurringChore: {
        // ============ WRITES: serialize object → JSON string ============
        async create({ args, query }) {
          if (args.data.recurrenceRule && typeof args.data.recurrenceRule === 'object') {
            args.data.recurrenceRule = JSON.stringify(args.data.recurrenceRule)
          }
          return query(args)
        },

        async update({ args, query }) {
          if (args.data.recurrenceRule && typeof args.data.recurrenceRule === 'object') {
            args.data.recurrenceRule = JSON.stringify(args.data.recurrenceRule)
          }
          return query(args)
        },

        async upsert({ args, query }) {
          if (args.create.recurrenceRule && typeof args.create.recurrenceRule === 'object') {
            args.create.recurrenceRule = JSON.stringify(args.create.recurrenceRule)
          }
          if (args.update.recurrenceRule && typeof args.update.recurrenceRule === 'object') {
            args.update.recurrenceRule = JSON.stringify(args.update.recurrenceRule)
          }
          return query(args)
        },

        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map((d: Record<string, unknown>) => ({
              ...d,
              recurrenceRule:
                d.recurrenceRule && typeof d.recurrenceRule === 'object'
                  ? JSON.stringify(d.recurrenceRule)
                  : d.recurrenceRule,
            }))
          }
          return query(args)
        },

        async updateMany({ args, query }) {
          if (args.data.recurrenceRule && typeof args.data.recurrenceRule === 'object') {
            args.data.recurrenceRule = JSON.stringify(args.data.recurrenceRule)
          }
          return query(args)
        },

        // ============ READS: deserialize JSON string → object ============
        async findUnique({ args, query }) {
          const result = await query(args)
          return deserializeRule(result)
        },

        async findFirst({ args, query }) {
          const result = await query(args)
          return deserializeRule(result)
        },

        async findMany({ args, query }) {
          const results = await query(args)
          return results.map(deserializeRule)
        },

        async findFirstOrThrow({ args, query }) {
          const result = await query(args)
          return deserializeRule(result)
        },

        async findUniqueOrThrow({ args, query }) {
          const result = await query(args)
          return deserializeRule(result)
        },
      },
    },
  })
}

export const prisma = globalForPrisma.prisma || createExtendedClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `query` extension, not `result` extension | `result` extensions compute derived fields but can't modify the actual returned data types. `query` extensions intercept the operation itself, which is what we need for JSON serialization/deserialization. |
| Intercept all read operations (`findUnique`, `findFirst`, `findMany`, `*OrThrow`) | The old `$use` middleware handled ALL results after `next()`. With `$extends`, each operation must be listed explicitly. Missing `findFirstOrThrow`/`findUniqueOrThrow` would silently skip deserialization. |
| Type the `d` parameter in `createMany` map as `Record<string, unknown>` | Avoids the `as any` anti-pattern. The `args.data` in `createMany` is typed as `Prisma.RecurringChoreCreateManyInput[]`, but `recurrenceRule` is `string` at the Prisma level, so the runtime check `typeof === 'object'` is safe. |
| Singleton pattern preserved | The extended client is itself a PrismaClient (via `$extends` return type), so the `globalForPrisma` singleton pattern still works. |
| No `as any` | The entire old middleware used `(params.args as any)[key]`. The `$extends` approach provides fully typed `args` for each operation. |

### Migration Approach

1. **Replace `database.ts`** with the code above in a single commit.
2. **Run existing tests** — the behavior is functionally identical. Tests that interact with `RecurringChore` will catch serialization issues.
3. **Add integration tests** for serialization edge cases: `createMany` with multiple records, `upsert` with both `create` and `update` having `recurrenceRule`, `findUnique` returning null.
4. **Only then upgrade Prisma** — see "Future Prisma Upgrade Path" below.

### Prisma Version Upgrade Path

| Step | Version | Action | Rationale |
|------|---------|--------|-----------|
| 1 | 5.22.0 | Migrate `$use` → `$extends` | Stay on current version; `$extends` is fully available in 5.x |
| 2 | 5.22.0 | Run full test suite + manual testing | Verify serialization works identically |
| 3 | 6.19.3 | Upgrade `prisma` and `@prisma/client` | Latest stable 6.x; `$use` removed but we no longer use it |
| 4 | 6.19.3 | Run `prisma generate` and test suite | Verify no regressions from Prisma 6.x breaking changes |

**Do NOT jump to Prisma 7.x yet.** Prisma 7 (7.9.0-dev as of May 2026) is still in development. The 6.x line (6.19.3) is the latest stable.

### What NOT to Do

- **Do NOT use a `result` extension** — it's for computed fields, not data transformation on the model level.
- **Do NOT wrap individual prisma calls with manual serialize/deserialize** — spreads the logic across the codebase and is error-prone.
- **Do NOT skip the `findFirstOrThrow` / `findUniqueOrThrow` methods** — if any code uses these (they're in the Prisma API), the `recurrenceRule` field would remain a JSON string.
- **Do NOT upgrade Prisma before migrating** — Prisma 6+ removes `$use` and the app will crash on startup.

### Sources

- Context7: Prisma `$extends` query extension documentation (HIGH confidence)
- Prisma v6 breaking changes: `$use` middleware removed (HIGH confidence)
- Current codebase: `backend/src/config/database.ts` (lines 15-47)

---

## 2. npm Vulnerability Remediation

### Current Audit Results (2026-05-01)

**Backend** (`backend/`): 6 vulnerabilities (5 moderate, 1 high)
**Frontend** (`frontend/`): 6 vulnerabilities (4 moderate, 2 high)

### Per-Package Impact Assessment

#### axios (Backend: 1.14.0, Frontend: 1.13.6)

**Vulnerability:** SSRF via NO_PROXY bypass, header injection chain (moderate)
**Target:** `^1.15.2` (latest)
**Fix:** `npm audit fix` handles this automatically (within semver range)

**Impact Assessment:**
- **LOW** — No breaking changes between 1.13.x and 1.15.x for the project's usage.
- Backend uses axios for ntfy webhook calls (`ntfy.service.ts`). The SSRF vulnerability requires attacker control over proxy config — not applicable here, but fix for defense-in-depth.
- Frontend uses axios for all API calls. Browser environment limits exploitability.

**Audit fix will also resolve:** `follow-redirects` vulnerability (transitive dep, 1.15.11 → 1.16.0)

#### nodemailer (Backend: 8.0.4)

**Vulnerability:** SMTP command injection via CRLF in transport name option (moderate)
**Target:** `^8.0.7` (latest)
**Fix:** `npm audit fix` handles this directly.

**Impact Assessment:**
- **LOW** — The fix is in the 8.0.x patch range. The SMTP command injection requires a crafted transport name — unlikely in this self-hosted app but fix for security. No API changes between 8.0.4 and 8.0.7.

#### lodash (Frontend: ≤4.17.23, transitive)

**Vulnerability:** Prototype pollution via `_.unset`/`_.omit`, code injection via `_.template` (high)
**Target:** `4.18.1` (automatically resolved by npm)
**Fix:** `npm audit fix`

**Impact Assessment:**
- **LOW** — lodash is a transitive dependency (likely from `@testing-library/*`, `tailwindcss`, or `recharts`). The frontend package.json has no direct lodash import. The prototype pollution requires attacker-controlled object paths in `_.unset`/`_.omit` calls — not exploitable from the UI.
- **If audit fix cannot resolve lodash** (e.g., a parent dep pins an older version), add to frontend `overrides`:
  ```json
  "overrides": {
    "lodash": "^4.18.1"
  }
  ```

#### vite (Frontend: ^6.2.0)

**Vulnerability:** Path traversal in optimized deps `.map` handling, arbitrary file read via dev server WebSocket (high)
**Target:** `^6.4.3` minimum (fixes the path traversal while staying in 6.x)
**Fix:** `npm audit fix` will upgrade within the `^6.2.0` range

**Impact Assessment:**
- **MEDIUM** — Vite is dev-only, so the vulnerability only affects developers running `npm run dev`. However, a crafted dependency could exploit the path traversal during `vite build`. Fix is important for development environment security.
- **Do NOT jump to Vite 7.x or 8.x** — those introduce breaking changes in the plugin API and config format. Stay within 6.x for now.

#### uuid (Backend: ^13.0.0)

**Vulnerability:** Missing buffer bounds check in v3/v5/v6 (moderate)
**Target:** `14.0.0` (requires `--force`)
**Fix:** `npm audit fix --force`

**Impact Assessment:**
- **MEDIUM** — This is a BREAKING CHANGE for uuid. The project uses uuid for correlation IDs and family IDs. The `v4()` function (random UUID) and `v7()` function are the most commonly used, and their APIs are stable across v13 → v14. Check all `import { v4 } from 'uuid'` calls — they should not break.
- **If uuid@14 introduces issues**, the vulnerability is moderate and only affects `buf` parameter usage (which the project doesn't use), so deferring is acceptable.

### Recommended Execution Order

```bash
# 1. Backend: auto-fixable packages (no --force needed)
cd backend
npm audit fix       # Fixes: axios, follow-redirects, nodemailer, picomatch, brace-expansion
npm test            # Verify no regressions

# 2. Backend: breaking change
npm audit fix --force  # For uuid@14
npm test               # Verify uuid still works for correlation IDs

# 3. Frontend: auto-fixable packages
cd frontend
npm audit fix       # Fixes: axios, follow-redirects, lodash, postcss, vite
npm test            # Verify build and tests pass
```

### What NOT to Do

- **Do NOT run `npm audit fix --force` on frontend** — vite's `^6.2.0` constraint will resolve the fix within 6.x without force.
- **Do NOT manually pin `lodash` in frontend `dependencies`** — it's not a direct dependency. Use `overrides` if needed.
- **Do NOT skip testing after audit fix** — package upgrades can break type definitions or runtime behavior even in patch versions.

### Sources

- npm audit output for backend and frontend (2026-05-01) — HIGH confidence
- npm registry: axios@1.15.2, nodemailer@8.0.7, lodash@4.18.1, vite@6.4.3+, uuid@14.0.0 — HIGH confidence
- GitHub Advisory Database: GHSA-r4q5-vmmm-2653 (follow-redirects), GHSA-vvjj-xcjg-gr5g (nodemailer), GHSA-4w7w-66w2-5vf9 (vite), GHSA-f23m-r3pf-42rh (lodash) — HIGH confidence

---

## 3. Extract Service Layer from Fat Controller

### Current State

`backend/src/controllers/pocket-money.controller.ts` is 817 lines with:
- 27 direct `prisma` calls
- Business logic for balance calculation, pagination with running balances, transaction creation, payout period date math
- 4 helper functions defined inline (`createTransaction`, `calculatePointBalance`, `getOrCreateConfig`, `getPayoutPeriodStart`)
- 0 unit tests (can't test business logic without HTTP mocking)

### Pattern: Extract `PocketMoneyService`

Follow the existing service pattern used by `overdue-penalty.service.ts`, `notifications.service.ts`, etc. — export named functions from a `dot.case.ts` file.

### Service Boundary

The controller should only:
1. Parse request parameters (route params, query string, body)
2. Validate authorization (checks like "is this user a parent?")
3. Call the service
4. Format the HTTP response

The service should contain:
1. All `prisma` calls
2. Business logic (balance calculation, pagination, validation rules)
3. Data formatting (running balance computation, projections)

### New File Structure

```
backend/src/services/pocket-money.service.ts  (NEW — all business logic)
backend/src/controllers/pocket-money.controller.ts  (REWRITTEN — thin HTTP layer)
```

### Extract Pattern with Code Example

**Before (current controller — inline business logic):**

```typescript
// Current: pocket-money.controller.ts (817 lines)
export const getTransactionHistory = async (req: Request, res: Response) => {
  const { userId } = req.params
  const { page = '1', limit = '20', type, dateFrom, dateTo } = req.query

  // Authorization check — stays in controller
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } })
  if (currentUserId !== targetUserId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized', 403, 'FORBIDDEN')
  }

  // Business logic — MOVES to service
  const where: any = { userId: targetUserId }
  if (type && [...validTypes].includes(type)) { where.type = type }
  // ... 50+ lines of pagination logic, balance computation ...
  // ... multiple prisma calls ...
  // ... running balance loop ...
}
```

**After (controller → service extract):**

```typescript
// NEW: pocket-money.service.ts
import prisma from '../config/database.js'

export interface TransactionPage {
  transactions: Array<{
    id: number
    type: string
    amount: number
    runningBalance: number
    // ... other fields
  }>
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export async function getTransactionHistoryPaged(
  userId: number,
  filters: {
    type?: string
    dateFrom?: string
    dateTo?: string
  },
  page: number,
  limit: number
): Promise<TransactionPage> {
  // Build where clause
  const where: Record<string, unknown> = { userId }
  if (filters.type) { where.type = filters.type }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom)
    if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.dateTo)
  }

  const skip = (page - 1) * limit

  // All prisma calls and balance computation here
  const total = await prisma.pointTransaction.count({ where: { userId } })
  const transactions = await prisma.pointTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: { /* relations */ },
  })

  // Running balance computation (business logic)
  // ...

  return { transactions: transactionsWithBalance, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}
```

```typescript
// REWRITTEN: pocket-money.controller.ts (~30 lines per handler)
import { getTransactionHistoryPaged } from '../services/pocket-money.service.js'

export const getTransactionHistory = async (req: Request, res: Response) => {
  const userId = Number(req.params.userId)
  if (isNaN(userId)) throw new AppError('Invalid userId', 400, 'VALIDATION_ERROR')

  // Authorization (stays in controller — it's an HTTP concern)
  const currentUserId = req.user!.id
  const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } })
  if (currentUserId !== userId && currentUser?.role !== 'PARENT') {
    throw new AppError('Unauthorized', 403, 'FORBIDDEN')
  }

  // Delegate to service
  const result = await getTransactionHistoryPaged(
    userId,
    { type: req.query.type as string, dateFrom: req.query.dateFrom as string, dateTo: req.query.dateTo as string },
    Math.max(1, parseInt(req.query.page as string || '1')),
    Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20')))
  )

  res.json({ success: true, data: result })
}
```

### Migration Strategy

1. **Create `pocket-money.service.ts`** — extract helper functions first (`createTransaction`, `calculatePointBalance`, `getOrCreateConfig`, `getPayoutPeriodStart`).
2. **Extract one handler at a time** — start with the simplest (e.g., `getConfig`).
3. **Write unit tests for each extracted service function** — now testable without HTTP mocking.
4. **Delete inline helpers from controller** — the controller should only import and call the service.
5. **File naming**: Use `pocket-money.service.ts` (dot.case) to match the dominant convention (13 of 17 service files use dot.case).

### What NOT to Do

- **Do NOT put authorization logic in the service** — it's an HTTP concern. Services should be callable from any context (controllers, cron jobs, tests) without assuming an HTTP request.
- **Do NOT create a service class** — the project uses exported functions, not classes. Consistency matters more than OOP dogma.
- **Do NOT extract a thin wrapper that just calls prisma** — the service should contain the business logic. A service that's `return prisma.x.findMany(args)` is just an unnecessary indirection.

### Sources

- Codebase analysis: `backend/src/services/overdue-penalty.service.ts`, `backend/src/services/notifications.service.ts` — established service patterns (HIGH confidence)
- Codebase analysis: `backend/src/controllers/pocket-money.controller.ts` (817 lines, 27 prisma calls) — current anti-pattern (HIGH confidence)
- CONCERNS.md: TECH-03 — documented fat controller issue (HIGH confidence)

---

## 4. Eliminate `as any` TypeScript Casts

### Current Casts

| File | Line(s) | Usage | Impact |
|------|---------|-------|--------|
| `frontend/src/api/client.ts` | 94, 95, 112, 118, 125 | `(error.response?.data as any)` and `(originalRequest as any)._csrfRetryCount` | Type safety lost for CSRF retry logic |
| `backend/src/middleware/errorHandler.ts` | 55 | `const prismaError = err as any` to check Prisma error codes | Unsafe Prisma error handling |
| `backend/src/config/database.ts` | 29 | `(params.args as any)[key]` in `$use` middleware | Eliminated by `$extends` migration (Section 1) |

### Fixes

#### client.ts — CSRF Retry Logic

**Problem:** Axios response data and config are typed generically, but CSRF retry logic accesses `.error.code`, `.error.message`, and `._csrfRetryCount` without proper types.

**Fix:** Extend Axios types with a custom config interface and typed response data.

```typescript
// Add to client.ts before the ApiClient class

interface CsrfErrorData {
  error?: {
    code?: string
    message?: string
  }
}

interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  _csrfRetryCount?: number
}
```

Then replace the casts:

```typescript
// BEFORE (line 94-95):
const errorCode = (error.response?.data as any)?.error?.code
const errorMessage = (error.response?.data as any)?.error?.message

// AFTER:
const errorData = error.response?.data as CsrfErrorData | undefined
const errorCode = errorData?.error?.code
const errorMessage = errorData?.error?.message
```

```typescript
// BEFORE (lines 112, 118, 125):
const errorData = error.response.data as any
const retryCount = (originalRequest as any)._csrfRetryCount || 0
(originalRequest as any)._csrfRetryCount = retryCount + 1

// AFTER:
const errorData = error.response.data as CsrfErrorData
const retryCount = (originalRequest as CsrfRetryConfig)._csrfRetryCount || 0
(originalRequest as CsrfRetryConfig)._csrfRetryCount = retryCount + 1
```

This is type-safe because we define what shape we expect, and the `as` cast is to a specific interface, not `any`. Runtime validation is handled by the `?.` optional chaining.

#### errorHandler.ts — Prisma Error Codes

**Problem:** `err.name === 'PrismaClientKnownRequestError'` checks the name, but then `const prismaError = err as any` is needed to access `.code`.

**Fix:** Import the Prisma error type and use a proper type guard.

```typescript
import { Prisma } from '@prisma/client'

// BEFORE (line 54-55):
if (err.name === 'PrismaClientKnownRequestError') {
  const prismaError = err as any
  if (prismaError.code === 'P2002') { ... }

// AFTER:
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  if (err.code === 'P2002') { ... }
  if (err.code === 'P2025') { ... }
}
```

**Why `instanceof` instead of `err.name`:** The Prisma `PrismaClientKnownRequestError` class is properly exported from `@prisma/client`. Using `instanceof` gives full type narrowing — TypeScript knows `err.code` exists after the check. The old `err.name === 'PrismaClientKnownRequestError'` check is fragile (string comparison) and provides no type narrowing.

#### database.ts

**Eliminated entirely** by the `$extends` migration in Section 1. No replacement needed — the `$extends` API provides fully typed `args`.

### Verification

After elimination, add an ESLint rule to prevent future `as any` usage:

```json
// backend/.eslintrc.json and frontend/.eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

**Note:** Enable this rule with `"error"` AFTER all casts are eliminated. Enabling it before will cause build failures.

### What NOT to Do

- **Do NOT use `// @ts-ignore`** — it's worse than `as any` because it's silent.
- **Do NOT cast to `unknown` first then `SomeType`** — e.g., `(x as unknown) as MyType` is a red flag that means the type system is being circumvented, not solved.
- **Do NOT use `as Record<string, unknown>` as a general escape hatch** — it's just `any` in disguise for objects.

### Sources

- TypeScript documentation: Type guards and `instanceof` narrowing (HIGH confidence)
- Codebase analysis: `frontend/src/api/client.ts` lines 94, 95, 112, 118, 125 (HIGH confidence)
- Codebase analysis: `backend/src/middleware/errorHandler.ts` line 55 (HIGH confidence)
- Prisma documentation: `PrismaClientKnownRequestError` exported from `@prisma/client` (HIGH confidence)

---

## 5. Migrate from `prisma db push` to `prisma migrate deploy`

### Current State

- `backend/docker-entrypoint.sh` line 70: `npx prisma db push --skip-generate`
- Only 2 migration files exist: `init/` (90 lines) and `20260215_add_user_color/` (2 lines)
- `prisma db push` is designed for prototyping — it drops and recreates tables when column types change, **causing data loss**. Not suitable for production.

### Why This Matters

| Concern | `db push` | `migrate deploy` |
|---------|-----------|-----------------|
| Data safety | Can drop/recreate tables, causing data loss | Only applies versioned changes |
| Audit trail | None — no record of what changed | Each migration is a timestamped SQL file |
| Rollback | Manual, error-prone | Can revert to known migration |
| CI/CD | No way to preview schema changes | Can run `migrate dev` in CI to generate migration, then `migrate deploy` in production |

### Migration Steps

#### Step 1: Generate the Baseline Migration

Since the database schema is already in production (via `db push`), generate a baseline migration from the current state:

```bash
cd backend

# Create a baseline migration from the current schema
# This creates a migration that represents the current DB state
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260501_baseline/migration.sql

# Mark the baseline migration as applied on existing databases
npx prisma migrate resolve --applied 20260501_baseline
```

**For Docker entrypoint:** Instead of `prisma migrate resolve`, the entrypoint needs to handle fresh vs. existing databases differently.

#### Step 2: Update Docker Entrypoint

Replace line 70 in `backend/docker-entrypoint.sh`:

```bash
# BEFORE (line 70):
npx prisma db push --skip-generate

# AFTER:
echo "Applying database migrations..."
# Use migrate deploy for existing databases (safe, only applies pending migrations)
# For fresh databases, migrate deploy will apply all migrations in order
if npx prisma migrate deploy; then
  echo "Migrations applied successfully"
else
  echo "ERROR: Migration failed. Check database state." >&2
  exit 1
fi
```

**Context:** `prisma migrate deploy` applies pending migrations without generating new ones. It reads the `_prisma_migrations` table to determine which migrations have been applied. On a fresh database, this table doesn't exist, and Prisma applies all migrations in order.

#### Step 3: Prisma Migrations Directory Structure

After migration:
```
backend/prisma/
├── migrations/
│   ├── migration_lock.toml
│   ├── 20260501_baseline/
│   │   └── migration.sql         # Full baseline from current schema
│   └── (future migrations)/
│       └── migration.sql
├── schema.prisma
└── seed.ts
```

#### Step 4: Update CI/CD (if applicable)

Make sure the CI pipeline generates migrations during development, not at deploy time:

```yaml
# In CI workflow:
- name: Check for pending migrations
  run: npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code
```

### Handling Future Schema Changes

After migration, the development workflow changes:

```bash
# Edit prisma/schema.prisma
# Then:
npx prisma migrate dev --name add_new_field
# This generates: prisma/migrations/YYYYMMDDHHMMSS_add_new_field/migration.sql
# Commit the migration file alongside the schema change
```

The Docker entrypoint uses `migrate deploy` which applies these migrations at container start.

### What NOT to Do

- **Do NOT delete the existing `init/` and `20260215_add_user_color/` migrations** — they're historical record. The baseline migration is added alongside them.
- **Do NOT run `prisma migrate dev` in production** — it generates new migrations interactively and can cause conflicts.
- **Do NOT use `prisma db push` as a fallback** — if `migrate deploy` fails, fix the migration. Don't bypass with `db push`.
- **Do NOT skip the `migration_lock.toml` file** — it prevents concurrent migration runs.

### Sources

- Prisma documentation: `migrate deploy` vs `db push` (HIGH confidence via Context7)
- Codebase analysis: `backend/docker-entrypoint.sh` line 70 (HIGH confidence)
- Codebase analysis: `backend/prisma/migrations/` directory (HIGH confidence)

---

## Summary: Recommended Execution Order

The five remediation areas have dependencies. Execute in this order:

1. **Prisma `$use` → `$extends`** (database.ts rewrite)
   - No other change depends on this, but it's a prerequisite for the Prisma upgrade.
   - Must be done before any Prisma version bump.

2. **`as any` elimination in `errorHandler.ts`**
   - Independent. Can be done in parallel with #1.

3. **`as any` elimination in `client.ts`**
   - Independent. Can be done in parallel with #1 and #2.

4. **Package audit fixes** (npm audit fix in backend + frontend)
   - Should be done after #1 (so Prisma upgrade is controlled, not accidentally auto-upgraded).
   - Can be done in parallel with the controller extraction.

5. **Extract `PocketMoneyService` from fat controller**
   - Independent. Largest change (touches the most code), so give it dedicated attention.

6. **`prisma db push` → `prisma migrate deploy`**
   - Requires coordination with the Docker entrypoint.
   - Should be a dedicated phase with manual testing to ensure no data loss.

7. **Prisma version upgrade to 6.19.3**
   - LAST — only after `$extends` migration is tested and verified.
   - Run full test suite (unit + integration + E2E).

---

*Research completed: 2026-05-01 | Sources: Context7 (Prisma docs), npm registry, GitHub Advisory Database, codebase analysis*
