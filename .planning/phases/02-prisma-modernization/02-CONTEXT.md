# Phase 2: Prisma Modernization — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate Prisma middleware from deprecated `$use` to typed `$extends` query extension for `recurrenceRule` JSON serialization, then upgrade Prisma from 5.22 to 6.x. This phase covers TECH-02 (middleware migration) + DEPS-03 (Prisma upgrade) + resolves the deferred D-03 `as any` cast in `database.ts`.

No new features. No schema changes. Only middleware migration, client consolidation, and version upgrade.

</domain>

<decisions>
## Implementation Decisions

### Migration strategy: query extension
- **D-01:** Use `$extends` query extension as the direct `$use` replacement, intercepting all operations: create, update, upsert for serialization (write) and findMany, findUnique, findFirst for deserialization (read).
- **D-02:** Keep manual array vs. single-object argument handling — same explicit pattern as the current `$use` middleware (check `params.args` for array vs. object before transforming `recurrenceRule`).
- **D-03:** Single `$extends({ query: { ... } })` call — one extension covering both serialize and deserialize handlers in a single extension call.

### Dual Prisma client fix
- **D-04:** `server.ts` imports `prisma` from `database.ts` directly. The singleton from `database.ts` powers both the application and graceful shutdown. Remove the standalone Prisma client creation in `server.ts`.

### Upgrade path
- **D-05:** Sequential approach — migrate to `$extends` on Prisma 5.22 first, verify all tests pass (241 unit + 147 integration), then bump both `prisma` and `@prisma/client` to latest 6.x (`^6.x.x`), regenerate client, retest.
- **D-06:** Fix forward on any 6.x test failures — pin at latest 6.x, fix compatibility issues, document breaking changes. Do not revert to 5.22.

### Existing data verification
- **D-07:** Full CRUD round-trip integration tests for recurring chores with `recurrenceRule` — create, read, update, delete — verifying data survives the middleware switch.
- **D-08:** Data verification tests live in the existing integration test suite (`npm run test:integration`), not as standalone scripts.

### the agent's Discretion
- Exact Prisma 6.x minor version to target (latest at time of implementation)
- Exact test file name and location within the integration test directory
- Naming of the query extension handler functions
- Whether to use `Prisma.getExtensionContext` or direct model access in the extension

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prisma middleware migration
- `backend/src/config/database.ts` — Current `$use` middleware to replace (lines 15-47). The `as any` cast at line 29 resolves automatically with `$extends`.
- `backend/src/server.ts` — Creates a separate Prisma client for shutdown (to be consolidated)

### Codebase audit & architecture
- `.planning/codebase/CONCERNS.md` — TECH-02 ($use → $extends), DEPS-03 (Prisma 6.x upgrade), dual Prisma client anti-pattern
- `.planning/codebase/ARCHITECTURE.md` — Prisma RecurrenceRule Middleware (line 212), Dual Prisma Client anti-pattern (line 248)

### Phase 1 carry-over
- `.planning/phases/01-remediate-codebase-concerns/01-CONTEXT.md` — D-03: database.ts `as any` cast deferred to Phase 2

### Dependencies
- `backend/package.json` — Prisma 5.22 → 6.x upgrade target
- `backend/prisma/schema.prisma` — RecurringChore model with `recurrenceRule` field

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Current `$use` middleware in `database.ts` (lines 15-47) — reference implementation for serialization logic, can be adapted to `$extends` format
- `chore-assignments.service.ts` line 331 — existing `prisma.$transaction` pattern in the codebase
- Integration test suite at `backend/src/__tests__/integration/` — existing framework for data verification tests

### Established Patterns
- Prisma singleton in `database.ts` with `globalThis` guard for dev hot-reload
- Service files import `prisma` from `database.ts` — consistent pattern to maintain

### Integration Points
- `database.ts` — Primary Prisma config file where `$use` middleware lives and `$extends` will replace it
- `server.ts` — Currently creates its own Prisma client; will import from `database.ts` after consolidation
- All services that query `RecurringChore` model — benefit from typed `$extends` without changes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-prisma-modernization*
*Context gathered: 2026-05-02*
