# Phase 11: chore-assigned trigger - Research

**Researched:** 2026-07-02
**Domain:** Notification wiring (ntfy.sh push on assignment creation)
**Confidence:** HIGH

## Summary

Phase 11 is a wiring phase — all notification infrastructure exists from Phase 9 (`sendNtfy`, `notifyChoreAssigned` wrapper, `assignedBody` formatter, `isNtfyConfigured` guard). The task is to call `notifyChoreAssigned()` from `assignment.service.create()` after a new assignment is created.

The key design decision (D-01/D-02) is to do a **separate `findUnique` with includes** after `prisma.choreAssignment.create`, rather than expanding the create's includes. This keeps the create function minimal and the enriched object matches `AssignmentWithIncludes` exactly. The notification fires as fire-and-forget (`void notifyChoreAssigned(enriched)`) in the last lines of `create()` before the return statement.

**Primary recommendation:** Add 3 lines to `assignment.service.create()`: one `findUnique` with includes, one `void notifyChoreAssigned()` call, change the return from `prisma.choreAssignment.create(...)` to the enriched result. Add 4 test cases to `assignment.service.test.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chore assignment creation | API/Backend | — | `assignment.service.create()` owns the write |
| Push notification delivery | API/Backend | — | `sendNtfy()` is a service-layer fire-and-forget call |
| Topic resolution | API/Backend | — | `notifyChoreAssigned()` reads `assignedTo.ntfyTopic` from enriched object |
| Graceful degradation | API/Backend | — | `sendNtfy()` catches errors internally, never surfaces to caller |

## Standard Stack

### Core

No new packages needed. This phase uses only existing infrastructure.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none) | — | — | — |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prisma` | existing | `findUnique` with includes | After `create()` to fetch enriched assignment |
| `notification.service` | existing | `notifyChoreAssigned` wrapper | Call from `create()` to fire push |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `findUnique` after create | Expand create's `include` clause | Creates are harder to reason about; separate fetch is cleaner and negligible for SQLite at 4-user scale [CITED: 11-CONTEXT.md D-01] |

**Installation:** None — zero new npm dependencies.

## Package Legitimacy Audit

> No external packages installed in this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Controller (POST /api/assignments)
  │
  ▼
assignment.service.create()
  │
  ├── 1. prisma.choreTemplate.findUnique (validate template exists)
  ├── 2. prisma.choreAssignment.create (write assignment)
  ├── 3. prisma.choreAssignment.findUnique (with includes: template.title, template.points, assignedTo.ntfyTopic)
  ├── 4. void notifyChoreAssigned(enrichedAssignment) ─── fire-and-forget ──► sendNtfy() ──► fetch(NTFY_BASE_URL/topic)
  └── 5. return enrichedAssignment
                                    │
                                    ▼
                            Controller wraps in { success, data, error }
