# Phase 11: chore-assigned trigger - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 2 (both modifications, no new files)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/services/assignment.service.ts` | service | CRUD + fire-and-forget | `backend/src/services/notification.service.ts` (fire-and-forget pattern) + `assignment.service.ts` itself (create pattern) | exact (same file + same project pattern) |
| `backend/src/__tests__/services/assignment.service.test.ts` | test | CRUD test | `backend/src/__tests__/services/notification.service.test.ts` (fetch spy pattern) | exact (same test pattern) |

## Pattern Assignments

### `backend/src/services/assignment.service.ts` (service, CRUD + fire-and-forget)

**Analog:** Same file (current lines 5-23) for the create pattern; `notification.service.ts` lines 44-49 for fire-and-forget call.

**Current create function** (lines 5-23):
```typescript
export async function create(data: {
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  notes?: string
}) {
  const template = await prisma.choreTemplate.findUnique({ where: { id: data.choreTemplateId } })
  if (!template) throw new AppError('Template not found', 404)

  return prisma.choreAssignment.create({
    data: {
      choreTemplateId: data.choreTemplateId,
      assignedToId: data.assignedToId,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
      status: 'PENDING',
    },
  })
}
```

**Required changes to `create()` function:**

1. **Add import** at line 3 (after existing imports):
```typescript
import { notifyChoreAssigned } from './notification.service'
```

2. **Replace lines 14-22** (the `return prisma.choreAssignment.create(...)` block) with the enrichment + notification pattern:
```typescript
  const created = await prisma.choreAssignment.create({
    data: {
      choreTemplateId: data.choreTemplateId,
      assignedToId: data.assignedToId,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
      status: 'PENDING',
    },
  })

  const enriched = await prisma.choreAssignment.findUnique({
    where: { id: created.id },
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
      assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
    },
  })

  if (enriched) void notifyChoreAssigned(enriched)
  return enriched ?? created
```

**Key details:**
- The `include` block uses the same shape as `getAll` (lines 52-54) and `complete` (lines 150-155), but adds `ntfyTopic: true` to the `assignedTo` select
- `void notifyChoreAssigned(enriched)` — fire-and-forget, never await, per notification.service.ts:48 pattern
- Defensive `if (enriched)` guard before the `void` call (recommended in RESEARCH.md Open Question 1)
- Fallback `?? created` ensures the function always returns a value even if `findUnique` returns null (theoretical race condition)
- Return type widens from `ChoreAssignment` to `ChoreAssignment & { template: ..., assignedTo: ... }` — backward-compatible via TypeScript structural typing

**Enriched includes pattern** (from `complete()` at lines 150-155, with `ntfyTopic` added):
```typescript
include: {
  template: { select: { id: true, title: true, points: true, category: true } },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
},
```

**Fire-and-forget call pattern** (from `notification.service.ts:44-48`):
```typescript
export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = assignedBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}
```

---

### `backend/src/__tests__/services/assignment.service.test.ts` (test, CRUD test)

**Analog:** Same file (current test structure) + `notification.service.test.ts` lines 16-22 for fetch spy pattern.

**Current create test** (lines 41-55):
```typescript
describe('assignmentService.create', () => {
  it('creates assignment with status PENDING and returns with includes', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
    const created = {
      id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-06-01'),
      status: 'PENDING', pointsAwarded: null, notes: null,
    }
    prisma.choreAssignment.create.mockResolvedValue(created)

    const result = await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-06-01' })

    expect(prisma.choreTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(prisma.choreAssignment.create).toHaveBeenCalled()
    expect(result).toBe(created)
  })
})
```

