# Phase 9: Foundation - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 7
**Analogs found:** 6 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/config/notifications.ts` | config | request-response | `backend/src/config/prisma.ts` | exact |
| `backend/src/services/notification.service.ts` | service | event-driven | `backend/src/services/assignment.service.ts` | role-match |
| `backend/src/services/notification.formatters.ts` | service | transform | (no analog — pure functions) | none |
| `backend/src/__tests__/services/notification.service.test.ts` | test | request-response | `backend/src/__tests__/services/assignment.service.test.ts` | role-match |
| `backend/src/__tests__/services/notification.formatters.test.ts` | test | transform | (no analog — pure function tests) | none |
| `backend/prisma/schema.prisma` | model | CRUD | (existing file — modify only) | N/A |
| `backend/.env.example` | config | request-response | (existing file — modify only) | N/A |

## Pattern Assignments

### `backend/src/config/notifications.ts` (config, module-level env guard)

**Analog:** `backend/src/config/prisma.ts` (lines 1-4)

**Imports pattern:**
```typescript
import 'dotenv/config'
```

**Core pattern** (4 lines total in analog):
```typescript
// backend/src/config/prisma.ts lines 1-4 — exact pattern to follow
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

**Phase 9 adaptation** — read env at module load, export config + boolean guard:
```typescript
import 'dotenv/config'

const BASE_URL = (process.env.NTFY_BASE_URL ?? '').trim().replace(/\/$/, '')
export const isNtfyConfigured = BASE_URL.length > 0

if (!isNtfyConfigured) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function getNtfyConfig() {
  return { enabled: isNtfyConfigured, baseUrl: BASE_URL }
}
```

**Key conventions:**
- `import 'dotenv/config'` at top (line 1)
- Module-level execution (env read runs at import time)
- Export named functions/objects, no class
- `console.warn` for startup config issues (not `console.error`)

---

### `backend/src/services/notification.service.ts` (service, event-driven fire-and-forget)

**Analog:** `backend/src/services/assignment.service.ts` (lines 1-4, 5-23)

**Imports pattern** (lines 1-3):
```typescript
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { generateOccurrences } from './recurring.service'
```

**Phase 9 adaptation** — import config, not prisma (no DB calls in this service):
```typescript
import { isNtfyConfigured, getNtfyConfig } from '../config/notifications'
import { assignedBody, dueSoonBody, completedBody } from './notification.formatters'
```

**Core service pattern** (from `assignment.service.ts` lines 5-23):
```typescript
// Flat named exports, no class. Pure functions that throw AppError for expected errors.
export async function create(data: {
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  notes?: string
}) {
  const template = await prisma.choreTemplate.findUnique({ where: { id: data.choreTemplateId } })
  if (!template) throw new AppError('Template not found', 404)
  return prisma.choreAssignment.create({ data: { ... } })
}
```

**Phase 9 transport pattern** — fire-and-forget with internal error swallowing:
```typescript
export async function sendNtfy(
  topic: string | null,
  title: string,
  body: string,
  opts: { priority?: 1|2|3|4|5; tags?: string[]; click?: string } = {}
): Promise<void> {
  if (!isNtfyConfigured || !topic) return
  const { baseUrl } = getNtfyConfig()
  const url = `${baseUrl}/${encodeURIComponent(topic)}`
  const headers: Record<string, string> = {
    'Title': title,
    'Priority': String(opts.priority ?? 3),
  }
  if (opts.tags?.length) headers['Tags'] = opts.tags.join(',')
  if (opts.click) headers['Click'] = opts.click
  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers,
      signal: AbortSignal.timeout(3000),
    })
  } catch (err) {
    console.warn(`[ntfy] send failed for topic ${topic}: ${err instanceof Error ? err.message : String(err)}`)
  }
}
```

**Error handling pattern** — `sendNtfy` never throws. Callers use `void sendNtfy(...)`:
```typescript
// From recurring.service.ts lines 107-151 — "caller pre-fetches, service consumes" pattern D-03
export async function completeOccurrence(occurrenceId: number, userId: number) {
  const occurrence = await prisma.recurringOccurrence.findUnique({
    where: { id: occurrenceId },
    include: { chore: { include: { template: true } } },
  })
  if (!occurrence) throw new AppError('Occurrence not found', 404)
  // ... wraps in $transaction, returns result
}
```