```

### Pattern 1: Fire-and-Forget Notification
**What:** Call notification wrapper with `void` prefix — never await, never catch at call site
**When to use:** Every notification trigger point (Phase 11, 12, 13)
**Example:**
```typescript
// Source: backend/src/services/notification.service.ts:48
void sendNtfy(topic, title, body, { priority, tags, click })
```

**Key detail:** `sendNtfy` catches all errors internally with `try/catch` and logs warnings — the `void` prefix means the caller never deals with the promise. This is the established pattern from Phase 9 and must be followed exactly.

### Pattern 2: Separate Enrichment Query
**What:** After `create()`, do a second `findUnique` with `include` to get nested relations needed downstream
**When to use:** When the create result lacks relations needed by a downstream call (notification, response enrichment)
**Example:**
```typescript
// Planned for backend/src/services/assignment.service.ts
const created = await prisma.choreAssignment.create({ data: { ... } })
const enriched = await prisma.choreAssignment.findUnique({
  where: { id: created.id },
  include: {
    template: { select: { id: true, title: true, points: true, category: true } },
    assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
  },
})
void notifyChoreAssigned(enriched!)
return enriched
```

**Includes needed for notification:** `{ id, template: { title, points }, assignedTo: { ntfyTopic }, dueDate }`
**Includes needed for controller response:** `{ id, template: { id, title, points, category }, assignedTo: { id, name, color } }` (existing pattern from `getAll`)

**Recommendation:** Use the richer includes set (matching `getAll`'s pattern) plus `ntfyTopic`. The controller already receives the object — widening the includes is backward-compatible via TypeScript structural typing.

### Anti-Patterns to Avoid
- **Awaiting `void notifyChoreAssigned()`:** Breaks the fire-and-forget pattern; notification failure would block the assignment response
- **Wrapping notification in try/catch at call site:** Redundant — `sendNtfy` already catches internally
- **Expanding `create` with `include`:** Prisma `create` supports `include` but it mixes concerns — the create call becomes harder to reason about

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP POST to ntfy | Custom fetch wrapper | `sendNtfy()` from notification.service | Already handles timeout (3000ms), error catching, topic encoding |
| Error swallowing | try/catch at call site | `void` prefix + `sendNtfy` internal catch | Established fire-and-forget pattern (Phase 9) |
| Type checking for enriched assignment | Manual type assertions | `AssignmentWithIncludes` type in notification.service | Type is already defined and validated by tests |

## Common Pitfalls

### Pitfall 1: Forgetting to update the test mock for `choreAssignment.findUnique`
**What goes wrong:** The existing `assignment.service.test.ts` mocks `choreAssignment.findUnique` for other methods (`complete`, `uncomplete`, `delete_`), but the `create` describe block does NOT mock it. After adding the post-create `findUnique` call, the `create` tests will fail with "Cannot read property of undefined" because `findUnique` returns `undefined` by default.
**Why it happens:** The current `create` test (line 42-55) only mocks `choreTemplate.findUnique` and `choreAssignment.create`. The new code adds `choreAssignment.findUnique` — the mock must be added.
**How to avoid:** Add `prisma.choreAssignment.findUnique.mockResolvedValue(enrichedAssignment)` in the `create` describe block's `beforeEach` or inline in the test.
**Warning signs:** Test throws "Cannot read property of 'title' of undefined" or similar null-reference errors.

### Pitfall 2: Return type change breaks test assertion `expect(result).toBe(created)`
**What goes wrong:** The existing test asserts `expect(result).toBe(created)` — strict reference equality. After the change, `create()` returns the `findUnique` result (enriched), not the `create` result (bare). The test will fail because `result` is a different object than `created`.
**Why it happens:** The test was written for the old code path that returned `prisma.choreAssignment.create(...)` directly.
**How to avoid:** Update the test assertion to check against the enriched object (the `findUnique` mock result). Use `toMatchObject` or update the mock to return the enriched shape.
**Warning signs:** Test assertion fails with "expected object to be [the enriched one] but received [the bare one]".

### Pitfall 3: Missing `ntfyTopic` in the includes
**What goes wrong:** The `findUnique` includes must include `assignedTo: { select: { ..., ntfyTopic: true } }`. Without `ntfyTopic`, `notifyChoreAssigned` receives `undefined` for the topic and silently no-ops (the `if (!topic) return` guard catches it) — notification never fires, hard to debug.
**Why it happens:** The existing `getAll` includes do NOT include `ntfyTopic` on `assignedTo` (it uses `{ id, name, color }`). Copy-pasting that pattern without adding `ntfyTopic` causes silent failure.
**How to avoid:** Explicitly add `ntfyTopic: true` to the `assignedTo` select. Verify in test that the fetch mock IS called (positive test, not just null-topic test).
**Warning signs:** Notification tests pass but the integration flow never sends pushes.

### Pitfall 4: `findUnique` returning null after `create`
**What goes wrong:** The `findUnique` call after `create` could theoretically return null if a race condition deletes the record between create and find. The `notifyChoreAssigned(enriched!)` with the `!` assertion would then throw.
**Why it happens:** Unlikely at this scale (4 users, single-family), but technically possible.
**How to avoid:** Guard with `if (enriched) void notifyChoreAssigned(enriched)` — defensive coding, no cost.
**Warning signs:** Theoretical; would manifest as an unhandled rejection in logs.

## Code Examples

### Enriched assignment shape (from notification.service.ts)

```typescript
// Source: backend/src/services/notification.service.ts:37-42
type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
}
```

### assignedBody formatter output (from notification.formatters.ts)

```typescript
// Source: backend/src/services/notification.formatters.ts:11-18
export function assignedBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — due ${a.dueDate.toISOString().slice(0, 10)}`,
    priority: 3 as const,
    tags: ['clipboard', 'bell'],
    click: `/chores/${a.id}`,
  }
}
```

### jest.spyOn(global, 'fetch') test pattern (from notification.service.test.ts)

```typescript
// Source: backend/src/__tests__/services/notification.service.test.ts:17-18
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
})
```

### Assignment service test structure (from assignment.service.test.ts)

