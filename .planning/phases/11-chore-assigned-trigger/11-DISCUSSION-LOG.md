# Phase 11: chore-assigned trigger - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 11-chore-assigned trigger
**Areas discussed:** Data enrichment strategy, Notification call location, Test approach

---

## Data enrichment strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Expand create() includes | Add `include: { template, assignedTo }` to create() Prisma call. Changes return type. | |
| Separate fetch after create | Keep create() bare. Call findUnique with includes after create. Two queries but clean separation. | ✓ |
| Move notification to controller | Skip notification in create(). Controller calls notifyChoreAssigned after create(). | |

**User's choice:** Separate fetch after create
**Notes:** Keeps create() minimal. Two queries negligible for SQLite at 4-user scale.

### Fetch timing

| Option | Description | Selected |
|--------|-------------|----------|
| After create, separate findUnique | Fetch after create commits. Notification fires after assignment is fully written. | ✓ |
| Inside $transaction | Fetch inside a transaction with create. Overkill for SQLite single-writer. | |

**User's choice:** After create, separate findUnique (Recommended)
**Notes:** No need for transaction — SQLite single-writer means the assignment is committed immediately after create.

---

## Notification call location

| Option | Description | Selected |
|--------|-------------|----------|
| Last lines of create(), before return | findUnique + notifyChoreAssigned as last lines before return. Callers get enriched object. | ✓ |
| New wrapper function | create() returns bare. New createAndNotify() does create + notify. More explicit but adds export. | |

**User's choice:** Last lines of create(), before return (Recommended)
**Notes:** Callers get the enriched assignment back; notification fires automatically. No controller changes needed.

---

## Test approach

| Option | Description | Selected |
|--------|-------------|----------|
| Mock notification.service | jest.mock notification.service, assert notifyChoreAssigned called with right shape. | |
| Mock global.fetch | jest.spyOn(global, 'fetch'), verify fetch called with correct URL/body/payload. Full stack. | ✓ |
| Test returns enriched object only | Only test that create() returns enriched object. Trust notification.service.test.ts covers the rest. | |

**User's choice:** Mock global.fetch in service test
**Notes:** Tests the full wiring end-to-end, not just the mock boundary.

### Test scope

| Option | Description | Selected |
|--------|-------------|----------|
| URL + topic + null-skip | Verify fetch called with correct URL, topic, and not called when null. Focused on wiring contract. | |
| Full notification payload | Verify body, priority, tags, click path. Duplicates notification.formatters.test.ts but confirms wiring. | ✓ |

**User's choice:** Full notification payload
**Notes:** End-to-end confirmation that formatter choices flow through correctly.

### Edge cases

| Option | Description | Selected |
|--------|-------------|----------|
| NTFY disabled + server unreachable | Test: (1) NTFY_BASE_URL unset → no fetch, assignment succeeds. (2) fetch throws → assignment succeeds, error logged. | ✓ |
| Happy path + null-topic only | Just happy path and null-topic path. Skip edge cases. | |

**User's choice:** NTFY disabled + server unreachable (Recommended)
**Notes:** Covers NOTIFY-05 (graceful degradation when unconfigured) and NOTIFY-06 (server unreachable doesn't block).

---

## the agent's Discretion

- **Import placement:** Named import `import { notifyChoreAssigned } from './notification.service'` at top of assignment.service.ts.
- **Log prefix:** `[ntfy]` consistent with Phase 9 convention.
- **Return type change:** create() return type widens from `ChoreAssignment` to include template and assignedTo. TypeScript structural typing means existing callers are unaffected.

## Deferred Ideas

None — discussion stayed within phase scope.