**Domain wrapper pattern** — accept pre-resolved Prisma object, fire `void sendNtfy`:
```typescript
type AssignmentWithIncludes = {
  id: number
  template: { title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
  dueDate: Date
}

export function notifyChoreAssigned(assignment: AssignmentWithIncludes): void {
  const topic = assignment.assignedTo.ntfyTopic
  if (!topic) return
  const { title, body, priority, tags, click } = assignedBody(assignment)
  void sendNtfy(topic, title, body, { priority, tags, click })
}
```

---

### `backend/src/services/notification.formatters.ts` (service, pure transform)

**Analog:** None — pure functions with no existing analog in the codebase.

**Pattern:** Three named exported functions, each returning `{ title, body, priority, tags, click }`. No imports from config or prisma. No side effects. No env reads.

```typescript
// No existing analog — this is a new pattern for the project.
// Pure functions returning notification message shapes.
// Each function accepts a typed input and returns a plain object.

interface AssignmentInfo {
  id: number
  template: { title: string; points: number }
  dueDate: Date
}

interface UserInfo {
  name: string
}

export function assignedBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — due ${a.dueDate.toISOString().slice(0, 10)}`,
    priority: 3 as const,
    tags: ['clipboard', 'bell'],
    click: `/chores/${a.id}`,
  }
}

export function dueSoonBody(a: AssignmentInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — ${a.template.points} pts, due today`,
    priority: 4 as const,
    tags: ['warning', 'alarm_clock'],
    click: `/chores/${a.id}`,
  }
}

export function completedBody(a: AssignmentInfo, _completer: UserInfo) {
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — +${a.template.points} points earned`,
    priority: 2 as const,
    tags: ['white_check_mark', 'star'],
    click: `/chores/${a.id}`,
  }
}
```

---

### `backend/src/__tests__/services/notification.service.test.ts` (test, request-response)

**Analog:** `backend/src/__tests__/services/assignment.service.test.ts` (lines 1-39, 41-63)

**Mock pattern** (lines 1-26):
```typescript
// assignment.service.test.ts — jest.mock at module boundary for Prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    choreTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
    choreAssignment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
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
  assignmentService = require('../../services/assignment.service')
})
```

**Phase 9 adaptation** — mock `global.fetch` instead of Prisma (D-04):
```typescript
// notification.service.test.ts — mock global.fetch, no Prisma mock needed
describe('sendNtfy', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
  })

  it('calls fetch with correct URL and headers', async () => {
    await sendNtfy('test-topic', 'Test Title', 'Test body', { priority: 4, tags: ['warning'] })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-topic'),
      expect.objectContaining({
        method: 'POST',
        body: 'Test body',
        headers: expect.objectContaining({
          'Title': 'Test Title',
          'Priority': '4',
          'Tags': 'warning',
        }),
      })
    )
  })

  it('does not throw on fetch rejection', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    await expect(sendNtfy('test-topic', 'Title', 'body')).resolves.not.toThrow()
  })
})
```

**Test structure** (from `assignment.service.test.ts` lines 41-63):
```typescript
describe('assignmentService.create', () => {
  it('creates assignment with status PENDING and returns with includes', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue({ id: 1 })
    // ... setup mock, call service, assert
  })

  it('throws AppError 404 when template does not exist', async () => {
    prisma.choreTemplate.findUnique.mockResolvedValue(null)
    await expect(assignmentService.create({ ... }))
      .rejects.toMatchObject({ statusCode: 404, message: 'Template not found' })
  })
})
```

---

### `backend/src/__tests__/services/notification.formatters.test.ts` (test, pure function)

**Analog:** None — pure function tests are a new pattern. Follow the same test structure as other service tests but without any mocking.

```typescript
// No fetch mock needed — pure functions, no side effects
import { assignedBody, dueSoonBody, completedBody } from '../../services/notification.formatters'

