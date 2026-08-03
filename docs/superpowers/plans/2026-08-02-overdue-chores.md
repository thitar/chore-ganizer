# Overdue Chore Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let parents see every overdue chore (one-off and recurring), cancel one with an optional points penalty, reschedule a one-off chore, and receive an ntfy push at 08:00 the day after a chore goes overdue.

**Architecture:** A new parent-only `/api/overdue` resource (`listOverdue`/`cancel`/`reschedule`) backed by a new `overdue.service.ts`. Soft cancel via a new `CANCELLED` status + `cancelledAt`/`penaltyPoints`/`overdueNotifiedAt` columns on both `ChoreAssignment` and `RecurringOccurrence`. A new `overdue.notification.service.ts` sweep, run every 5 minutes from `server.ts`, pushes to the assigned child + all parents once the local time in `NOTIFY_TIMEZONE` passes `NOTIFY_OVERDUE_HOUR`. Frontend gets a parent-only `/overdue` page with cancel/reschedule modals.

**Tech Stack:** Express + TypeScript + Prisma + SQLite (backend), React 18 + TanStack Query + React Router (frontend), ntfy push, Jest/Vitest/Playwright tests.

**Design spec:** `docs/superpowers/specs/2026-08-02-overdue-chores-design.md`

---

## Conventions used throughout this plan

- **Backend test commands run with cwd `backend/`** (see `AGENTS.md` — running jest from the repo root collects frontend Vitest files and fails). Mocked-prisma unit tests don't need the DB; the integration test in Task 10 does.
- **Frontend API modules MUST use `createApiClient()`** (`frontend/src/lib/apiClient.ts`), never `axios.create()` — a raw instance drops the CSRF header on every mutating request (see `AGENTS.md`).
- **No code comments** unless the surrounding file already documents intent (e.g. the optimistic-write note in `notifyDueSoon` is worth mirroring).
- Every step that changes app behavior is followed by a commit. Commit messages follow the repo style (`feat:` / `fix:` / `docs:`).

---

## Task 1: Schema — add overdue/cancel columns to both chore models

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Run: `npx prisma validate`, `DATABASE_URL="file:./dev.db" npx prisma db push` (cwd `backend/`)

- [ ] **Step 1: Add columns to `ChoreAssignment`**

In `backend/prisma/schema.prisma`, extend the `ChoreAssignment` model (after the existing `dueNotifiedAt` line) with:

```prisma
  dueNotifiedAt      DateTime?
  overdueNotifiedAt  DateTime?
  cancelledAt        DateTime?
  penaltyPoints      Int?
```

- [ ] **Step 2: Add columns to `RecurringOccurrence`**

In the same file, extend `RecurringOccurrence` (after its `dueNotifiedAt` line):

```prisma
  dueNotifiedAt      DateTime?
  overdueNotifiedAt  DateTime?
  cancelledAt        DateTime?
  penaltyPoints      Int?
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid.`

- [ ] **Step 4: Push to the dev DB and regenerate the client**

Run: `DATABASE_URL="file:./dev.db" npx prisma db push`
Expected: outputs a `sync` message and regenerates the Prisma client (needed for the new fields to be typed).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat: add overdue/cancel columns to chore models"
```

---

## Task 2: Config — overdue notification env parsing

**Files:**
- Modify: `backend/src/config/notifications.ts`
- Modify: `backend/src/services/notification.service.ts`

- [ ] **Step 1: Add `getOverdueConfig` to `config/notifications.ts`**

Append to `backend/src/config/notifications.ts`:

```ts
export function getOverdueConfig() {
  const timezone = (process.env.NOTIFY_TIMEZONE ?? 'Europe/Oslo').trim() || 'Europe/Oslo'
  const raw = (process.env.NOTIFY_OVERDUE_HOUR ?? '08:00').trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  const hour = match ? Number(match[1]) : 8
  const minute = match ? Number(match[2]) : 0
  return {
    timezone,
    hour: hour >= 0 && hour <= 23 ? hour : 8,
    minute: minute >= 0 && minute <= 59 ? minute : 0,
  }
}
```

This parses `NOTIFY_TIMEZONE` (IANA name, default `Europe/Oslo`) and `NOTIFY_OVERDUE_HOUR` (24-hour `HH:MM`, default `08:00`), falling back to defaults on malformed input.

- [ ] **Step 2: Re-export from `notification.service.ts`**

In `backend/src/services/notification.service.ts`, the import line is currently:

```ts
import { isNtfyConfigured, getNtfyConfig } from '../config/notifications'
```

Change it to:

```ts
import { isNtfyConfigured, getNtfyConfig, getOverdueConfig } from '../config/notifications'
```

and change the re-export line:

```ts
export { isNtfyConfigured }
```

to:

```ts
export { isNtfyConfigured, getOverdueConfig }
```

(All notification concerns flow through `notification.service.ts` per ADR-004.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/notifications.ts backend/src/services/notification.service.ts
git commit -m "feat: add overdue notification timezone/hour config"
```

---

## Task 3: Formatter — overdue push body

**Files:**
- Modify: `backend/src/services/notification.formatters.ts`

- [ ] **Step 1: Add `overdueBody`**

Append to `backend/src/services/notification.formatters.ts`:

```ts
export function overdueBody(a: AssignmentInfo) {
  const due = new Date(a.dueDate.toISOString().slice(0, 10))
  const today = new Date(new Date().toISOString().slice(0, 10))
  const days = Math.round((today.getTime() - due.getTime()) / 86400000)
  const label = days <= 1 ? 'overdue' : `overdue ${days} days`
  return {
    title: 'Chore-Ganizer',
    body: `${a.template.title} — ${label}`,
    priority: 5 as const,
    tags: ['warning', 'exclamation'],
    click: `/chores/${a.id}`,
  }
}
```

(Computes the day count against UTC date strings — consistent with how the rest of the app stores/compares dates.)

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/notification.formatters.ts
git commit -m "feat: add overdue notification formatter"
```

---

## Task 4: Backend overdue service (list / cancel / reschedule) — TDD

**Files:**
- Create: `backend/src/__tests__/services/overdue.service.test.ts`
- Create: `backend/src/services/overdue.service.ts`

- [ ] **Step 1: Write the failing test file**

Create `backend/src/__tests__/services/overdue.service.test.ts`:

```ts
jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    pointLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('../../config/prisma')

let overdueService: typeof import('../../services/overdue.service')

beforeEach(() => {
  jest.clearAllMocks()
  prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma))
  delete require.cache[require.resolve('../../services/overdue.service')]
  overdueService = require('../../services/overdue.service')
})

describe('overdueService.listOverdue', () => {
  it('queries both tables for PENDING before today and returns combined sorted shape', async () => {
    const assignment = {
      id: 1, choreTemplateId: 1, assignedToId: 3, dueDate: new Date('2026-07-01T00:00:00Z'),
      status: 'PENDING', dueNotifiedAt: null, overdueNotifiedAt: null, cancelledAt: null,
      completedAt: null, pointsAwarded: null, notes: null, createdAt: new Date('2026-06-01'),
      template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    }
    const occurrence = {
      id: 10, recurringChoreId: 5, assignedToId: 3, dueDate: new Date('2026-07-02T00:00:00Z'),
      status: 'PENDING', dueNotifiedAt: null, overdueNotifiedAt: null, cancelledAt: null,
      completedAt: null, pointsAwarded: null, createdAt: new Date('2026-06-01'),
      chore: {
        id: 5, choreTemplateId: 2,
        template: { id: 2, title: 'Sweep Floor', points: 5, category: 'kitchen' },
      },
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    }
    prisma.choreAssignment.findMany.mockResolvedValue([assignment])
    prisma.recurringOccurrence.findMany.mockResolvedValue([occurrence])

    const result = await overdueService.listOverdue()

    expect(prisma.choreAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', dueDate: { lt: expect.any(Date) } } })
    )
    expect(prisma.recurringOccurrence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', dueDate: { lt: expect.any(Date) } } })
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 1, type: 'REGULAR' })
    expect(result[1]).toMatchObject({ id: 10, type: 'RECURRING' })
    expect(result[0].dueDate).toBe('2026-07-01')
    expect(result[1].dueDate).toBe('2026-07-02')
  })
})

