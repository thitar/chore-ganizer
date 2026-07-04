# Phase 12: chore-due-soon lazy trigger - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 12-chore-due-soon lazy trigger
**Areas discussed:** Sweep scope, Enrichment strategy, dueNotifiedAt update timing, Concurrent dedup update pattern

---

## Sweep Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both (Recommended) | Sweep both ChoreAssignment AND RecurringOccurrence items | ✓ |
| Regular only | Only sweep ChoreAssignment items — simpler but misses recurring occurrences | |
| Respect role (Recommended) | Respect getAll() role filter — PARENT sweeps all, CHILD sweeps own | ✓ |
| User's own only | Only fire for the currently authenticated user regardless of role | |
| PENDING only | Only PENDING status items trigger notifications | |
| Also PARTIALLY_COMPLETE | Include PARTIALLY_COMPLETE items too | ✓ |
| Today only (Recommended) | Only items due today trigger notifications | ✓ |
| Any date range | Sweep entire requested date range | |

**User's choice:** Both items, respect role filter, PENDING + PARTIALLY_COMPLETE statuses, today only

---

## Enrichment Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Expand includes (Recommended) | Add dueNotifiedAt + ntfyTopic to existing getAll() includes, sweep in-memory | ✓ |
| Separate query | Keep existing includes, run separate query for un-notified due-today items | |
| Separate function (Recommended) | Standalone sweep function called by getAll() — testable in isolation | ✓ |
| Inline in getAll() | Sweep loop inline in getAll() | |
| Include all (Recommended) | Add ntfyTopic + dueNotifiedAt to both queries' includes upfront | ✓ |
| Sweep-first | Do separate lightweight query first for un-notified IDs, then fetch details | |

**User's choice:** Expand includes, separate function, include all upfront

---

## dueNotifiedAt Update Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Write before notify | Update dueNotifiedAt first, then fire notification — best dedup but may miss notifications | |
| Write after notify (Recommended) | Fire notification first, then write dueNotifiedAt on success — retries on failure | ✓ |
| Write after (always) | Fire notification, then write dueNotifiedAt regardless of success/failure | |
| Per-item updateMany | forEach over un-notified items, updateMany with conditional WHERE | ✓ |
| Single bulk updateMany | Collect IDs, run single updateMany per model | |

**User's choice:** Write after notify (success-only), per-item updateMany

---

## Concurrent Dedup Update Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| updateMany only (Recommended) | Single-statement updateMany with { where: { dueNotifiedAt: null } } — atomic in SQLite | ✓ |
| Wrap in $transaction | Wrap update in prisma.$transaction — belt-and-suspenders | |

**User's choice:** updateMany only (no $transaction wrapper needed)

---

## the agent's Discretion

- Sweep function name, import location, and return value shape
- Log prefix (`[ntfy]` consistent with Phases 9-11)
- "Today" definition (server's local timezone, ISO date comparison)
- Whether to extend `AssignmentWithIncludes` type or create new type

## Deferred Ideas

None — discussion stayed within phase scope.