**Existing test mock setup** (lines 1-39):
```typescript
jest.mock('../../config/prisma', () => ({
  prisma: {
    choreTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
    choreAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pointLog: { create: jest.fn() },
    recurringChore: { findMany: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

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

**Required changes to existing create test:**

1. **Update the existing test** (lines 42-55) to mock `findUnique` and assert against the enriched result:
```typescript
it('creates assignment with status PENDING and returns with includes', async () => {
  prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
  const created = {
    id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-06-01'),
    status: 'PENDING', pointsAwarded: null, notes: null,
  }
  prisma.choreAssignment.create.mockResolvedValue(created)
  const enriched = {
    ...created,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
  }
  prisma.choreAssignment.findUnique.mockResolvedValue(enriched)

  const result = await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-06-01' })

  expect(prisma.choreTemplate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  expect(prisma.choreAssignment.create).toHaveBeenCalled()
  expect(prisma.choreAssignment.findUnique).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 1 },
    include: expect.objectContaining({
      assignedTo: expect.objectContaining({ ntfyTopic: true }),
    }),
  }))
  expect(result).toBe(enriched)
})
```

2. **Add 4 new test cases** inside the `describe('assignmentService.create', ...)` block, after the existing tests. The notification tests follow the `notification.service.test.ts` fetch spy pattern:

**Fetch spy setup** (from `notification.service.test.ts:16-17`):
```typescript
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
})
afterEach(() => {
  jest.restoreAllMocks()
})
```

**New test: fires fetch with correct payload when child has topic:**
```typescript
it('fires ntfy fetch with correct payload when child has topic', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
  prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
  const created = {
    id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-07-15'),
    status: 'PENDING', pointsAwarded: null, notes: null,
  }
  prisma.choreAssignment.create.mockResolvedValue(created)
  const enriched = {
    ...created,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
  }
  prisma.choreAssignment.findUnique.mockResolvedValue(enriched)

  await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-07-15' })

  // Allow microtask queue to flush (fire-and-forget)
  await new Promise(process.nextTick)

  expect(global.fetch).toHaveBeenCalledWith(
    'https://ntfy.example.com/alice-topic',
    expect.objectContaining({
      method: 'POST',
      body: 'Wash Dishes — due 2026-07-15',
      headers: expect.objectContaining({
        Title: 'Chore-Ganizer',
        Priority: '3',
        Tags: 'clipboard,bell',
        Click: '/chores/1',
      }),
    })
  )
  jest.restoreAllMocks()
})
```

**New test: does NOT fire fetch when topic is null:**
```typescript
it('does not fire ntfy fetch when assignedTo.ntfyTopic is null', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
  prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
  const created = {
    id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-07-15'),
    status: 'PENDING', pointsAwarded: null, notes: null,
  }
  prisma.choreAssignment.create.mockResolvedValue(created)
  const enriched = {
    ...created,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: null },
  }
  prisma.choreAssignment.findUnique.mockResolvedValue(enriched)

  await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-07-15' })

  await new Promise(process.nextTick)

  expect(global.fetch).not.toHaveBeenCalled()
  jest.restoreAllMocks()
})
```

**New test: does NOT fire fetch when NTFY disabled:**
```typescript
it('does not fire ntfy fetch when NTFY_BASE_URL is unset', async () => {
  jest.resetModules()
  jest.mock('../../config/notifications', () => ({
    isNtfyConfigured: false,
    getNtfyConfig: jest.fn(() => ({ enabled: false, baseUrl: '' })),
  }))
  jest.mock('../../config/prisma', () => ({
    prisma: {
      choreTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
      choreAssignment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pointLog: { create: jest.fn() },
      recurringChore: { findMany: jest.fn() },
      recurringOccurrence: { findMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    },
  }))
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

  const { prisma: prismaDisabled } = require('../../config/prisma')
  prismaDisabled.recurringChore.findMany.mockResolvedValue([])
  prismaDisabled.recurringOccurrence.findMany.mockResolvedValue([])
  const svc = require('../../services/assignment.service')

  prismaDisabled.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
  const created = {
    id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-07-15'),
    status: 'PENDING', pointsAwarded: null, notes: null,
  }
  prismaDisabled.choreAssignment.create.mockResolvedValue(created)
  prismaDisabled.choreAssignment.findUnique.mockResolvedValue({
    ...created,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
  })

  await svc.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-07-15' })

  await new Promise(process.nextTick)

  expect(global.fetch).not.toHaveBeenCalled()
  jest.restoreAllMocks()
})
```

**New test: assignment succeeds when fetch throws:**
```typescript
it('assignment succeeds even when ntfy fetch throws', async () => {
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
  prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
  const created = {
    id: 1, choreTemplateId: 1, assignedToId: 2, dueDate: new Date('2026-07-15'),
    status: 'PENDING', pointsAwarded: null, notes: null,
  }
  prisma.choreAssignment.create.mockResolvedValue(created)
  const enriched = {
    ...created,
    template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
    assignedTo: { id: 2, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
  }
  prisma.choreAssignment.findUnique.mockResolvedValue(enriched)

  // Should not throw — notification error is swallowed by sendNtfy
  const result = await assignmentService.create({ choreTemplateId: 1, assignedToId: 2, dueDate: '2026-07-15' })

  await new Promise(process.nextTick)

  expect(result).toBe(enriched)
  expect(global.fetch).toHaveBeenCalled()
  jest.restoreAllMocks()
})
```

---

## Shared Patterns

### Fire-and-Forget Notification
**Source:** `backend/src/services/notification.service.ts:44-48`
**Apply to:** `assignment.service.ts` create function
```typescript
export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = assignedBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}
```
**Usage:** `if (enriched) void notifyChoreAssigned(enriched)` — never await, never catch at call site.

### Enriched Includes Pattern
**Source:** `backend/src/services/assignment.service.ts:150-155` (complete function)
**Apply to:** `assignment.service.ts` create function (add `ntfyTopic: true`)
```typescript
include: {
  template: { select: { id: true, title: true, points: true, category: true } },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
},
```
**Note:** This is the same pattern as `complete()` and `uncomplete()`, with `ntfyTopic: true` added to `assignedTo`.

### Fetch Spy Test Pattern
**Source:** `backend/src/__tests__/services/notification.service.test.ts:16-22`
**Apply to:** All 4 new test cases in `assignment.service.test.ts`
```typescript
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
})
afterEach(() => {
  jest.restoreAllMocks()
})
```
**Usage in assignment tests:** Each notification test manages its own `jest.spyOn` + `jest.restoreAllMocks()` since the test file doesn't have a top-level fetch mock.

### Prisma Mock Setup
**Source:** `backend/src/__tests__/services/assignment.service.test.ts:1-39`
**Apply to:** All new test cases — the existing mock infrastructure already includes `choreAssignment.findUnique` (line 10). No new mocks needed for the Prisma layer.

### Module Re-require Pattern (for ntfy-disabled test)
**Source:** `backend/src/__tests__/services/notification.service.test.ts:86-98`
**Apply to:** The "ntfy disabled" test case
```typescript
jest.resetModules()
jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: false,
  getNtfyConfig: jest.fn(() => ({ enabled: false, baseUrl: '' })),
}))
const { sendNtfy: sendNtfyDisabled } = require('../../services/notification.service')
```
**Usage in assignment tests:** Same pattern — `jest.resetModules()` + re-mock config + re-require service.

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All files are modifications of existing files with clear analogs |

## Metadata

**Analog search scope:** `backend/src/services/`, `backend/src/__tests__/services/`, `backend/src/routes/`
**Files scanned:** 5
**Pattern extraction date:** 2026-07-02
