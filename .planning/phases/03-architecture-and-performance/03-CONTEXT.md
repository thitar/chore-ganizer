# Phase 3: Architecture & Performance — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract PocketMoney business logic from fat controller (817 lines, 27 prisma calls) into dedicated sub-services. Standardize service naming to `dot.case.ts`. Migrate from `prisma db push` to versioned `prisma migrate deploy`. Fix overdue penalty race conditions, N+1 notification queries, and sequential processing. Add documented warning for seed password.

Covers: TECH-03 (PocketMoney extraction), TECH-05 (service naming), TECH-07 (Prisma migrations), DEPS-02 (seed password warning), PERF-01 ($transaction), PERF-02 (Promise.allSettled), PERF-03 (N+1 fix).

</domain>

<decisions>
## Implementation Decisions

### PocketMoney Service Extraction
- **D-01:** Three-domain split — break `pocket-money.controller.ts` into `pocket-money-points.service.ts` (points + adjustments — both mutate point balances), `pocket-money-payouts.service.ts` (payout approval workflow), `pocket-money-balance.service.ts` (read-only balance queries).
- **D-02:** Controller handlers become ~30 lines each — parse request, call service, format response.
- **D-03:** Follow existing subdirectory pattern (like `recurring-chores/` has 5 files).

### Seed Password Hardening
- **D-04:** Add a prominent `WARNING: Default passwords in use — change immediately for production` log message to `docker-entrypoint.sh` startup output. No code changes to User model or seed logic. Seed only runs on empty DB with `@home.local` emails, so exposure is limited.

### Penalty Performance Fixes
- **D-05:** Use `Promise.allSettled()` across overdue chores (PERF-02). Per-chore error isolation — log failure with context (chore ID, user, error), continue processing remaining. Return summary of succeeded/failed counts.
- **D-06:** Batch-fetch parent notification settings once before the penalty loop (PERF-03 — N+1 fix). Eliminates sequential `await notifyParentOfOverdue` per parent per chore.
- **D-07:** Wrap `applyOverduePenalty` in `prisma.$transaction(async (tx) => { ... })` (PERF-01). Follow existing pattern from `chore-assignments.service.ts:331`.

### Prisma Migration Switch
- **D-08:** Generate baseline migration from current schema using `prisma migrate dev --name init`. Update `docker-entrypoint.sh` to use `prisma migrate deploy` instead of `prisma db push --skip-generate`. Test on both fresh and existing databases. Baseline migration captures current state — future schema changes produce versioned migration files.

### Service Naming Standardization
- **D-09:** Rename `emailService.ts` → `email.service.ts` (update all imports).
- **D-10:** Delete `notificationService.ts` — 214 lines, 0 production imports, confirmed dead code per ARCH-01. Cleanest approach over renaming.

### Agent's Discretion
- Exact file structure and naming of pocket-money sub-services within `services/` directory (flat or subdirectory)
- Whether to extract balance-related controller endpoints to a separate route file
- Migration file name for baseline (`init` vs `baseline` vs `initial_schema`)
- Order of operations for the parallel penalty loop
- Whether to also fix `prisma db push` in any dev helper scripts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PocketMoney Controller (TECH-03)
- `backend/src/controllers/pocket-money.controller.ts` — 817 lines, 27 prisma calls, target for extraction
- `.planning/codebase/CONCERNS.md` §23 — Fix approach for PocketMoney extraction
- `.planning/codebase/ARCHITECTURE.md` §247-259 — Controller→Service→Prisma pattern, anti-patterns
- `.planning/phases/01-remediate-codebase-concerns/01-CONTEXT.md` D-03 — Test sequencing: controller tests written AFTER extraction (PITFALLS #1)

### Overdue Penalty (PERF-01/02/03)
- `backend/src/services/overdue-penalty.service.ts` — Penalty processing, race condition (line 77), N+1 queries (lines 278-285)
- `backend/src/services/chore-assignments.service.ts:331` — Existing `$transaction` pattern to follow
- `.planning/codebase/CONCERNS.md` §170-186 — Performance bottlenecks (sequential processing, race condition, N+1)
- `.planning/codebase/CONCERNS.md` §303-307 — Overdue penalty edge cases untested

### Service Naming (TECH-05)
- `backend/src/services/emailService.ts` — To rename to `email.service.ts`
- `backend/src/services/notificationService.ts` — 214 lines, 0 production imports, to delete
- `.planning/codebase/CONCERNS.md` §37-48 — Naming convention analysis

### Prisma Migrations (TECH-07)
- `backend/docker-entrypoint.sh` line 70 — Current `prisma db push --skip-generate` call
- `backend/prisma/schema.prisma` — Complete schema for baseline migration
- `backend/prisma/migrations/` — Existing 2 migration files
- `.planning/codebase/CONCERNS.md` §57-60 — Migration strategy analysis

### Seed Password (DEPS-02)
- `backend/docker-entrypoint.sh` — Where seed runs on empty DB
- `backend/src/prisma/seed.ts` line 11 — Hardcoded `password123`
- `.planning/codebase/CONCERNS.md` §155-160 — Seed password risk analysis

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chore-assignments.service.ts:331` — Existing `$transaction` pattern for PERF-01
- `recurring-chores/` subdirectory — Precedent for service subdirectory pattern (5 files)
- `.planning/phases/01-remediate-codebase-concerns/01-CONTEXT.md` — Test sequencing guidance: write controller tests AFTER extraction

### Established Patterns
- Controller → Service → Prisma — thin controllers, fat services
- `dot.case.ts` naming — 13 of 17 services already follow this
- Subdirectory grouping — recurring-chores has its own subdirectory
- `$transaction(async (tx) => { ... })` — Used in chore-assignments for atomicity

### Integration Points
- `pocket-money.controller.ts` — Route handlers reference this, extraction requires route-level changes
- `docker-entrypoint.sh` — Prisma migration switch and seed password warning
- `overdue-penalty.service.ts` — Core penalty logic to wrap in transaction + parallelize
- Import statements across all files referencing `emailService` and `notificationService` — need updating

</code_context>

<specifics>
No specific requirements — open to standard approaches. Follow existing codebase patterns.
</specifics>

<deferred>
None — discussion stayed within phase scope.
</deferred>

---

*Phase: 03-architecture-and-performance*
*Context gathered: 2026-05-02*
