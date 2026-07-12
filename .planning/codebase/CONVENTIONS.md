---
title: Coding Conventions
last_mapped_commit: HEAD
date: 2026-07-12
---

# Coding Conventions

## Code Style

| Property | Convention |
|----------|------------|
| Indentation | 2 spaces (no tabs) |
| Quotes | Single quotes exclusively |
| Semicolons | Yes (end of statements) |
| Trailing commas | Yes (multi-line structures) |
| Strict mode | `strict: true` in all tsconfigs |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Backend routes | `{domain}.routes.ts` | `assignments.routes.ts` |
| Backend services | `{domain}.service.ts` | `assignment.service.ts` |
| Backend schemas | `{domain}.schema.ts` | `assignment.schema.ts` |
| Backend middleware | `camelCase.ts` | `errorHandler.ts`, `rateLimiter.ts` |
| Frontend pages | `{Name}Page.tsx` | `DashboardPage.tsx` |
| Frontend components | `{Name}.tsx` | `TopNav.tsx`, `Button.tsx` |
| Frontend hooks | `use{Name}.tsx` | `useAssignments.tsx` |
| Frontend API | `{domain}.api.ts` | `assignments.api.ts` |
| Frontend utils | `camelCase.ts` | `dateFormat.ts` |
| Functions | `camelCase` named exports | `export async function create()` |
| Variables | `camelCase` | `const userId = ...` |
| Constants | `UPPER_SNAKE_CASE` | `CSRF_COOKIE`, `MAX_STREAK_WEEKS` |
| Types/interfaces | `PascalCase` | `AppError`, `User`, `Assignment` |
| Enum values | `UPPER_SNAKE_CASE` strings | `'PENDING'`, `'COMPLETED'`, `'EARNED'` |

## Import Patterns

- **All relative imports** — no path aliases, no barrel exports
- **`import * as`** used heavily for service/API module imports:
  - Backend routes: `import * as assignmentService from '../services/assignment.service'`
  - Frontend hooks: `import * as assignmentsApi from '../api/assignments.api'`
- **`import type`** used sparingly (e.g., `import type { User } from '../api/auth.api'`)
- **No enforced import order** — generally: node built-ins → third-party → internal

## Error Handling Patterns

**Backend — `AppError` class:**
```ts
// backend/src/middleware/errorHandler.ts
class AppError extends Error {
  statusCode: number
  code?: string
  constructor(message: string, statusCode: number = 500, code?: string)
}
```

**Service throw pattern:**
```ts
throw new AppError('Template not found', 404)
throw new AppError('Invalid credentials', 401)
throw new AppError('Assignment is already completed', 409)
```

**Prisma not-found catch pattern:**
```ts
catch (err: unknown) {
  if (isRecordNotFoundError(err)) {
    throw new AppError('Assignment not found', 404)
  }
  throw err
}
```

**Route handler pattern:**
```ts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await service.doSomething()
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})
```

**Frontend — `AuthError` class:**
```ts
// frontend/src/api/auth.api.ts
class AuthError extends Error {
  statusCode: number
}
```

## API Response Envelope

All responses use a consistent JSON envelope:
```json
{
  "success": true | false,
  "data": <payload> | null,
  "error": { "message": "...", "code": "...", "details": [...] } | null
}
```

Success creates use `res.status(201)`. Validation errors include `code: 'VALIDATION_ERROR'` and `details` array.

## Middleware Composition Order

```ts
// backend/src/app.ts
helmet()                          // Security headers
cors()                            // CORS
generalLimiter                    // Rate limiting on /api
express.json() + urlencoded()     // Body parsing (10kb limit)
cookieParser()                    // Cookie parsing
session()                         // Session management
csrfProtection                    // CSRF on /api (safe methods exempt)
routes                            // API routes on /api
notFoundHandler                   // 404 catch-all
errorHandler                      // Global error handler
```

**Per-route middleware:**
```ts
router.post('/', authenticate, authorize('PARENT'), validate(schema), async (req, res, next) => { ... })
```

## Configuration Patterns

- **Env vars** loaded via `dotenv/config` at top of config files
- **Config files**: `config/prisma.ts` (singleton PrismaClient), `config/notifications.ts` (ntfy config)
- **No runtime config** — everything is env vars or hardcoded constants

## Type Patterns

- **`interface`** for object shapes (API responses, component props, service data)
- **`type`** for union/string literal types (`PointLogType = 'EARNED' | 'BONUS' | ...`)
- **Types co-located** in `api/*.ts` files, imported where needed
- **Component props** defined inline in component files
- **Hook return types** inferred from React Query

## Comment Style

- **Inline comments** predominantly — explain "why" not "what"
- **No formal JSDoc** convention — functions not documented with `@param`/`@returns`
- **Security rationale** documented inline (e.g., CSRF literal cookie name for CodeQL)

## Git Conventions

**Commit messages:** Conventional Commits style:
```
<type>(<scope>): <description>
```
Types: `feat`, `fix`, `chore`, `docs`, `test`, `verify`, `transition`
Scopes: Module/phase numbers, feature areas, or none

**Examples:**
- `feat(m2): The Game — streaks, levels, badges (#146)`
- `fix(12): WA-01 use AbortController for Node 18 compatibility`
- `chore: repository cleanup — remove dead scaffolds (#148)`
- `test: refresh e2e suite for M1/M2 (#151)`

**Branch naming:** `gsd/phase-N-description` (e.g., `gsd/phase-12-chore-due-soon-lazy-trigger`)

## Frontend-Specific Patterns

- **Named function exports** — `export function ComponentName()` (no default exports)
- **Functional components only** — no class components
- **Tailwind CSS** for all styling — no CSS modules, no styled-components
- **Dark theme** — zinc-based palette (`text-zinc-100`, `bg-zinc-900`)
- **`lucide-react`** for icons
- **Mutations use `mutateAsync`** (Promise-based) not `mutate` (callback-based)
- **Cache invalidation** via `queryClient.invalidateQueries({ queryKey: [...] })`

## Backend-Specific Patterns

- **Named async function exports** — not classes
- **`delete_()` suffix** to avoid the `delete` keyword
- **`prisma.$transaction`** for multi-step writes
- **`select` clauses** to limit returned fields
- **`include`** for nested relations
- **Error code `P2025`** caught and translated to 404

## Frontend-Backend Parameter Mapping

| Frontend | Backend | File |
|----------|---------|------|
| `userId` | `assignedToId` | `frontend/src/api/assignments.api.ts` |
| `templateId` | `choreTemplateId` | `frontend/src/api/assignments.api.ts` |

Mapping happens in `frontend/src/api/` files, never in components or hooks.
