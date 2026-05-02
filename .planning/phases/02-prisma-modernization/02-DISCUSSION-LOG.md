# Phase 2: Prisma Modernization — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 02-prisma-modernization
**Areas discussed:** Migration strategy, Dual Prisma client, Upgrade path, Existing data verification

---

## Migration strategy: query vs result extension

| Option | Description | Selected |
|--------|-------------|----------|
| query extension | Direct $use replacement, full coverage on reads and writes | ✓ |
| result extension | Reads only, would need separate write handling | |

**User's choice:** query extension
**Notes:** Full replacement covering all current $use operations (create, update, upsert, findMany, findUnique, findFirst). Keep manual array vs single-object arg handling. Single $extends({ query: ... }) call.

---

## Dual Prisma client fix

| Option | Description | Selected |
|--------|-------------|----------|
| Import from database.ts | server.ts imports prisma from database.ts singleton | ✓ |
| Encapsulate in database.ts | Add shutdown() export to database.ts | |

**User's choice:** Import from database.ts
**Notes:** Simplest change. The singleton powers both the app and graceful shutdown.

---

## Upgrade path

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential | Migrate to $extends on 5.22, verify, then bump to latest 6.x | ✓ |
| Single-shot | Upgrade both in one pass | |

**User's choice:** Sequential
**Notes:** Tests passing on 5.22 with $extends is the trigger to start 6.x upgrade. Target latest 6.x. Fix forward on any failures — do not revert to 5.22.

---

## Existing data verification

| Option | Description | Selected |
|--------|-------------|----------|
| Full CRUD round-trip tests | Test all operations on recurring chores with recurrenceRule | ✓ |
| Single integration test | One test, high confidence | |

**User's choice:** Full CRUD round-trip tests
**Notes:** Tests added to existing integration test suite (npm run test:integration), not standalone scripts.

---

## Agent's Discretion

- Exact Prisma 6.x minor version to target (latest at time of implementation)
- Exact test file name and location within the integration test directory
- Naming of the query extension handler functions
- Whether to use Prisma.getExtensionContext or direct model access

## Deferred Ideas

None — discussion stayed within phase scope.