```typescript
// Source: backend/src/__tests__/services/assignment.service.test.ts:28-38
const { prisma } = require('../../config/prisma')
const { AppError } = require('../../middleware/errorHandler')

let assignmentService: typeof import('../../services/assignment.service')

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/assignment.service')]
  prisma.recurringChore.findMany.mockResolvedValue([])
  prisma.recurringOccurrence.findMany.mockResolvedValue([])
  assignmentService = require('../../services/assignment.service')
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `create()` returns bare `ChoreAssignment` | `create()` returns enriched assignment with `template` + `assignedTo` | Phase 11 (this phase) | Controller receives more data; backward-compatible via structural typing |

**Deprecated/outdated:**
- None — this is additive behavior on an existing function.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `assignment.service.create()` is the only call site for creating regular chore assignments | Architecture | Low — `getAll` handles reads; `complete` handles status changes. Only `create` writes new assignments. Verified via grep: `assignmentService.create` appears only in `assignments.routes.ts:44`. |
| A2 | The controller (`assignments.routes.ts:44`) wraps the result in `{ success, data, error }` envelope and does not inspect individual fields | Code Examples | Low — verified: controller does `res.status(201).json({ success: true, data: assignment, error: null })`. Widening the returned object's shape is safe. |
| A3 | The `ntfyTopic` field is not currently included in any `findUnique` select on `ChoreAssignment.assignedTo` | Pitfall 3 | Low — verified: the only `findUnique` calls with `assignedTo` includes are in `complete()` and `uncomplete()`, neither includes `ntfyTopic`. |

**If this table is empty:** Not applicable — 3 assumptions documented, all LOW risk.

## Open Questions

1. **Should the `findUnique` result be guarded with `if (enriched)` before calling `notifyChoreAssigned`?**
   - What we know: `findUnique` could theoretically return null if the record is deleted between create and find (race condition). The `!` assertion would throw.
   - What's unclear: Whether defensive coding is worth the extra line for a 4-user single-family app.
   - Recommendation: Use `if (enriched) void notifyChoreAssigned(enriched)` — one extra line, zero downside, prevents a theoretical unhandled rejection.

2. **Should the `findUnique` include `ntfyTopic` in the `assignedTo` select?**
   - What we know: `notifyChoreAssigned` needs `assignedTo.ntfyTopic`. Without it, the notification silently no-ops.
   - What's unclear: Whether to add `ntfyTopic` to the `assignedTo` select or to use a broader include.
   - Recommendation: Add `ntfyTopic: true` to the `assignedTo` select alongside `id, name, color`. This is the minimal change that satisfies the notification requirement.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (existing) |
| Config file | `backend/jest.config.js` (existing) |
| Quick run command | `npm test -- --testPathPattern=assignment.service` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIFY-02 | Push fires on create with topic | unit | `npm test -- --testPathPattern=assignment.service` | ✅ |
| NOTIFY-02 | No push when topic is null | unit | `npm test -- --testPathPattern=assignment.service` | ✅ |
| NOTIFY-02 | No push when NTFY disabled | unit | `npm test -- --testPathPattern=assignment.service` | ✅ |
| NOTIFY-02 | Assignment succeeds when fetch throws | unit | `npm test -- --testPathPattern=assignment.service` | ✅ |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern=assignment.service`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Add 4 test cases to `backend/src/__tests__/services/assignment.service.test.ts`:
  - Positive: create fires `fetch` with correct payload when child has topic
  - Negative: create does NOT fire `fetch` when `assignedTo.ntfyTopic` is null
  - Negative: create does NOT fire `fetch` when `NTFY_BASE_URL` is unset
  - Graceful: create succeeds when `fetch` throws (server unreachable)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | no | Zod validation already in route middleware; this phase adds no new input surface |
| V6 Cryptography | no | No new crypto; ntfy transport uses HTTPS (env var) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ntfy topic leak to logs | Information Disclosure | Topic logged only in `[ntfy] send failed` warning (existing pattern); no full URL logged |
| Assignment creation failure from notification error | Denial of Service | Fire-and-forget + internal catch in `sendNtfy` prevents notification errors from reaching caller |

## Sources

### Primary (HIGH confidence)

- `backend/src/services/notification.service.ts` — `notifyChoreAssigned` wrapper, `AssignmentWithIncludes` type, `sendNtfy` error handling
- `backend/src/services/notification.formatters.ts` — `assignedBody` formatter, priority 3, tags, click path
- `backend/src/services/assignment.service.ts` — `create()` function (lines 5-23), return type, existing patterns
- `backend/src/__tests__/services/assignment.service.test.ts` — test structure, mock patterns
- `backend/src/__tests__/services/notification.service.test.ts` — `jest.spyOn(global, 'fetch')` pattern

### Secondary (MEDIUM confidence)

- `backend/src/routes/assignments.routes.ts:44` — controller usage of `create()`, return envelope shape
- `backend/src/config/notifications.ts` — `isNtfyConfigured` guard, `getNtfyConfig()` pattern

### Tertiary (LOW confidence)

None — all findings verified against source code.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — zero new packages; all infrastructure exists
- Architecture: HIGH — patterns well-established from Phase 9; code analysis confirms
- Pitfalls: HIGH — test structure analyzed; mock gaps identified; includes differences documented

**Research date:** 2026-07-02
**Valid until:** 2026-08-01 (stable — notification infrastructure is mature)
