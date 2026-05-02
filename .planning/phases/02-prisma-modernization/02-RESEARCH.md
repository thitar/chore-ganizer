# Phase 2: Prisma Modernization — Research

**Date:** 2026-05-02
**Researched by:** gsd-planner (inline — subagents unavailable)

## Domain Summary

Migrate `database.ts` from deprecated `prisma.$use()` middleware to typed `$extends` query extension for `recurrenceRule` JSON serialization, fix the dual Prisma client anti-pattern in `server.ts`, add CRUD round-trip integration tests, then upgrade Prisma from 5.22 to latest 6.x.

---

## Architecture

### Current State (Prisma 5.22)

```
database.ts                          server.ts
┌─────────────────────┐              ┌──────────────────┐
│ prisma = new Prisma │              │ prisma = new      │
│   Client()          │              │   PrismaClient()  │
│                     │              │                    │
│ prisma.$use((...))  │  ◀─── all    │ (no $use — only   │
│   → serialize JSON  │  services    │  used for         │
│   → deserialize     │  import this │  $disconnect())   │
│     JSON             │              │                    │
└─────────────────────┘              └──────────────────┘
       ↑                                       ↑
   Two SEPARATE Prisma instances (anti-pattern)
```

**Problem:** `server.ts` creates its own `PrismaClient` without the `$use` middleware. Only used for `$disconnect()` during shutdown, but this is fragile.

### Target State (Prisma 6.x)

```
database.ts                          server.ts
┌──────────────────────────┐        ┌──────────────────┐
│ const prisma = new        │        │ import { prisma } │
│   PrismaClient().$extends({│◀──────│   from            │
│   query: {                │        │   './config/      │
│     recurringChore: {     │        │   database.js'    │
│       create({args,query})│        │                    │
│         → serialize JSON  │        │ (uses singleton   │
│       findMany({args,q})  │        │  for $disconnect) │
│         → deserialize JSON│        │                    │
│     }                     │        │                    │
│   }})                     │        │                    │
└──────────────────────────┘        └──────────────────┘
       ↑
   SINGLE instance, fully typed
```

---

## Prisma `$extends` Query Extension (5.22+ compatible)

### API

```typescript
const xprisma = new PrismaClient().$extends({
  query: {
    recurringChore: {
      async create({ args, query }) {
        // mutate args before query
        if (args.data?.recurrenceRule && typeof args.data.recurrenceRule === 'object') {
          args.data.recurrenceRule = JSON.stringify(args.data.recurrenceRule);
        }
        return query(args);
      },
      async findMany({ args, query }) {
        const result = await query(args);
        // mutate result after query
        if (Array.isArray(result)) {
          return result.map(item => {
            if (item?.recurrenceRule && typeof item.recurrenceRule === 'string') {
              item.recurrenceRule = JSON.parse(item.recurrenceRule);
            }
            return item;
          });
        }
        return result;
      },
      // ... similar for update, upsert, findUnique, findFirst
    },
  },
});
```

### Key Properties

| Property | Injected into callback | Description |
|----------|----------------------|-------------|
| `model` | String | Model name (e.g., `"RecurringChore"`) |
| `operation` | String | Operation name (e.g., `"create"`) |
| `args` | Typed args | The query arguments — safe to mutate |
| `query` | Function | Call `query(args)` to execute the query |

### Important Rules

1. DO NOT mutate `include` or `select` — changes the return type and breaks TS
2. `query` returns a promise — use `await` before mutating
3. `args` is typed — no more `as any` casts needed
4. Works identically on Prisma 5.22+ — compatible with the sequential migration strategy (D-05)

### Operations to Cover (same as current `$use`)

**Serialize (write):** `create`, `update`, `upsert`, `createMany`, `updateMany`
**Deserialize (read):** `findMany`, `findUnique`, `findFirst`, `findFirstOrThrow`, `findUniqueOrThrow`

**Upsert special handling:** For upsert, serialize on BOTH `create` and `update` sub-objects.

---

## Prisma 6.x Breaking Changes (relevant to this project)

### ✅ Safe — No Impact

| Change | Impact on this project |
|--------|----------------------|
| Node.js ≥18.18 | Project already uses Node.js 18+/20+ in CI, `node:25-slim` in production |
| TypeScript ≥5.1 | Project uses TS 5.3+ |
| Buffer → Uint8Array | Only affects `Bytes` fields — not used in any model |
| PostgreSQL implicit m-n | NOT applicable — uses SQLite |
| Full-text search | NOT applicable — no full-text search |

### ⚠️ Check — May Need Fixes

1. **`NotFoundError` removed**: Search codebase for `NotFoundError` imports from `@prisma/client`. If found in `findUniqueOrThrow` / `findFirstOrThrow` catch blocks, replace with `PrismaClientKnownRequestError` code `P2025`.

2. **`async`, `await`, `using` as model names**: Check if any model uses these as model names (unlikely in this schema).

### Upgrade Steps
```
npm install @prisma/client@6
npm install -D prisma@6
npx prisma generate
npm run test:unit
npm run test:integration
```

---

## Dual Prisma Client Fix

**Current state:** `server.ts` creates its own `PrismaClient` at line 13.

**Fix:**
1. Remove `PrismaClient` import from `server.ts` (line 5)
2. Import `prisma` from `./config/database.js` (line 4: `import { prisma } from './config/database.js'`)
3. Remove `export const prisma = new PrismaClient({...})` block (lines 12-19)
4. Keep all `prisma.$disconnect()` calls as-is — they now use the singleton

After this fix, `server.ts` uses the same singleton as all services, including the `$extends` extension.

---

## Integration Test Template (data verification)

Based on existing pattern in `backend/src/__tests__/integration/api-helpers.ts`:

```
backend/src/__tests__/integration/prisma-middleware.integration.test.ts

Tests:
1. CREATE: Create RecurringChore with recurrenceRule as object → verify stored as JSON string
2. READ (findUnique): Read back → recurrenceRule is parsed back to object
3. READ (findMany): Read all → recurrenceRule is parsed back to object
4. UPDATE: Update recurrenceRule → stored as JSON, read back as object  
5. UPSERT: Create via upsert → stored as JSON, read back as object
6. Data integrity: Verify JSON.stringify double-serialization doesn't occur
```

---

## Validation Architecture

### Test Gates

| Gate | Command | When |
|------|---------|------|
| $use → $extends migration works | `npm run test:unit` (241 tests) | After Plan 01 Task 1 |
| Dual client fix works | `npm run test:unit` | After Plan 01 Task 2 |
| Integration round-trips pass | `npm run test:integration` | After Plan 01 Task 3 |
| Prisma 6.x upgrade clean | `npm run test:unit && npm run test:integration` | After Plan 02 |

### Rollback Plan

If 6.x upgrade breaks:
- `git checkout -- backend/package.json backend/package-lock.json`
- `npm install` to restore 5.22
- Document breaking changes and retry with fix-forward approach (D-06)

### Key Risks

1. **`NotFoundError` removal in 6.x**: If any catch blocks use `NotFoundError`, they will silently fail at runtime. Mitigation: grep for `NotFoundError` before and after upgrade.
2. **Upsert edge cases**: The `$extends` handler must serialize on both `create` and `update` sub-arguments of upsert. Mitigation: Include upsert in integration test.
3. **Double-serialization**: If `recurrenceRule` comes back from the DB already serialized (string), the deserialize handler must not call `JSON.parse` on an object. Mitigation: type check before parse.

---

_Research complete: 2026-05-02_