describe('overdueService.cancel', () => {
  const pending = { id: 1, assignedToId: 3, status: 'PENDING', template: { id: 1, title: 'Wash Dishes', points: 10 } }
  const cancelled = { ...pending, status: 'CANCELLED', cancelledAt: new Date(), penaltyPoints: 10 }

  it('REGULAR: sets CANCELLED and writes a PENALTY PointLog when penalty > 0', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => {
      prisma.choreAssignment.update.mockResolvedValue(cancelled)
      prisma.choreAssignment.findUnique.mockResolvedValue(cancelled)
      return cb(prisma)
    })

    const result = await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 10 })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: 10 },
    })
    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: { userId: 3, amount: -10, type: 'PENALTY', reason: 'Overdue: Wash Dishes' },
    })
    expect(result.status).toBe('CANCELLED')
  })

  it('REGULAR: penalty 0 sets no penaltyPoints and writes no PointLog', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pending)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => {
      prisma.choreAssignment.update.mockResolvedValue(cancelled)
      prisma.choreAssignment.findUnique.mockResolvedValue({ ...cancelled, penaltyPoints: null })
      return cb(prisma)
    })

    await overdueService.cancel({ id: 1, type: 'REGULAR', penalty: 0 })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: null },
    })
    expect(prisma.pointLog.create).not.toHaveBeenCalled()
  })

  it('RECURRING: writes a PENALTY PointLog for the occurrence', async () => {
    const occ = { id: 7, assignedToId: 3, status: 'PENDING', chore: { template: { id: 2, title: 'Sweep Floor', points: 5 } } }
    prisma.recurringOccurrence.findUnique.mockResolvedValue(occ)
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma))

    await overdueService.cancel({ id: 7, type: 'RECURRING', penalty: 5 })

    expect(prisma.recurringOccurrence.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date), penaltyPoints: 5 },
    })
    expect(prisma.pointLog.create).toHaveBeenCalledWith({
      data: { userId: 3, amount: -5, type: 'PENALTY', reason: 'Overdue: Sweep Floor' },
    })
  })

  it('throws 404 when REGULAR row missing', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    await expect(overdueService.cancel({ id: 999, type: 'REGULAR' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when REGULAR row is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...pending, status: 'CANCELLED' })
    await expect(overdueService.cancel({ id: 1, type: 'REGULAR' })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 404 when RECURRING row missing', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue(null)
    await expect(overdueService.cancel({ id: 999, type: 'RECURRING' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when RECURRING row is COMPLETED', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({ id: 7, status: 'COMPLETED' })
    await expect(overdueService.cancel({ id: 7, type: 'RECURRING' })).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('overdueService.reschedule', () => {
  it('updates dueDate and clears both notification dedup flags', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'PENDING' })
    prisma.choreAssignment.update.mockResolvedValue({ id: 1, status: 'PENDING', dueDate: new Date('2026-08-10') })

    const result = await overdueService.reschedule({ id: 1, dueDate: '2026-08-10' })

    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { dueDate: new Date('2026-08-10'), dueNotifiedAt: null, overdueNotifiedAt: null },
    })
    expect(result.dueDate).toEqual(new Date('2026-08-10'))
  })

  it('throws 404 when assignment missing', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    await expect(overdueService.reschedule({ id: 999, dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 409 when assignment is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ id: 1, status: 'COMPLETED' })
    await expect(overdueService.reschedule({ id: 1, dueDate: '2026-08-10' })).rejects.toMatchObject({ statusCode: 409 })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run (cwd `backend/`): `npx jest __tests__/services/overdue.service.test.ts`
Expected: FAIL with `Cannot find module '../../services/overdue.service'`.

- [ ] **Step 3: Write `overdue.service.ts`**

Create `backend/src/services/overdue.service.ts`:

```ts
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

const ASSIGN_INCLUDE = {
  template: { select: { id: true, title: true, points: true, category: true } },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
} as const

const OCCURRENCE_INCLUDE = {
  chore: {
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
    },
  },
  assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
} as const

function startOfTodayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function listOverdue() {
  const before = startOfTodayUtc()
  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: { status: 'PENDING', dueDate: { lt: before } },
      include: ASSIGN_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.recurringOccurrence.findMany({
      where: { status: 'PENDING', dueDate: { lt: before } },
      include: OCCURRENCE_INCLUDE,
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const regular = assignments.map((a) => ({
    id: a.id,
    type: 'REGULAR' as const,
    choreTemplateId: a.choreTemplateId,
    assignedToId: a.assignedToId,
    dueDate: a.dueDate.toISOString().split('T')[0],
    status: a.status,
    completedAt: a.completedAt?.toISOString() ?? null,
    pointsAwarded: a.pointsAwarded,
    dueNotifiedAt: a.dueNotifiedAt?.toISOString() ?? null,
    overdueNotifiedAt: a.overdueNotifiedAt?.toISOString() ?? null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    template: a.template,
    assignedTo: a.assignedTo,
  }))

  const recurring = occurrences
    .filter((o) => o.chore !== null)
    .map((o) => ({
      id: o.id,
      type: 'RECURRING' as const,
      choreTemplateId: o.chore!.choreTemplateId,
      assignedToId: o.assignedToId,
      dueDate: o.dueDate.toISOString().split('T')[0],
      status: o.status,
      completedAt: o.completedAt?.toISOString() ?? null,
      pointsAwarded: o.pointsAwarded,
      dueNotifiedAt: o.dueNotifiedAt?.toISOString() ?? null,
      overdueNotifiedAt: o.overdueNotifiedAt?.toISOString() ?? null,
      notes: null,
      createdAt: o.createdAt.toISOString(),
      template: o.chore!.template,
      assignedTo: o.assignedTo,
    }))

  return [...regular, ...recurring].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

type CancelInput = { id: number; type: 'REGULAR' | 'RECURRING'; penalty?: number }

export async function cancel(data: CancelInput) {
  const penalty = data.penalty ?? 0
  if (data.type === 'REGULAR') return cancelAssignment(data.id, penalty)
  return cancelOccurrence(data.id, penalty)
}

async function cancelAssignment(id: number, penalty: number) {
  const row = await prisma.choreAssignment.findUnique({
    where: { id },
    include: { template: { select: { id: true, title: true, points: true } } },
  })
  if (!row) throw new AppError('Assignment not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be cancelled', 409)

  return prisma.$transaction(async (tx) => {
    await tx.choreAssignment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        penaltyPoints: penalty > 0 ? penalty : null,
      },
    })
    if (penalty > 0) {
      await tx.pointLog.create({
        data: {
          userId: row.assignedToId,
          amount: -penalty,
          type: 'PENALTY',
          reason: `Overdue: ${row.template.title}`,
        },
      })
    }
    return tx.choreAssignment.findUnique({ where: { id }, include: ASSIGN_INCLUDE })
  })
}

async function cancelOccurrence(id: number, penalty: number) {
  const row = await prisma.recurringOccurrence.findUnique({
    where: { id },
    include: { chore: { include: { template: { select: { id: true, title: true, points: true } } } } },
  })
  if (!row) throw new AppError('Occurrence not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be cancelled', 409)

  return prisma.$transaction(async (tx) => {
    await tx.recurringOccurrence.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        penaltyPoints: penalty > 0 ? penalty : null,
      },
    })
    if (penalty > 0) {
      await tx.pointLog.create({
        data: {
          userId: row.assignedToId,
          amount: -penalty,
          type: 'PENALTY',
          reason: `Overdue: ${row.chore?.template.title ?? 'Unknown'}`,
        },
      })
    }
    return tx.recurringOccurrence.findUnique({ where: { id }, include: OCCURRENCE_INCLUDE })
  })
}

export async function reschedule(data: { id: number; dueDate: string }) {
  const row = await prisma.choreAssignment.findUnique({ where: { id: data.id } })
  if (!row) throw new AppError('Assignment not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be rescheduled', 409)

  return prisma.choreAssignment.update({
    where: { id: data.id },
    data: {
      dueDate: new Date(data.dueDate),
      dueNotifiedAt: null,
      overdueNotifiedAt: null,
    },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (cwd `backend/`): `npx jest __tests__/services/overdue.service.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/overdue.service.ts backend/src/__tests__/services/overdue.service.test.ts
git commit -m "feat: add overdue list/cancel/reschedule service"
```

---

## Task 5: Overdue request schemas

**Files:**
- Create: `backend/src/schemas/overdue.schema.ts`

- [ ] **Step 1: Write the Zod schemas**

Create `backend/src/schemas/overdue.schema.ts`:

```ts
import { z } from 'zod'

export const cancelOverdueSchema = z.object({
  id: z.number().int().positive('Chore ID is required'),
  type: z.enum(['REGULAR', 'RECURRING']),
  penalty: z.number().int().min(0, 'Penalty must be 0 or more').max(100000, 'Penalty is too large').optional(),
})

export const rescheduleOverdueSchema = z.object({
  id: z.number().int().positive('Chore ID is required'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid due date is required'),
})
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/schemas/overdue.schema.ts
git commit -m "feat: add overdue request validation schemas"
```

---

## Task 6: Overdue routes + mount

**Files:**
- Create: `backend/src/routes/overdue.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Write the routes**

Create `backend/src/routes/overdue.routes.ts`:

```ts
import { Router } from 'express'
import * as overdueService from '../services/overdue.service'
import { authenticate, authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { cancelOverdueSchema, rescheduleOverdueSchema } from '../schemas/overdue.schema'

const router = Router()

router.get('/', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const items = await overdueService.listOverdue()
    res.json({ success: true, data: items, error: null })
  } catch (err) {
    next(err)
  }
})

router.post(
  '/cancel',
  authenticate,
  authorize('PARENT'),
  validate(cancelOverdueSchema),
  async (req, res, next) => {
    try {
      const item = await overdueService.cancel(req.body)
      res.json({ success: true, data: item, error: null })
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/reschedule',
  authenticate,
  authorize('PARENT'),
  validate(rescheduleOverdueSchema),
  async (req, res, next) => {
    try {
      const item = await overdueService.reschedule(req.body)
      res.json({ success: true, data: item, error: null })
    } catch (err) {
      next(err)
    }
  }
)

export default router
```

- [ ] **Step 2: Mount in `routes/index.ts`**

In `backend/src/routes/index.ts`, add the import after the `gamesRouter` import:

```ts
import overdueRouter from './overdue.routes'
```

and add the mount after `router.use('/games', gamesRouter)`:

```ts
router.use('/overdue', overdueRouter)
```

- [ ] **Step 3: Typecheck**

Run (cwd `backend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/overdue.routes.ts backend/src/routes/index.ts
git commit -m "feat: add parent-only /api/overdue routes"
```

---

## Task 7: Overdue notification sweep service — TDD

**Files:**
- Create: `backend/src/__tests__/services/overdue.notification.service.test.ts`
- Create: `backend/src/services/overdue.notification.service.ts`

- [ ] **Step 1: Write the failing test file**

Create `backend/src/__tests__/services/overdue.notification.service.test.ts`:

```ts
jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: true,
  getNtfyConfig: jest.fn(() => ({ baseUrl: 'https://ntfy.example.com' })),
  getOverdueConfig: jest.fn(() => ({ timezone: 'Europe/Oslo', hour: 8, minute: 0 })),
}))

jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findMany: jest.fn(), updateMany: jest.fn() },
    recurringOccurrence: { findMany: jest.fn(), updateMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}))

const { prisma } = require('../../config/prisma')

let notifyOverdue: typeof import('../../services/overdue.notification.service').notifyOverdue
let localDateStr: typeof import('../../services/overdue.notification.service').localDateStr

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/overdue.notification.service')]
  const mod = require('../../services/overdue.notification.service')
  notifyOverdue = mod.notifyOverdue
  localDateStr = mod.localDateStr
})

describe('localDateStr', () => {
  it('formats a UTC date into a date string in the configured timezone', () => {
    expect(localDateStr(new Date('2026-08-02T00:00:00Z'), 'Europe/Oslo')).toBe('2026-08-02')
    expect(localDateStr(new Date('2026-08-02T22:00:00Z'), 'Europe/Oslo')).toBe('2026-08-03')
  })
})

describe('notifyOverdue', () => {
  const REGULAR = {
    id: 1, dueDate: new Date('2026-08-02T00:00:00Z'),
    assignedTo: { ntfyTopic: 'alice-topic' },
    template: { title: 'Wash Dishes', points: 10 },
  }
  const RECURRING = {
    id: 7, dueDate: new Date('2026-08-02T00:00:00Z'),
    assignedTo: { ntfyTopic: 'alice-topic' },
    chore: { template: { title: 'Sweep Floor', points: 5 } },
  }

  beforeEach(() => {
    prisma.choreAssignment.findMany.mockResolvedValue([REGULAR])
    prisma.recurringOccurrence.findMany.mockResolvedValue([RECURRING])
    prisma.user.findMany.mockResolvedValue([
      { ntfyTopic: 'dad-topic' },
      { ntfyTopic: null },
    ])
  })

  it('sends to the child and each parent at 08:00 CET the day after the due date', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T06:00:00Z'))

    // 2 eligible items (REGULAR + RECURRING) × 2 recipients each (child + dad) = 4
    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/alice-topic',
      expect.objectContaining({
        method: 'POST',
        body: 'Wash Dishes — overdue',
        headers: expect.objectContaining({ Title: 'Chore-Ganizer', Priority: '5', Tags: 'warning,exclamation', Click: '/chores/1' }),
      })
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/dad-topic',
      expect.objectContaining({ method: 'POST' })
    )
    expect(prisma.choreAssignment.updateMany).toHaveBeenCalledWith({
      where: { id: 1, overdueNotifiedAt: null },
      data: { overdueNotifiedAt: expect.any(Date) },
    })
    expect(prisma.recurringOccurrence.updateMany).toHaveBeenCalledWith({
      where: { id: 7, overdueNotifiedAt: null },
      data: { overdueNotifiedAt: expect.any(Date) },
    })
    fetchSpy.mockRestore()
  })

  it('does not send before 08:00 local time', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T05:00:00Z'))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(prisma.choreAssignment.updateMany).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does not notify a chore due today (not yet overdue)', async () => {
    prisma.choreAssignment.findMany.mockResolvedValue([
      { ...REGULAR, dueDate: new Date('2026-08-03T00:00:00Z') },
    ])
    prisma.recurringOccurrence.findMany.mockResolvedValue([])
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())

    await notifyOverdue(new Date('2026-08-03T06:00:00Z'))

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does nothing when ntfy is disabled', async () => {
    // The sweep reads isNtfyConfigured live through notification.service's
    // re-export (a getter in ts-jest output), so toggle the value on the
    // mocked config module and re-require the sweep.
    const config = require('../../config/notifications')
    const original = config.isNtfyConfigured
    config.isNtfyConfigured = false
    delete require.cache[require.resolve('../../services/overdue.notification.service')]
    notifyOverdue = require('../../services/overdue.notification.service').notifyOverdue
    try {
      await notifyOverdue(new Date('2026-08-03T06:00:00Z'))
      expect(prisma.choreAssignment.findMany).not.toHaveBeenCalled()
      expect(prisma.recurringOccurrence.findMany).not.toHaveBeenCalled()
    } finally {
      config.isNtfyConfigured = original
      delete require.cache[require.resolve('../../services/overdue.notification.service')]
      notifyOverdue = require('../../services/overdue.notification.service').notifyOverdue
    }
  })

  it('does not throw when a send fails (fire-and-forget)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(notifyOverdue(new Date('2026-08-03T06:00:00Z'))).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run (cwd `backend/`): `npx jest __tests__/services/overdue.notification.service.test.ts`
Expected: FAIL with `Cannot find module '../../services/overdue.notification.service'`.

- [ ] **Step 3: Write `overdue.notification.service.ts`**

Create `backend/src/services/overdue.notification.service.ts`:

```ts
import { prisma } from '../config/prisma'
import { sendNtfy, isNtfyConfigured, getOverdueConfig } from './notification.service'
import { overdueBody } from './notification.formatters'

export function localDateStr(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function localTime(date: Date, timezone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  return { hour: Number(get('hour')), minute: Number(get('minute')) }
}

export async function notifyOverdue(now = new Date()): Promise<void> {
  if (!isNtfyConfigured) return

  const { timezone, hour, minute } = getOverdueConfig()
  const todayStr = localDateStr(now, timezone)
  const { hour: curHour, minute: curMinute } = localTime(now, timezone)
  const isPastSendTime = curHour > hour || (curHour === hour && curMinute >= minute)
  if (!isPastSendTime) return

  const tomorrow = new Date(`${todayStr}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: { status: 'PENDING', overdueNotifiedAt: null, dueDate: { lt: tomorrow } },
      select: {
        id: true,
        dueDate: true,
        assignedTo: { select: { ntfyTopic: true } },
        template: { select: { title: true, points: true } },
      },
    }),
    prisma.recurringOccurrence.findMany({
      where: { status: 'PENDING', overdueNotifiedAt: null, dueDate: { lt: tomorrow } },
      select: {
        id: true,
        dueDate: true,
        assignedTo: { select: { ntfyTopic: true } },
        chore: { select: { template: { select: { title: true, points: true } } } },
      },
    }),
  ])

  const regular = assignments.map((a) => ({
    id: a.id,
    type: 'REGULAR' as const,
    dueDate: a.dueDate,
    assignedTo: a.assignedTo,
    template: a.template,
  }))
  const recurring = occurrences
    .filter((o) => o.chore !== null)
    .map((o) => ({
      id: o.id,
      type: 'RECURRING' as const,
      dueDate: o.dueDate,
      assignedTo: o.assignedTo,
      template: o.chore!.template,
    }))

  const overdueItems = [...regular, ...recurring].filter(
    (item) => localDateStr(item.dueDate, timezone) < todayStr
  )
  if (overdueItems.length === 0) return

  const parents = await prisma.user.findMany({ where: { role: 'PARENT' }, select: { ntfyTopic: true } })

  for (const item of overdueItems) {
    const { title, body, priority, tags, click } = overdueBody({
      id: item.id,
      template: item.template,
      dueDate: item.dueDate,
    })

    if (item.type === 'REGULAR') {
      await prisma.choreAssignment.updateMany({
        where: { id: item.id, overdueNotifiedAt: null },
        data: { overdueNotifiedAt: now },
      })
    } else {
      await prisma.recurringOccurrence.updateMany({
        where: { id: item.id, overdueNotifiedAt: null },
        data: { overdueNotifiedAt: now },
      })
    }

    if (item.assignedTo?.ntfyTopic) {
      void sendNtfy(item.assignedTo.ntfyTopic, title, body, { priority, tags, click })
    }
    for (const parent of parents) {
      if (parent.ntfyTopic) {
        void sendNtfy(parent.ntfyTopic, title, body, { priority, tags, click })
      }
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (cwd `backend/`): `npx jest __tests__/services/overdue.notification.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/overdue.notification.service.ts backend/src/__tests__/services/overdue.notification.service.test.ts
git commit -m "feat: add overdue notification sweep"
```

---

## Task 8: Wire the sweep into the server

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add the scheduled sweep**

In `backend/src/server.ts`, add the import after the `import app from './app'` line:

```ts
import { notifyOverdue } from './services/overdue.notification.service'
```

Add the following after the `const server = http.createServer(app)` line:

```ts
const OVERDUE_SWEEP_INTERVAL_MS = 5 * 60 * 1000
let isOverdueSweepRunning = false

async function runOverdueSweep(): Promise<void> {
  if (isOverdueSweepRunning) return
  isOverdueSweepRunning = true
  try {
    await notifyOverdue()
  } catch (err) {
    console.warn(`[overdue] sweep failed: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    isOverdueSweepRunning = false
  }
}

const overdueSweepTimer = setInterval(() => {
  void runOverdueSweep()
}, OVERDUE_SWEEP_INTERVAL_MS)

void runOverdueSweep()
```

(The immediate `void runOverdueSweep()` after boot catches up if the backend was down at 08:00 — the `overdueNotifiedAt` dedup makes it safe.)

- [ ] **Step 2: Clear the timer on graceful shutdown**

In the `SIGTERM` and `SIGINT` handlers, add `clearInterval(overdueSweepTimer)` before `server.close(...)` so the interval doesn't keep the event loop alive. Both handlers become:

```ts
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  clearInterval(overdueSweepTimer)
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  clearInterval(overdueSweepTimer)
  server.close(() => process.exit(0))
})
```

- [ ] **Step 3: Typecheck**

Run (cwd `backend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: schedule overdue notification sweep every 5 minutes"
```

---

## Task 9: Completion guards for CANCELLED chores

**Files:**
- Modify: `backend/src/services/assignment.service.ts`
- Modify: `backend/src/services/recurring.service.ts`

- [ ] **Step 1: Guard `assignmentService.complete`**

In `backend/src/services/assignment.service.ts`, `complete()` currently has:

```ts
  if (assignment.status === 'COMPLETED') throw new AppError('Assignment is already completed', 409)
```

Add below it:

```ts
  if (assignment.status === 'CANCELLED') throw new AppError('Assignment is cancelled and cannot be completed', 409)
```

- [ ] **Step 2: Guard `recurringService.completeOccurrence`**

In `backend/src/services/recurring.service.ts`, `completeOccurrence()` currently has:

```ts
  if (occurrence.status === 'COMPLETED') {
    throw new AppError('Occurrence is already completed', 409)
  }
```

Add below it:

```ts
  if (occurrence.status === 'CANCELLED') {
    throw new AppError('Occurrence is cancelled and cannot be completed', 409)
  }
```

- [ ] **Step 3: Add a unit test for the assignment guard**

Append to `backend/src/__tests__/services/assignment.service.test.ts`, inside the existing `describe('assignmentService.complete', ...)` block, add:

```ts
  it('throws AppError 409 when assignment is CANCELLED', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...mockAssignment, status: 'CANCELLED' })

    await expect(assignmentService.complete(1, 2))
      .rejects.toMatchObject({ statusCode: 409, message: 'Assignment is cancelled and cannot be completed' })
  })
```

- [ ] **Step 4: Add a unit test for the occurrence guard**

Append to `backend/src/__tests__/services/recurring.service.test.ts` a test in the same style (mock `recurringOccurrence.findUnique` to resolve a `status: 'CANCELLED'` occurrence and assert a 409):

```ts
  it('throws AppError 409 when occurrence is CANCELLED', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({ id: 7, assignedToId: 3, status: 'CANCELLED' })

    await expect(recurringService.completeOccurrence(7, 3))
      .rejects.toMatchObject({ statusCode: 409, message: 'Occurrence is cancelled and cannot be completed' })
  })
```

(`assignedToId` is required in the mock because `completeOccurrence` checks ownership — 403 — before the status guard.)

If `backend/src/__tests__/services/recurring.service.test.ts` does not exist yet, create it by copying the mocked-prisma pattern from `assignment.service.test.ts` (mock `recurringOccurrence.findUnique` / `$transaction`) and add only the above test plus a minimal `beforeEach` that wires `$transaction` and clears mocks.

- [ ] **Step 5: Run both service test files**

Run (cwd `backend/`): `npx jest __tests__/services/assignment.service.test.ts __tests__/services/recurring.service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/assignment.service.ts backend/src/services/recurring.service.ts backend/src/__tests__/services/assignment.service.test.ts backend/src/__tests__/services/recurring.service.test.ts
git commit -m "fix: reject completion of cancelled chores"
```

---

## Task 10: Backend integration test for /api/overdue

**Files:**
- Create: `backend/src/__tests__/overdue.test.ts`

This suite requires the bootstrapped dev DB (see `AGENTS.md` — seeded users `dad@home.local`/`alice@home.local`, password `password123`).

- [ ] **Step 1: Write the integration test**

Create `backend/src/__tests__/overdue.test.ts`:

```ts
import request from 'supertest'
import { app } from '../app'

const BASE = '/api/overdue'
const ASSIGNMENTS_BASE = '/api/assignments'

let parentCookies: string[] = []
let childCookies: string[] = []
let cleanupIds: number[] = []

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

beforeAll(async () => {
  const parentRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'dad@home.local', password: 'password123' })
  const pc = parentRes.headers['set-cookie']
  parentCookies = Array.isArray(pc) ? pc : pc ? [pc] : []

  const childRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alice@home.local', password: 'password123' })
  const cc = childRes.headers['set-cookie']
  childCookies = Array.isArray(cc) ? cc : cc ? [cc] : []
})

afterAll(async () => {
  for (const id of cleanupIds) {
    try {
      await request(app).delete(`${ASSIGNMENTS_BASE}/${id}`).set('Cookie', parentCookies)
    } catch { /* ignore */ }
  }
})

describe('GET /api/overdue', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).get(BASE).set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('lists a past-due PENDING assignment for PARENT', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue List Test', points: 10, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    cleanupIds.push(created.body.data.id)

    const res = await request(app).get(BASE).set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    const rows = (res.body.data as Array<{ id: number; type: string; choreTemplateId: number }>)
      .filter((a) => a.type === 'REGULAR' && a.choreTemplateId === tpl.body.data.id)
    expect(rows.map((a) => a.id)).toContain(created.body.data.id)
  })
})

describe('POST /api/overdue/cancel', () => {
  it('cancels an overdue assignment with a penalty and returns CANCELLED', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue Cancel Test', points: 10, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    const id = created.body.data.id
    cleanupIds.push(id)

    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', parentCookies)
      .send({ id, type: 'REGULAR', penalty: 6 })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('CANCELLED')
    expect(res.body.data.penaltyPoints).toBe(6)
  })

  it('returns 404 for a non-existent chore', async () => {
    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', parentCookies)
      .send({ id: 999999, type: 'REGULAR', penalty: 5 })
    expect(res.status).toBe(404)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(`${BASE}/cancel`).set('Cookie', childCookies)
      .send({ id: 1, type: 'REGULAR', penalty: 5 })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/overdue/reschedule', () => {
  it('moves a REGULAR assignment to a new due date', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Overdue Reschedule Test', points: 5, category: 'testing' })
    const created = await request(app).post(ASSIGNMENTS_BASE).set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 3, dueDate: yesterday() })
    const id = created.body.data.id
    cleanupIds.push(id)

    const res = await request(app).post(`${BASE}/reschedule`).set('Cookie', parentCookies)
      .send({ id, dueDate: '2026-08-20' })
    expect(res.status).toBe(200)
    expect(res.body.data.dueDate).toContain('2026-08-20')
  })

  it('returns 400 with invalid due date', async () => {
    const res = await request(app).post(`${BASE}/reschedule`).set('Cookie', parentCookies)
      .send({ id: 1, dueDate: 'not-a-date' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
```

- [ ] **Step 2: Run the integration test**

Run (cwd `backend/`, DB must be bootstrapped): `DATABASE_URL="file:./dev.db" npx jest __tests__/overdue.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/overdue.test.ts
git commit -m "test: add /api/overdue integration coverage"
```

---

## Task 11: Frontend — overdue API module

**Files:**
- Create: `frontend/src/api/overdue.api.ts`

- [ ] **Step 1: Write the API module**

Create `frontend/src/api/overdue.api.ts`:

```ts
import { createApiClient } from '../lib/apiClient'

const api = createApiClient('/api/overdue')

export interface OverdueChore {
  id: number
  type: 'REGULAR' | 'RECURRING'
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING'
  template: {
    id: number
    title: string
    points: number
    category: string | null
  }
  assignedTo: {
    id: number
    name: string
    color: string
  }
}

export async function getOverdue(): Promise<OverdueChore[]> {
  const response = await api.get('/')
  return response.data.data
}

export async function cancelOverdue(
  id: number,
  type: 'REGULAR' | 'RECURRING',
  penalty: number
): Promise<OverdueChore & { penaltyPoints: number | null }> {
  const response = await api.post('/cancel', { id, type, penalty })
  return response.data.data
}

export async function rescheduleOverdue(id: number, dueDate: string): Promise<OverdueChore> {
  const response = await api.post('/reschedule', { id, dueDate })
  return response.data.data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/overdue.api.ts
git commit -m "feat: add overdue API client"
```

---

## Task 12: Frontend — useOverdue hook

**Files:**
- Create: `frontend/src/hooks/useOverdue.tsx`

- [ ] **Step 1: Write the hook**

Create `frontend/src/hooks/useOverdue.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as overdueApi from '../api/overdue.api'

export function useOverdue() {
  const queryClient = useQueryClient()

  const {
    data: overdue = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['overdue'],
    queryFn: overdueApi.getOverdue,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, type, penalty }: { id: number; type: 'REGULAR' | 'RECURRING'; penalty: number }) =>
      overdueApi.cancelOverdue(id, type, penalty),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      if ((data.penaltyPoints ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: ['points'] })
        queryClient.invalidateQueries({ queryKey: ['points', 'gamification'] })
      }
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, dueDate }: { id: number; dueDate: string }) =>
      overdueApi.rescheduleOverdue(id, dueDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })

  return {
    overdue,
    isLoading,
    error,
    cancelChore: (id: number, type: 'REGULAR' | 'RECURRING', penalty: number) =>
      cancelMutation.mutateAsync({ id, type, penalty }),
    isCancelling: cancelMutation.isPending,
    rescheduleChore: (id: number, dueDate: string) => rescheduleMutation.mutateAsync({ id, dueDate }),
    isRescheduling: rescheduleMutation.isPending,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useOverdue.tsx
git commit -m "feat: add useOverdue hook"
```

---

## Task 13: StatusBadge CANCELLED variant + status unions

**Files:**
- Modify: `frontend/src/components/StatusBadge.tsx`
- Modify: `frontend/src/api/assignments.api.ts`
- Modify: `frontend/src/api/recurring.api.ts`

- [ ] **Step 1: Update `StatusBadge`**

Replace `frontend/src/components/StatusBadge.tsx` with:

```tsx
interface StatusBadgeProps {
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_COMPLETE'
  overdue?: boolean
}

export function StatusBadge({ status, overdue }: StatusBadgeProps) {
  if (overdue && status === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-400">
        Overdue
      </span>
    )
  }

  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
        Pending
      </span>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded-full border border-zinc-500/20 bg-zinc-500/10 px-3 py-1 text-xs text-zinc-400">
        Cancelled
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
      Completed
    </span>
  )
}
```

- [ ] **Step 2: Extend the `assignments.api.ts` status union**

In `frontend/src/api/assignments.api.ts`, change:

```ts
  status: 'PENDING' | 'COMPLETED'
```

to:

```ts
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_COMPLETE'
```

- [ ] **Step 3: Extend the `recurring.api.ts` status union**

In `frontend/src/api/recurring.api.ts`, change:

```ts
  status: 'PENDING' | 'COMPLETED'
```

to:

```ts
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
```

- [ ] **Step 4: Typecheck**

Run (cwd `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatusBadge.tsx frontend/src/api/assignments.api.ts frontend/src/api/recurring.api.ts
git commit -m "feat: render CANCELLED status badge and extend status unions"
```

---

## Task 14: Frontend — overdue-days date helper

**Files:**
- Modify: `frontend/src/utils/dateFormat.ts`

- [ ] **Step 1: Add `daysOverdue`**

Append to `frontend/src/utils/dateFormat.ts`:

```ts
export function daysOverdue(dateStr: string): number {
  const dueStart = startOfDay(new Date(dateStr))
  const today = startOfDay(new Date())
  return Math.max(0, Math.round((today.getTime() - dueStart.getTime()) / (1000 * 60 * 60 * 24)))
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/dateFormat.ts
git commit -m "feat: add daysOverdue date helper"
```

---

## Task 15: Frontend — Overdue page

**Files:**
- Create: `frontend/src/pages/OverduePage.tsx`

- [ ] **Step 1: Write the page**

Create `frontend/src/pages/OverduePage.tsx`:

```tsx
import { useMemo, useState, useEffect } from 'react'
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { useOverdue } from '../hooks/useOverdue'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { daysOverdue } from '../utils/dateFormat'
import type { OverdueChore } from '../api/overdue.api'

function todayInputDate(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function OverduePage() {
  const { overdue, isLoading, error, cancelChore, isCancelling, rescheduleChore, isRescheduling } = useOverdue()

  const [cancelTarget, setCancelTarget] = useState<OverdueChore | null>(null)
  const [penalty, setPenalty] = useState('0')
  const [rescheduleTarget, setRescheduleTarget] = useState<OverdueChore | null>(null)
  const [newDueDate, setNewDueDate] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const sorted = useMemo(
    () => [...overdue].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [overdue]
  )

  function openCancel(chore: OverdueChore) {
    setPenalty(String(chore.template.points))
    setFormError(null)
    setCancelTarget(chore)
  }

  function openReschedule(chore: OverdueChore) {
    setNewDueDate(todayInputDate())
    setFormError(null)
    setRescheduleTarget(chore)
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setFormError(null)
    try {
      const value = Math.max(0, Math.floor(Number(penalty) || 0))
      await cancelChore(cancelTarget.id, cancelTarget.type, value)
      setCancelTarget(null)
      setSuccessMessage(value > 0 ? `Chore canceled, ${value} pts penalty applied.` : 'Chore canceled.')
    } catch {
      setFormError('Failed to cancel chore. Please try again.')
    }
  }

  async function handleReschedule() {
    if (!rescheduleTarget) return
    setFormError(null)
    try {
      await rescheduleChore(rescheduleTarget.id, newDueDate)
      setRescheduleTarget(null)
      setSuccessMessage('Due date updated.')
    } catch {
      setFormError('Failed to reschedule chore. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load overdue chores. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Overdue Chores" />

      {sorted.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing overdue" hint="All chores are on time. Nice!" />
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map(chore => (
            <Card
              key={`${chore.type}-${chore.id}`}
              className="flex flex-col gap-3 border-rose-500/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-bold text-zinc-100">{chore.template.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                  <span>{chore.assignedTo.name}</span>
                  <span className="font-bold text-rose-400">Overdue {daysOverdue(chore.dueDate)} days</span>
                  <span className="font-display font-bold text-accent">{chore.template.points} pts</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="danger" onClick={() => openCancel(chore)}>
                  <XCircle className="h-4 w-4" aria-hidden /> Cancel
                </Button>
                {chore.type === 'REGULAR' && (
                  <Button variant="secondary" onClick={() => openReschedule(chore)}>
                    <CalendarClock className="h-4 w-4" aria-hidden /> Reschedule
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={cancelTarget !== null} onClose={() => setCancelTarget(null)} title="Cancel overdue chore">
        {cancelTarget && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <p className="mb-1 text-sm text-zinc-300">
              Penalty for {cancelTarget.assignedTo.name} (0 to waive):
            </p>
            <input
              type="number"
              min="0"
              max="100000"
              value={penalty}
              onChange={e => setPenalty(e.target.value)}
              className="input"
              aria-label="Penalty points"
            />
            <p className="mt-1 text-sm text-zinc-500">Default is the chore&apos;s point value.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" onClick={handleCancel} loading={isCancelling}>
                Cancel Chore
              </Button>
              <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={isCancelling}>
                Keep Chore
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rescheduleTarget !== null} onClose={() => setRescheduleTarget(null)} title="Reschedule overdue chore">
        {rescheduleTarget && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <label htmlFor="newDueDate" className="mb-1 block text-sm font-normal text-zinc-300">
              New due date
            </label>
            <input
              id="newDueDate"
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="input"
              required
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleReschedule} loading={isRescheduling}>
                Save Date
              </Button>
              <Button variant="secondary" onClick={() => setRescheduleTarget(null)} disabled={isRescheduling}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
}
```

- [ ] **Step 2: Typecheck**

Run (cwd `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/OverduePage.tsx
git commit -m "feat: add Overdue chores page"
```

---

## Task 16: Route + navigation links

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/TopNav.tsx`
- Modify: `frontend/src/components/BottomTabBar.tsx`

- [ ] **Step 1: Add the `/overdue` route**

In `frontend/src/App.tsx`, add the import:

```tsx
import { OverduePage } from './pages/OverduePage'
```

and add the route after the `/assignments` route:

```tsx
        <Route path="/overdue" element={
          <ProtectedRoute requiredRole="PARENT">
            <OverduePage />
          </ProtectedRoute>
        } />
```

- [ ] **Step 2: Add the nav link to `TopNav`**

In `frontend/src/components/TopNav.tsx`, add `{ to: '/overdue', label: 'Overdue' }` to the `MANAGE_LINKS` array (as the first entry):

```tsx
export const MANAGE_LINKS = [
  { to: '/overdue', label: 'Overdue' },
  { to: '/templates', label: 'Templates' },
  { to: '/recurring-chores', label: 'Recurring' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/users', label: 'Users' },
]
```

`BottomTabBar.tsx` imports `MANAGE_LINKS` from `TopNav`, so the mobile Manage sheet picks the new link up automatically — no change needed there.

- [ ] **Step 3: Typecheck**

Run (cwd `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/TopNav.tsx
git commit -m "feat: add /overdue route and manage-nav link"
```

---

## Task 17: Frontend — Overdue page tests

**Files:**
- Create: `frontend/src/__tests__/OverduePage.test.tsx`

- [ ] **Step 1: Write the test file**

Create `frontend/src/__tests__/OverduePage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OverduePage } from '../pages/OverduePage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const mockCancel = vi.fn()
const mockReschedule = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' },
    isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
  }),
}))

vi.mock('../hooks/useOverdue', () => ({ useOverdue: vi.fn() }))
vi.mock('../hooks/useGames', () => ({ useGames: vi.fn().mockReturnValue({ data: { pong: { unlocked: true } } }) }))

import { useOverdue } from '../hooks/useOverdue'

const overdueChore = {
  id: 1, type: 'REGULAR' as const, choreTemplateId: 1, assignedToId: 3,
  dueDate: '2026-06-14', status: 'PENDING' as const,
  template: { id: 1, title: 'Wash Dishes', points: 10, category: 'kitchen' },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981' },
}

const recurringChore = {
  ...overdueChore, id: 7, type: 'RECURRING' as const, dueDate: '2026-06-13',
  template: { id: 2, title: 'Sweep Floor', points: 5, category: null },
}

function mockOverdueState(overrides: Record<string, unknown> = {}) {
  ;(useOverdue as ReturnType<typeof vi.fn>).mockReturnValue({
    overdue: [], isLoading: false, error: null,
    cancelChore: mockCancel, isCancelling: false,
    rescheduleChore: mockReschedule, isRescheduling: false,
    ...overrides,
  })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OverduePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OverduePage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00'), toFake: ['Date'] })
    vi.clearAllMocks()
    mockOverdueState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty state when nothing is overdue', () => {
    renderPage()
    expect(screen.getByText('Nothing overdue')).toBeInTheDocument()
  })

  it('renders loading skeleton', () => {
    mockOverdueState({ isLoading: true })
    const { container } = renderPage()
    expect(container.querySelector('.animate-\\[shimmer_1\\.5s_infinite\\]')).toBeInTheDocument()
  })

  it('renders error state with retry button', () => {
    mockOverdueState({ error: new Error('Network error') })
    renderPage()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders overdue chores with title, assignee, and overdue days', () => {
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    expect(screen.getByText('Wash Dishes')).toBeInTheDocument()
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Overdue 1 days')).toBeInTheDocument()
  })

  it('opens the cancel modal with penalty defaulted to the chore points', () => {
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByLabelText('Penalty points')).toHaveValue(10)
  })

  it('cancels with penalty and shows a toast', async () => {
    mockCancel.mockResolvedValue({ ...overdueChore, penaltyPoints: 10 })
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('Cancel Chore'))

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(1, 'REGULAR', 10))
    expect(screen.getByText('Chore canceled, 10 pts penalty applied.')).toBeInTheDocument()
  })

  it('shows Reschedule only for REGULAR chores', () => {
    mockOverdueState({ overdue: [overdueChore, recurringChore] })
    renderPage()
    expect(screen.getAllByText('Reschedule')).toHaveLength(1)
  })

  it('reschedules a REGULAR chore and shows a toast', async () => {
    mockReschedule.mockResolvedValue({ ...overdueChore, dueDate: '2026-06-20' })
    mockOverdueState({ overdue: [overdueChore] })
    renderPage()
    fireEvent.click(screen.getByText('Reschedule'))
    fireEvent.click(screen.getByText('Save Date'))

    await waitFor(() => expect(mockReschedule).toHaveBeenCalledWith(1, '2026-06-15'))
    expect(screen.getByText('Due date updated.')).toBeInTheDocument()
  })
})
```

Note: the `Reschedule` default date uses the fake-timer date `2026-06-15`, and the overdue-day count of `overdueChore` (due `2026-06-14`) against `2026-06-15` is `1` day.

- [ ] **Step 2: Run the test**

Run (cwd `frontend/`): `npx vitest run src/__tests__/OverduePage.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/OverduePage.test.tsx
git commit -m "test: add Overdue page tests"
```

---

## Task 18: Frontend — StatusBadge and useOverdue tests

**Files:**
- Create: `frontend/src/__tests__/StatusBadge.test.tsx`
- Create: `frontend/src/__tests__/useOverdue.test.tsx`

- [ ] **Step 1: Write the StatusBadge test**

Create `frontend/src/__tests__/StatusBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('renders Pending for PENDING', () => {
    render(<StatusBadge status="PENDING" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Completed for COMPLETED', () => {
    render(<StatusBadge status="COMPLETED" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders Cancelled for CANCELLED', () => {
    render(<StatusBadge status="CANCELLED" />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('renders Overdue when overdue flag is set on a PENDING chore', () => {
    render(<StatusBadge status="PENDING" overdue />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write the useOverdue test**

Create `frontend/src/__tests__/useOverdue.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOverdue } from '../hooks/useOverdue'

vi.mock('../api/overdue.api', () => ({
  getOverdue: vi.fn(),
  cancelOverdue: vi.fn(),
  rescheduleOverdue: vi.fn(),
}))

import * as overdueApi from '../api/overdue.api'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useOverdue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    ;(overdueApi.getOverdue as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  it('fetches the overdue list', async () => {
    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(overdueApi.getOverdue).toHaveBeenCalled()
    expect(result.current.overdue).toEqual([])
  })

  it('invalidates overdue and points when a cancel applies a penalty', async () => {
    ;(overdueApi.cancelOverdue as ReturnType<typeof vi.fn>).mockResolvedValue({ penaltyPoints: 5 })

    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.cancelChore(1, 'REGULAR', 5)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['overdue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['points'] })
  })

  it('does not invalidate points when the cancel penalty is 0', async () => {
    ;(overdueApi.cancelOverdue as ReturnType<typeof vi.fn>).mockResolvedValue({ penaltyPoints: null })

    const { result } = renderHook(() => useOverdue(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      await result.current.cancelChore(1, 'REGULAR', 0)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['overdue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assignments'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['points'] })
  })
})
```

- [ ] **Step 3: Run both tests**

Run (cwd `frontend/`): `npx vitest run src/__tests__/StatusBadge.test.tsx src/__tests__/useOverdue.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/__tests__/StatusBadge.test.tsx frontend/src/__tests__/useOverdue.test.tsx
git commit -m "test: add StatusBadge and useOverdue tests"
```

---

## Task 19: E2E spec

**Files:**
- Create: `e2e/overdue.spec.ts`

Requires the frontend dev server (`:5173`) and backend (`:3010`) running, with a bootstrapped seeded DB — the standard e2e setup.

- [ ] **Step 1: Write the spec**

Create `e2e/overdue.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { goToManageLink } from './helpers/nav'

const DAD = { email: 'dad@home.local', password: 'password123' }

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

test.describe('Overdue chore management', () => {
  test('parent can cancel an overdue chore with a penalty', async ({ page }) => {
    await login(page, DAD)

    await goToManageLink(page, 'Assignments')
    await page.getByText('Assign Chore').click()
    await page.locator('#template').selectOption({ index: 1 })
    await page.locator('#assignTo').selectOption({ index: 1 })
    await page.locator('#dueDate').fill(yesterday())
    await page.getByText('Save Assignment').click()
    await expect(page.getByText('Assignment created!')).toBeVisible()

    await goToManageLink(page, 'Overdue')
    await expect(page.getByText('Wash Dishes')).toBeVisible()
    await page.getByText('Cancel', { exact: true }).click()
    await page.getByLabel('Penalty points').fill('5')
    await page.getByText('Cancel Chore').click()
    await expect(page.getByText('Chore canceled, 5 pts penalty applied.')).toBeVisible()
  })
})
```

Note: the spec selects the first non-placeholder template and child from the seeded DB (seeded templates exist). Adjust the template name in the assertion if the seeded template title differs from `Wash Dishes` — check `backend/prisma/seed.ts` when implementing.

- [ ] **Step 2: Run the e2e spec**

Run (from the repo root, dev servers up): `npx playwright test e2e/overdue.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/overdue.spec.ts
git commit -m "test: add overdue management e2e spec"
```

---

## Task 20: Env + operations docs

**Files:**
- Modify: `.env.example`
- Modify: `docs/OPERATIONS.md`

- [ ] **Step 1: Add the env vars to `.env.example`**

In `.env.example`, inside the `# ===========================================\n# NTFY NOTIFICATION SETTINGS` section, after the `NTFY_BASE_URL=` line, add:

```dotenv
# Timezone (IANA name) in which "8am" overdue notifications are computed.
# CET = Europe/Oslo (also covers CEST automatically). The overdue list itself
# uses UTC date boundaries; only the notification hour uses this timezone.
NOTIFY_TIMEZONE=Europe/Oslo

# Local 24-hour time (HH:MM) after which overdue chore notifications fire.
# Default 08:00 — the morning after a chore's due date.
NOTIFY_OVERDUE_HOUR=08:00
```

- [ ] **Step 2: Document the vars in `docs/OPERATIONS.md`**

In `docs/OPERATIONS.md`'s Environment Variables table, add two rows after the `NTFY_BASE_URL` row:

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `NOTIFY_TIMEZONE` | Optional | `Europe/Oslo` | IANA timezone (CET/CEST) used to compute the 8am overdue-notification hour and "today" for overdue detection. The overdue list itself uses UTC date boundaries; only the notification timing uses this timezone. |
| `NOTIFY_OVERDUE_HOUR` | Optional | `08:00` | Local 24-hour `HH:MM` at/after which the scheduled overdue sweep fires its ntfy pushes (the morning after a chore's due date). |

Also add a short paragraph to the `## Notification Setup` section:

> Overdue notifications run on a 5-minute in-process sweep (`notifyOverdue`). A PENDING chore whose due date is before today in `NOTIFY_TIMEZONE` is pushed once — to the assigned child and all parents — at the first sweep that runs at/after `NOTIFY_OVERDUE_HOUR` (default 08:00). If the backend was down at 08:00, the push fires on the first sweep after it returns; the `overdueNotifiedAt` column dedups so a chore is never notified twice. Leaving `NTFY_BASE_URL` unset disables this sweep's sends entirely (like all other notifications).

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/OPERATIONS.md
git commit -m "docs: document overdue notification env vars"
```

---

## Task 21: Version bump + changelog + project memory

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `.env.example`
- Modify: `CHANGELOG.md`
- Modify: `docs/project_notes/issues.md`

- [ ] **Step 1: Bump both package versions**

In `backend/package.json` and `frontend/package.json`, change `"version": "3.3.4"` to `"version": "3.3.5"`.

In `.env.example`, change `APP_VERSION=3.3.4` to `APP_VERSION=3.3.5`. (The live `.env` is gitignored — update it locally too, or run `./docker-compose.sh` which syncs it from `backend/package.json`.)

- [ ] **Step 2: Add a CHANGELOG entry**

Add at the top of `CHANGELOG.md` (above the `## [3.3.4]` entry):

```markdown
## [3.3.5] - 2026-08-02

### Added
- Overdue Chores page (parent-only) listing every overdue one-off and recurring chore.
- Cancel an overdue chore with an optional points penalty (defaulted to the chore's point value, 0 to waive), recorded as a `PENALTY` ledger entry and a `CANCELLED` status with the cancellation preserved in history.
- Reschedule a one-off overdue chore's due date (recurring occurrences are not reschedulable).
- Overdue push notifications to the assigned child and all parents, delivered by a 5-minute in-process sweep at/after 08:00 in `NOTIFY_TIMEZONE` (default Europe/Oslo) on the day after the due date, deduped per chore.
```

- [ ] **Step 3: Log the work in project memory**

Append to `docs/project_notes/issues.md`:

```
- 2026-08-02: Overdue chore management (v3.3.5) — parent-only /overdue page, CANCELLED status + penaltyPoints/cancelledAt/overdueNotifiedAt columns, PENALTY PointLog type, 5-min overdue notification sweep (NOTIFY_TIMEZONE / NOTIFY_OVERDUE_HOUR env), spec in docs/superpowers/specs/2026-08-02-overdue-chores-design.md.
```

- [ ] **Step 4: Run the full backend and frontend test suites**

Backend (cwd `backend/`, DB bootstrapped):
```bash
DATABASE_URL="file:./dev.db" npm test
```
Expected: PASS.

Frontend (cwd `frontend/`):
```bash
npm test
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json frontend/package.json .env.example CHANGELOG.md docs/project_notes/issues.md
git commit -m "chore: bump version to 3.3.5 with changelog"
```

---

## Self-Review

**Spec coverage:**
- Overdue list (both types) → Tasks 4, 6, 10, 15.
- Cancel + penalty (per-action, default chore points, 0 to waive) → Tasks 4, 5, 6, 15.
- Soft cancel / `CANCELLED` status + history → Tasks 1, 9, 13.
- Reschedule (REGULAR only) → Tasks 4, 6, 15.
- 8am-next-day notification, scheduled job, child + parents, `NOTIFY_TIMEZONE`/`NOTIFY_OVERDUE_HOUR` → Tasks 2, 3, 7, 8, 20.
- Dedup via `overdueNotifiedAt` → Tasks 1, 7.
- Completion guards → Task 9.
- Docs/env/version bump → Tasks 20, 21.

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands.

**Type consistency:** `notifyOverdue(now = new Date())` matches its call in `server.ts` (`runOverdueSweep` awaits `notifyOverdue()` with no args) and its tests (fixed `now`). `cancelChore(id, type, penalty)` signature matches across `overdue.api.ts`, `useOverdue.tsx`, `OverduePage.tsx`, and the tests. `daysOverdue` is used only in `OverduePage`. `getOverdueConfig` is imported by `notification.service.ts` and consumed by `overdue.notification.service.ts`.