describe('assignedBody', () => {
  it('returns title, body with due date, priority 3, tags, and relative click URL', () => {
    const result = assignedBody({
      id: 42,
      template: { title: 'Wash Dishes', points: 10 },
      dueDate: new Date('2026-07-15T00:00:00Z'),
    })
    expect(result).toEqual({
      title: 'Chore-Ganizer',
      body: 'Wash Dishes — due 2026-07-15',
      priority: 3,
      tags: ['clipboard', 'bell'],
      click: '/chores/42',
    })
  })
})
```

---

### `backend/prisma/schema.prisma` (model modification)

**Existing file** — add 3 nullable fields to existing models.

**Pattern** — append nullable fields to existing model blocks:
```prisma
// Add to User model (after line 17):
  ntfyTopic        String?  @unique

// Add to ChoreAssignment model (after line 53):
  dueNotifiedAt    DateTime?

// Add to RecurringOccurrence model (after line 106):
  dueNotifiedAt    DateTime?
```

**Convention:** nullable fields use `?` suffix, `@unique` constraint where needed (User.ntfyTopic). Applied via `prisma db push` — no migration files.

---

### `backend/.env.example` (config modification)

**Existing file** — add new section at the end.

**Pattern** — append to the Optional section:
```bash
# =========================
# Notifications (ntfy.sh)
# =========================

# ntfy server URL (e.g. https://ntfy.sh or http://localhost:8080)
# Leave empty or omit to disable push notifications entirely.
# NTFY_BASE_URL=https://ntfy.sh
```

**Convention:** 1-2 line comment, section header with `===` dividers, variable shown commented out with example value.

---

## Shared Patterns

### Service Pattern (All Services)
**Source:** `backend/src/services/assignment.service.ts` + `backend/src/services/users.service.ts`
**Apply to:** `notification.service.ts`, `notification.formatters.ts`
```typescript
// Flat named exports, no class. Import config at top.
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function functionName(data: TypedInput): Promise<TypedOutput> {
  // validation with AppError throws
  // DB operations or business logic
  // return plain object
}
```

### Error Handling
**Source:** `backend/src/middleware/errorHandler.ts` (lines 1-11)
**Apply to:** All services
```typescript
export class AppError extends Error {
  statusCode: number
  code?: string
  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
```

### Module-Level Env Guard
**Source:** `backend/src/config/prisma.ts` (lines 1-4)
**Apply to:** `config/notifications.ts`
```typescript
import 'dotenv/config'
// Read env var at module load time
// Log warning once if missing
// Export config object + boolean flag
```

### Test Mock Pattern (Prisma-based services)
**Source:** `backend/src/__tests__/services/assignment.service.test.ts` (lines 1-39)
**Apply to:** All service tests
```typescript
jest.mock('../../config/prisma', () => ({ prisma: { ... } }))
const { prisma } = require('../../config/prisma')
let service: typeof import('../../services/service')
beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/service')]
  service = require('../../services/service')
})
```

### Test Mock Pattern (fetch-based services)
**Source:** CONTEXT.md D-04
**Apply to:** `notification.service.test.ts`
```typescript
// Mock global.fetch instead of Prisma
// clearMocks: true in jest.config.js resets spies between tests
beforeEach(() => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
})
```

### Console Log Convention
**Source:** Existing codebase
**Apply to:** All notification logs
```typescript
console.warn('[ntfy] ...')   // startup config issues
console.warn('[ntfy] ...')   // runtime send failures (catch block)
// No console.error — notification failures are warnings, not errors
```

### Env Var Documentation
**Source:** `backend/.env.example` (lines 1-36)
**Apply to:** New `NTFY_BASE_URL` section
```bash
# Section header with === dividers
# 1-2 line comment explaining purpose
# Variable shown commented out with example value
```

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/src/services/notification.formatters.ts` | service | transform | Pure functions returning message shapes — no existing analog in codebase |
| `backend/src/__tests__/services/notification.formatters.test.ts` | test | transform | Pure function tests without mocks — no existing analog |

## Metadata

**Analog search scope:** `backend/src/config/`, `backend/src/services/`, `backend/src/__tests__/services/`, `backend/src/middleware/`, `backend/prisma/`
**Files scanned:** 9
**Pattern extraction date:** 2026-06-29
