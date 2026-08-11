# Parent Dashboard + Nudge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the parent's empty `/` dashboard with a compact Option-D layout (status strip, "Needs action" list, leaderboard, latest win) and add a parent-initiated Nudge push to a child's pending chore.

**Architecture:** Parents get a new `ParentDashboard` component rendered from `DashboardPage` by role branch. It consumes existing endpoints (`/api/overdue`, `/api/assignments`, `/api/points/leaderboard`) plus two new parent-only endpoints: `POST /api/assignments/nudge` (sends an ntfy push, 15-min per-chore cooldown via a new `lastNudgedAt` column) and `GET /api/points/weekly` (aggregates `EARNED` PointLogs since Monday). The Nudge service mirrors the established `overdue.service` `{ id, type }` pattern.

**Tech Stack:** Express + Prisma (SQLite) + Zod backend; React + TanStack Query + Tailwind frontend; Vitest + jest + supertest for tests.

## Global Constraints

- `APP_VERSION` must be bumped (see Task 11); current version is `3.4.1`.
- Every `frontend/src/api/*.ts` module must build its axios instance via `createApiClient()` (`frontend/src/lib/apiClient.ts`) — never `axios.create()` directly.
- Frontend→backend param mapping happens only in `frontend/src/api/` files, never in components/hooks.
- `PointLog.type` is a plain string; completion logs use `type: 'EARNED'` (verified `assignment.service.ts:172`, `recurring.service.ts:140`). `ADJUSTMENT`/`PENALTY`/`BONUS` also exist — weekly points must filter to `'EARNED'` only.
- Nudge push sends are fire-and-forget (`void sendNtfy(...)`); `sendNtfy` swallows failures and returns `false` (no throw) — a nudge endpoint must succeed even when ntfy is not configured, as long as the child has a topic set.
- Backend tests: run from `backend/` (`npm test`). Unit tests use inline `jest.mock('../../config/prisma', ...)`; integration tests hit the real app via `supertest` against seeded users (`dad@home.local`/`alice@home.local`, password `password123`). Seed order: dad=1, mom=2, alice=3, bob=4.
- Frontend tests: `npm test` (`vitest run`) from `frontend/`.
- `docs/project_notes/issues.md` must be updated with completed work (Task 11).
- No code comments unless they explain non-obvious reasoning already present in the codebase style.

---

### Task 1: Schema — add `lastNudgedAt` to both chore models

**Files:**
- Modify: `backend/prisma/schema.prisma` (in `ChoreAssignment` ~line 62 and `RecurringOccurrence` ~line 121)

**Interfaces:**
- Produces: `lastNudgedAt DateTime?` on both `ChoreAssignment` and `RecurringOccurrence` — consumed by Task 3's `nudge` service.

- [ ] **Step 1: Add the column to `ChoreAssignment`**

In `model ChoreAssignment`, add `lastNudgedAt DateTime?` right after `penaltyPoints Int?` (line 61):

```prisma
  penaltyPoints   Int?
  lastNudgedAt    DateTime?
  completedAt     DateTime?
```

- [ ] **Step 2: Add the column to `RecurringOccurrence`**

In `model RecurringOccurrence`, add `lastNudgedAt DateTime?` right after `penaltyPoints Int?` (line 119):

```prisma
  penaltyPoints    Int?
  lastNudgedAt     DateTime?
  pointsAwarded    Int?
```

- [ ] **Step 3: Push the schema to the dev DB**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx prisma db push
```

Expected: the Prisma client regenerates and `lastNudgedAt` is available on both models. (This regenerates the client — `node_modules/.prisma` — so no code change is needed for the new field to type-check.)

- [ ] **Step 4: Smoke-run the backend suite**

Run from `backend/`:

```bash
DATABASE_URL="file:./dev.db" npm test
```

Expected: all existing tests still pass (schema-only change).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(backend): add lastNudgedAt cooldown column to chore models"
```

(`backend/prisma/dev.db` is gitignored — only the schema file is staged.)

---

### Task 2: `nudgeBody` notification formatter

**Files:**
- Modify: `backend/src/services/notification.formatters.ts`
- Test: `backend/src/__tests__/services/notification.formatters.test.ts`

**Interfaces:**
- Produces: `nudgeBody(a: { id: number; template: { title: string; points: number }; dueDate: Date }, parentName: string) => { title: string; body: string; priority: 3; tags: string[]; click: string }` — consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `backend/src/__tests__/services/notification.formatters.test.ts`:

```ts
describe('nudgeBody', () => {
  it('builds a gentle-reminder push with the parent name', () => {
    const { nudgeBody } = require('../../services/notification.formatters')
    const out = nudgeBody(
      { id: 9, template: { title: 'Load dishwasher', points: 20 }, dueDate: new Date('2026-08-11') },
      'Dad'
    )
    expect(out).toEqual({
      title: 'Chore-Ganizer',
      body: 'Gentle reminder 👀 "Load dishwasher" is waiting · from Dad',
      priority: 3,
      tags: ['bell', 'eyes'],
      click: '/chores/9',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/notification.formatters.test.ts -t nudgeBody
```

Expected: FAIL — `nudgeBody is not a function`.

- [ ] **Step 3: Implement `nudgeBody`**

Add to `backend/src/services/notification.formatters.ts` (after `overdueBody`):

```ts
export function nudgeBody(a: AssignmentInfo, parentName: string) {
  return {
    title: 'Chore-Ganizer',
    body: `Gentle reminder 👀 "${a.template.title}" is waiting · from ${parentName}`,
    priority: 3 as const,
    tags: ['bell', 'eyes'],
    click: `/chores/${a.id}`,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/notification.formatters.test.ts -t nudgeBody
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/notification.formatters.ts backend/src/__tests__/services/notification.formatters.test.ts
git commit -m "feat(backend): add nudgeBody notification formatter"
```

---

### Task 3: `nudge` service with 15-minute cooldown

**Files:**
- Create: `backend/src/services/nudge.service.ts`
- Test: `backend/src/__tests__/services/nudge.service.test.ts`

**Interfaces:**
- Consumes: `nudgeBody` (Task 2), `sendNtfy` from `./notification.service`, `AppError` from `../middleware/errorHandler`, `prisma` from `../config/prisma`.
- Produces: `nudge({ id: number; type: 'REGULAR' | 'RECURRING'; parentId: number }) => Promise<{ id: number; type: 'REGULAR' | 'RECURRING' }>` — consumed by Task 4's route.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/__tests__/services/nudge.service.test.ts`:

```ts
jest.mock('../../config/prisma', () => ({
  prisma: {
    choreAssignment: { findUnique: jest.fn(), update: jest.fn() },
    recurringOccurrence: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}))

jest.mock('../../services/notification.service', () => ({
  sendNtfy: jest.fn().mockResolvedValue(true),
}))

const { prisma } = require('../../config/prisma')
const { sendNtfy } = require('../../services/notification.service')
const { AppError } = require('../../middleware/errorHandler')

let nudgeService: typeof import('../../services/nudge.service')

const pendingAssignment = {
  id: 5,
  status: 'PENDING',
  dueDate: new Date('2026-08-11'),
  lastNudgedAt: null,
  template: { id: 3, title: 'Load dishwasher', points: 20 },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
}

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../../services/nudge.service')]
  nudgeService = require('../../services/nudge.service')
})

describe('nudgeService.nudge', () => {
  it('sends a push to the assignee and records lastNudgedAt (REGULAR)', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(pendingAssignment)
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.update.mockResolvedValue({ id: 5 })

    const result = await nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })

    expect(sendNtfy).toHaveBeenCalledWith(
      'alice-topic',
      'Chore-Ganizer',
      'Gentle reminder 👀 "Load dishwasher" is waiting · from Dad',
      { priority: 3, tags: ['bell', 'eyes'], click: '/chores/5' }
    )
    expect(prisma.choreAssignment.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { lastNudgedAt: expect.any(Date) },
    })
    expect(result).toEqual({ id: 5, type: 'REGULAR' })
  })

  it('handles RECURRING occurrences', async () => {
    prisma.recurringOccurrence.findUnique.mockResolvedValue({
      ...pendingAssignment,
      id: 9,
      template: { id: 4, title: 'Make Bed', points: 5 },
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Mom' })
    prisma.recurringOccurrence.update.mockResolvedValue({ id: 9 })

    const result = await nudgeService.nudge({ id: 9, type: 'RECURRING', parentId: 2 })

    expect(sendNtfy).toHaveBeenCalledWith(
      'alice-topic',
      'Chore-Ganizer',
      'Gentle reminder 👀 "Make Bed" is waiting · from Mom',
      expect.anything()
    )
    expect(prisma.recurringOccurrence.update).toHaveBeenCalled()
    expect(result).toEqual({ id: 9, type: 'RECURRING' })
  })

  it('returns 404 when the chore does not exist', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue(null)
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 999, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 409 when the chore is not PENDING', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({ ...pendingAssignment, status: 'COMPLETED' })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('returns 400 when the assignee has no ntfyTopic', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 400 })
    expect(sendNtfy).not.toHaveBeenCalled()
  })

  it('returns 429 when nudged within the last 15 minutes', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - 5 * 60 * 1000),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).rejects.toMatchObject({ statusCode: 429 })
    expect(prisma.choreAssignment.update).not.toHaveBeenCalled()
  })

  it('allows a nudge once 15 minutes have elapsed', async () => {
    prisma.choreAssignment.findUnique.mockResolvedValue({
      ...pendingAssignment,
      lastNudgedAt: new Date(Date.now() - 16 * 60 * 1000),
    })
    prisma.user.findUnique.mockResolvedValue({ name: 'Dad' })
    prisma.choreAssignment.update.mockResolvedValue({ id: 5 })

    await expect(nudgeService.nudge({ id: 5, type: 'REGULAR', parentId: 1 })).resolves.toEqual({ id: 5, type: 'REGULAR' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/nudge.service.test.ts
```

Expected: FAIL — cannot find module `../../services/nudge.service`.

- [ ] **Step 3: Implement `nudge.service.ts`**

Create `backend/src/services/nudge.service.ts`:

```ts
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'
import { sendNtfy } from './notification.service'
import { nudgeBody } from './notification.formatters'

const NUDGE_COOLDOWN_MS = 15 * 60 * 1000

type Nudgeable = {
  id: number
  status: string
  dueDate: Date
  lastNudgedAt: Date | null
  template: { id: number; title: string; points: number }
  assignedTo: { ntfyTopic: string | null }
}

async function loadNudgeable(id: number, type: 'REGULAR' | 'RECURRING'): Promise<Nudgeable | null> {
  if (type === 'REGULAR') {
    const a = await prisma.choreAssignment.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, title: true, points: true } },
        assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
      },
    })
    if (!a) return null
    return {
      id: a.id,
      status: a.status,
      dueDate: a.dueDate,
      lastNudgedAt: a.lastNudgedAt,
      template: a.template,
      assignedTo: a.assignedTo,
    }
  }
  const o = await prisma.recurringOccurrence.findUnique({
    where: { id },
    include: {
      chore: { include: { template: { select: { id: true, title: true, points: true } } } },
      assignedTo: { select: { id: true, name: true, color: true, ntfyTopic: true } },
    },
  })
  if (!o || !o.chore) return null
  return {
    id: o.id,
    status: o.status,
    dueDate: o.dueDate,
    lastNudgedAt: o.lastNudgedAt,
    template: o.chore.template,
    assignedTo: o.assignedTo,
  }
}

export async function nudge({ id, type, parentId }: { id: number; type: 'REGULAR' | 'RECURRING'; parentId: number }) {
  const [row, parent] = await Promise.all([
    loadNudgeable(id, type),
    prisma.user.findUnique({ where: { id: parentId }, select: { name: true } }),
  ])

  if (!row) throw new AppError('Chore not found', 404)
  if (row.status !== 'PENDING') throw new AppError('Only pending chores can be nudged', 409)
  if (!row.assignedTo.ntfyTopic) throw new AppError('This child has not enabled push notifications', 400)

  const elapsed = row.lastNudgedAt ? Date.now() - row.lastNudgedAt.getTime() : Infinity
  if (elapsed < NUDGE_COOLDOWN_MS) {
    const minutes = Math.ceil((NUDGE_COOLDOWN_MS - elapsed) / 60000)
    throw new AppError(`You already nudged this chore. Try again in ${minutes} min.`, 429)
  }

  const updated = await (type === 'REGULAR'
    ? prisma.choreAssignment.update({ where: { id }, data: { lastNudgedAt: new Date() } })
    : prisma.recurringOccurrence.update({ where: { id }, data: { lastNudgedAt: new Date() } }))

  const { title, body, priority, tags, click } = nudgeBody(
    { id, template: row.template, dueDate: row.dueDate },
    parent?.name ?? 'your parent'
  )
  void sendNtfy(row.assignedTo.ntfyTopic, title, body, { priority, tags, click })

  return { id: updated.id, type }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/nudge.service.test.ts
```

Expected: PASS (all 7).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/nudge.service.ts backend/src/__tests__/services/nudge.service.test.ts
git commit -m "feat(backend): nudge service with 15-minute cooldown"
```

---

### Task 4: `nudgeSchema` + `POST /api/assignments/nudge` route

**Files:**
- Modify: `backend/src/schemas/assignment.schema.ts`
- Modify: `backend/src/routes/assignments.routes.ts`
- Test: `backend/src/__tests__/assignments.test.ts`

**Interfaces:**
- Consumes: `nudge` service (Task 3).
- Produces: `POST /api/assignments/nudge` (parent-only), body `{ id: number; type: 'REGULAR' | 'RECURRING' }`, validated by `nudgeSchema`.

- [ ] **Step 1: Add `nudgeSchema`**

Append to `backend/src/schemas/assignment.schema.ts`:

```ts
export const nudgeSchema = z.object({
  id: z.number().int().positive('Chore ID is required'),
  type: z.enum(['REGULAR', 'RECURRING']),
})
```

- [ ] **Step 2: Write the failing integration tests**

Append these `describe` blocks to `backend/src/__tests__/assignments.test.ts` (read the top of that file first — it already defines `parentCookies`, `childCookies`, and `cleanupIds`):

```ts
describe('POST /api/assignments/nudge', () => {
  const NUDGE_BASE = '/api/assignments/nudge'
  const TOPIC_EMAIL = 'alice@home.local'
  const NO_TOPIC_EMAIL = 'bob@home.local'
  let topicUserId: number | null = null
  let choreId: number | null = null

  beforeAll(async () => {
    const users = await request(app).get('/api/users').set('Cookie', parentCookies)
    const alice = users.body.data.find((u: { email: string }) => u.email === TOPIC_EMAIL)
    topicUserId = alice.id
    await request(app)
      .put(`/api/users/${alice.id}/ntfy-topic`)
      .set('Cookie', parentCookies)
      .send({ ntfyTopic: 'test-nudge-topic' })

    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Nudge Test', points: 10, category: 'testing' })
    const created = await request(app).post('/api/assignments').set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: alice.id, dueDate: '2099-01-01' })
    choreId = created.body.data.id
    cleanupIds.push(choreId)
  })

  afterAll(async () => {
    if (topicUserId !== null) {
      await request(app)
        .put(`/api/users/${topicUserId}/ntfy-topic`)
        .set('Cookie', parentCookies)
        .send({ ntfyTopic: '' })
    }
  })

  it('returns 401 without authentication', async () => {
    const res = await request(app).post(NUDGE_BASE).send({ id: choreId, type: 'REGULAR' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).post(NUDGE_BASE).set('Cookie', childCookies)
      .send({ id: choreId, type: 'REGULAR' })
    expect(res.status).toBe(403)
  })

  it('returns 400 when the assignee has no ntfyTopic', async () => {
    const tpl = await request(app).post('/api/templates').set('Cookie', parentCookies)
      .send({ title: 'Nudge No Topic', points: 10, category: 'testing' })
    const created = await request(app).post('/api/assignments').set('Cookie', parentCookies)
      .send({ choreTemplateId: tpl.body.data.id, assignedToId: 4, dueDate: '2099-01-01' })
    cleanupIds.push(created.body.data.id)

    const res = await request(app).post(NUDGE_BASE).set('Cookie', parentCookies)
      .send({ id: created.body.data.id, type: 'REGULAR' })
    expect(res.status).toBe(400)
  })

  it('nudges a pending chore assigned to a child with a topic', async () => {
    const res = await request(app).post(NUDGE_BASE).set('Cookie', parentCookies)
      .send({ id: choreId, type: 'REGULAR' })
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(choreId)
  })

  it('returns 429 when nudged again within the cooldown', async () => {
    const res = await request(app).post(NUDGE_BASE).set('Cookie', parentCookies)
      .send({ id: choreId, type: 'REGULAR' })
    expect(res.status).toBe(429)
  })

  it('returns 404 for a non-existent chore', async () => {
    const res = await request(app).post(NUDGE_BASE).set('Cookie', parentCookies)
      .send({ id: 999999, type: 'REGULAR' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when type is missing', async () => {
    const res = await request(app).post(NUDGE_BASE).set('Cookie', parentCookies)
      .send({ id: choreId })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
```

> Note: bob is user id 4 (seed order). The `no-topic` test uses `assignedToId: 4` and expects 400 because bob has no `ntfyTopic`. If bob already has a topic from another test in the same run, this test would return 200 — keep the file's other tests from mutating bob's topic, and if that proves fragile, set `assignedToId` to a freshly created CHILD instead (see Task 5's pattern).

- [ ] **Step 3: Run the tests to verify they fail**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/assignments.test.ts -t nudge
```

Expected: FAIL — `Cannot POST /api/assignments/nudge` (404).

- [ ] **Step 4: Wire the route**

In `backend/src/routes/assignments.routes.ts`:
1. Add imports:
```ts
import * as nudgeService from '../services/nudge.service'
import { nudgeSchema } from '../schemas/assignment.schema'
```
2. Add the route (place it after the `GET /` handler, before `POST /`):
```ts
router.post('/nudge', authenticate, authorize('PARENT'), validate(nudgeSchema), async (req, res, next) => {
  try {
    const { id, type } = req.body
    const result = await nudgeService.nudge({ id, type, parentId: req.session.userId! })
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Run the tests to verify they pass**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/assignments.test.ts -t nudge
```

Expected: PASS.

- [ ] **Step 6: Run the full backend suite**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npm test
```

Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/schemas/assignment.schema.ts backend/src/routes/assignments.routes.ts backend/src/__tests__/assignments.test.ts
git commit -m "feat(backend): POST /api/assignments/nudge endpoint"
```

---

### Task 5: `getWeeklyPoints` service + `GET /api/points/weekly` route

**Files:**
- Modify: `backend/src/services/points.service.ts`
- Modify: `backend/src/services/points.service.ts` import block
- Modify: `backend/src/routes/points.routes.ts`
- Test: `backend/src/__tests__/services/points.service.test.ts`
- Test: `backend/src/__tests__/points.test.ts`

**Interfaces:**
- Consumes: `startOfWeekUTC` from `../services/gamification.service`.
- Produces: `getWeeklyPoints(): Promise<{ user: { id: number; name: string; color: string; role: string }; points: number }[]>` sorted by `points` desc; children with no weekly points included as `0`.

- [ ] **Step 1: Write the failing unit tests**

Append this `describe` to `backend/src/__tests__/services/points.service.test.ts`:

```ts
describe('pointsService.getWeeklyPoints', () => {
  it('aggregates EARNED logs since Monday for each child, sorted desc', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' },
      { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' },
    ])
    prisma.pointLog.groupBy.mockResolvedValue([
      { userId: 2, _sum: { amount: 40 } },
      { userId: 3, _sum: { amount: 15 } },
    ])

    const result = await pointsService.getWeeklyPoints()

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'CHILD' },
      select: { id: true, name: true, color: true, role: true },
    })
    expect(prisma.pointLog.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: expect.objectContaining({ type: 'EARNED' }),
      _sum: { amount: true },
    })
    expect(result).toEqual([
      { user: { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' }, points: 40 },
      { user: { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' }, points: 15 },
    ])
  })

  it('includes children with no weekly points as 0 and excludes parents', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' },
      { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' },
    ])
    prisma.pointLog.groupBy.mockResolvedValue([{ userId: 2, _sum: { amount: 10 } }])

    const result = await pointsService.getWeeklyPoints()

    expect(result).toEqual([
      { user: { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' }, points: 10 },
      { user: { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' }, points: 0 },
    ])
  })
})
```

> Note: `pointsService` is re-`require`d fresh in that file's `beforeEach`, so the new function is picked up automatically. The mocked `prisma` already has `pointLog.groupBy` and `user.findMany`.

- [ ] **Step 2: Run the tests to verify they fail**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/points.service.test.ts -t getWeeklyPoints
```

Expected: FAIL — `pointsService.getWeeklyPoints is not a function`.

- [ ] **Step 3: Implement `getWeeklyPoints`**

In `backend/src/services/points.service.ts`:
1. Add the import at the top:
```ts
import { startOfWeekUTC } from './gamification.service'
```
2. Add the function after `getLeaderboard` (line 92):
```ts
export async function getWeeklyPoints() {
  const [users, sums] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CHILD' },
      select: { id: true, name: true, color: true, role: true },
    }),
    prisma.pointLog.groupBy({
      by: ['userId'],
      where: { type: 'EARNED', createdAt: { gte: startOfWeekUTC(new Date()) } },
      _sum: { amount: true },
    }),
  ])
  const pointsByUser = new Map(sums.map(s => [s.userId, s._sum.amount ?? 0]))
  return users
    .map(user => ({ user, points: pointsByUser.get(user.id) ?? 0 }))
    .sort((a, b) => b.points - a.points)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/services/points.service.test.ts -t getWeeklyPoints
```

Expected: PASS.

- [ ] **Step 5: Add the route + integration test**

In `backend/src/routes/points.routes.ts`, add after the `/leaderboard` handler (line 27):

```ts
router.get('/weekly', authenticate, authorize('PARENT'), async (req, res, next) => {
  try {
    const result = await pointsService.getWeeklyPoints()
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})
```

Append this to `backend/src/__tests__/points.test.ts` (check its header first — it logs in parent/child cookies like `overdue.test.ts`):

```ts
describe('GET /api/points/weekly', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/points/weekly')
    expect(res.status).toBe(401)
  })

  it('returns 403 for CHILD role', async () => {
    const res = await request(app).get('/api/points/weekly').set('Cookie', childCookies)
    expect(res.status).toBe(403)
  })

  it('returns per-child weekly points sorted descending for PARENT', async () => {
    const res = await request(app).get('/api/points/weekly').set('Cookie', parentCookies)
    expect(res.status).toBe(200)
    const data = res.body.data as Array<{ user: { role: string }; points: number }>
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(2)
    expect(data.every(e => e.user.role === 'CHILD')).toBe(true)
    for (let i = 1; i < data.length; i++) {
      expect(data[i - 1].points).toBeGreaterThanOrEqual(data[i].points)
    }
  })
})
```

- [ ] **Step 6: Run the new route tests**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npx jest __tests__/points.test.ts -t weekly
```

Expected: PASS.

- [ ] **Step 7: Run the full backend suite**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/services/points.service.ts backend/src/routes/points.routes.ts backend/src/__tests__/services/points.service.test.ts backend/src/__tests__/points.test.ts
git commit -m "feat(backend): GET /api/points/weekly parent endpoint"
```

---

### Task 6: Frontend API layer additions

**Files:**
- Modify: `frontend/src/api/assignments.api.ts`
- Modify: `frontend/src/api/overdue.api.ts`
- Modify: `frontend/src/api/points.api.ts`

**Interfaces:**
- Produces:
  - `Assignment.assignedTo` gains `ntfyTopic: string | null`.
  - `OverdueChore.assignedTo` gains `ntfyTopic: string | null`.
  - `nudgeAssignment(id: number, type: 'REGULAR' | 'RECURRING'): Promise<{ id: number }>` in `assignments.api.ts`.
  - `WeeklyPointsEntry { user: { id; name; color; role }; points: number }` and `getWeeklyPoints(): Promise<WeeklyPointsEntry[]>` in `points.api.ts`.

- [ ] **Step 1: Add `ntfyTopic` + `nudgeAssignment` to `assignments.api.ts`**

In `frontend/src/api/assignments.api.ts`:

1. Extend `assignedTo` (lines 23-27):
```ts
  assignedTo: {
    id: number
    name: string
    color: string
    ntfyTopic: string | null
  }
```
2. Add after `delete_` (line 71):
```ts
export async function nudgeAssignment(
  id: number,
  type: 'REGULAR' | 'RECURRING'
): Promise<{ id: number }> {
  const response = await api.post('/nudge', { id, type })
  return response.data.data
}
```

- [ ] **Step 2: Add `ntfyTopic` to `overdue.api.ts`**

In `frontend/src/api/overdue.api.ts`, extend `assignedTo` (lines 18-22):
```ts
  assignedTo: {
    id: number
    name: string
    color: string
    ntfyTopic: string | null
  }
```

- [ ] **Step 3: Add weekly points to `points.api.ts`**

In `frontend/src/api/points.api.ts`, add after the `LeaderboardEntry` block (line 58):

```ts
export interface WeeklyPointsEntry {
  user: { id: number; name: string; color: string; role: string }
  points: number
}

export async function getWeeklyPoints(): Promise<WeeklyPointsEntry[]> {
  const response = await api.get('/weekly')
  return response.data.data
}
```

- [ ] **Step 4: Verify typecheck**

From `frontend/`:

```bash
npm run typecheck
```

> If `npm run typecheck` isn't defined (AGENTS.md says no lint/format scripts exist; the CI uses `tsc`), run instead:
> ```bash
> npx tsc --noEmit
> ```

Expected: no type errors (the existing test fixtures in `DashboardPage.test.tsx`/`OverduePage.test.tsx` include `assignedTo` without `ntfyTopic` — `tsc` may flag them; if so, that's expected and fixed in Tasks 9-10's test updates, or add `ntfyTopic: null` to the fixtures in Task 10).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/assignments.api.ts frontend/src/api/overdue.api.ts frontend/src/api/points.api.ts
git commit -m "feat(frontend): nudge and weekly-points API methods"
```

---

### Task 7: `useWeeklyPoints` and `useNudge` hooks

**Files:**
- Modify: `frontend/src/hooks/usePoints.tsx`
- Create: `frontend/src/hooks/useNudge.tsx`
- Test: `frontend/src/__tests__/useNudge.test.tsx`

**Interfaces:**
- Consumes: `getWeeklyPoints` (Task 6), `nudgeAssignment` (Task 6).
- Produces:
  - `useWeeklyPoints()` — TanStack `useQuery` with key `['points', 'weekly']`, returns `{ data, isLoading, error }`.
  - `useNudge()` — TanStack `useMutation` with `mutationFn: ({ id, type }) => nudgeAssignment(id, type)`, returns `{ mutateAsync, isPending }`.

- [ ] **Step 1: Add `useWeeklyPoints`**

In `frontend/src/hooks/usePoints.tsx`, add after `useLeaderboard` (line 35):

```ts
export function useWeeklyPoints() {
  return useQuery({
    queryKey: ['points', 'weekly'],
    queryFn: pointsApi.getWeeklyPoints,
  })
}
```

- [ ] **Step 2: Write the failing hook test**

Create `frontend/src/__tests__/useNudge.test.tsx`:

```tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNudge } from '../hooks/useNudge'

vi.mock('../api/assignments.api', () => ({
  nudgeAssignment: vi.fn(),
}))

import * as assignmentsApi from '../api/assignments.api'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useNudge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('calls nudgeAssignment with the chore id and type', async () => {
    ;(assignmentsApi.nudgeAssignment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5 })

    const { result } = renderHook(() => useNudge(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 5, type: 'REGULAR' })
    })

    expect(assignmentsApi.nudgeAssignment).toHaveBeenCalledWith(5, 'REGULAR')
    expect(result.current.isPending).toBe(false)
  })

  it('surfaces an API error to the caller', async () => {
    ;(assignmentsApi.nudgeAssignment as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useNudge(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 5, type: 'REGULAR' })).rejects.toThrow('boom')
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

From `frontend/`:

```bash
npm test -- useNudge
```

Expected: FAIL — cannot find module `../hooks/useNudge`.

- [ ] **Step 4: Create `useNudge.tsx`**

Create `frontend/src/hooks/useNudge.tsx`:

```tsx
import { useMutation } from '@tanstack/react-query'
import * as assignmentsApi from '../api/assignments.api'

export function useNudge() {
  return useMutation({
    mutationFn: ({ id, type }: { id: number; type: 'REGULAR' | 'RECURRING' }) =>
      assignmentsApi.nudgeAssignment(id, type),
  })
}
```

- [ ] **Step 5: Run the tests to verify they pass**

From `frontend/`:

```bash
npm test -- useNudge
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/usePoints.tsx frontend/src/hooks/useNudge.tsx frontend/src/__tests__/useNudge.test.tsx
git commit -m "feat(frontend): useWeeklyPoints and useNudge hooks"
```

---

### Task 8: Extract shared `OverdueChoreActions` component

**Files:**
- Create: `frontend/src/components/OverdueChoreActions.tsx`
- Modify: `frontend/src/pages/OverduePage.tsx`
- Test: `frontend/src/__tests__/OverduePage.test.tsx`

**Interfaces:**
- Consumes: `useOverdue` (existing hook), `OverdueChore` type (Task 6 updated), `Card`/`Button`/`Modal`/`Toast` primitives, `todayInputDate` helper (move into the component).
- Produces: `OverdueChoreActions({ chore, onAction }: { chore: OverdueChore; onAction: (message: string) => void })` — renders the Cancel/Reschedule buttons (Reschedule only for REGULAR) and the two dialogs. `onAction(message)` is called with a toast message after a successful cancel/reschedule.

**Rationale:** ParentDashboard (Task 9) needs the exact same cancel/reschedule flow on its overdue rows. Extract once so both pages share it (DRY).

- [ ] **Step 1: Move `todayInputDate` and the buttons+modals into the component**

Create `frontend/src/components/OverdueChoreActions.tsx` with the dialog logic lifted verbatim from `OverduePage.tsx` lines 15-20 (`todayInputDate`), 26-37 (state), 44-79 (handlers), 142-198 (modals + toast):

```tsx
import { useState, useEffect } from 'react'
import { CalendarClock, XCircle } from 'lucide-react'
import { useOverdue } from '../hooks/useOverdue'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Toast } from './ui/Toast'
import type { OverdueChore } from '../api/overdue.api'

function todayInputDate(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

export function OverdueChoreActions({
  chore,
  onAction,
}: {
  chore: OverdueChore
  onAction: (message: string) => void
}) {
  const { cancelChore, isCancelling, rescheduleChore, isRescheduling } = useOverdue()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [penalty, setPenalty] = useState('0')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function openCancel() {
    setPenalty(String(chore.template.points))
    setFormError(null)
    setCancelOpen(true)
  }

  function openReschedule() {
    setNewDueDate(todayInputDate())
    setFormError(null)
    setRescheduleOpen(true)
  }

  async function handleCancel() {
    setFormError(null)
    try {
      const value = Math.min(100000, Math.max(0, Math.floor(Number(penalty) || 0)))
      await cancelChore(chore.id, chore.type, value)
      setCancelOpen(false)
      onAction(value > 0 ? `Chore canceled, ${value} pts penalty applied.` : 'Chore canceled.')
    } catch {
      setFormError('Failed to cancel chore. Please try again.')
    }
  }

  async function handleReschedule() {
    setFormError(null)
    try {
      await rescheduleChore(chore.id, newDueDate)
      setRescheduleOpen(false)
      onAction('Due date updated.')
    } catch {
      setFormError('Failed to reschedule chore. Please try again.')
    }
  }

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button variant="danger" onClick={openCancel}>
          <XCircle className="h-4 w-4" aria-hidden /> Cancel
        </Button>
        {chore.type === 'REGULAR' && (
          <Button variant="secondary" onClick={openReschedule}>
            <CalendarClock className="h-4 w-4" aria-hidden /> Reschedule
          </Button>
        )}
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel overdue chore">
        {cancelOpen && (
          <div>
            {formError && <div className="alert-error mb-4">{formError}</div>}
            <p className="mb-1 text-sm text-zinc-300">Penalty for {chore.assignedTo.name} (0 to waive):</p>
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
              <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={isCancelling}>
                Keep Chore
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule overdue chore">
        {rescheduleOpen && (
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
              <Button onClick={handleReschedule} loading={isRescheduling} disabled={newDueDate === ''}>
                Save Date
              </Button>
              <Button variant="secondary" onClick={() => setRescheduleOpen(false)} disabled={isRescheduling}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Refactor `OverduePage` to use it**

In `frontend/src/pages/OverduePage.tsx`:
1. Delete `todayInputDate` (lines 15-20).
2. Delete the cancel/reschedule state, handlers, and the two `Modal`s + `Toast` (lines 26-37, 44-79, and 142-198).
3. Add `import { OverdueChoreActions } from '../components/OverdueChoreActions'`.
4. Keep `successMessage` state + auto-dismiss `useEffect` and the `<Toast>`; replace the `actions` block inside each `Card` (lines 127-135) with:
```tsx
<OverdueChoreActions chore={chore} onAction={setSuccessMessage} />
```

- [ ] **Step 3: Run the OverduePage tests**

From `frontend/`:

```bash
npm test -- OverduePage
```

Expected: PASS unchanged — the test mocks `useOverdue`, which `OverdueChoreActions` calls internally, and the rendered DOM (buttons, modals, labels, toasts) is identical.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OverdueChoreActions.tsx frontend/src/pages/OverduePage.tsx
git commit -m "refactor(frontend): extract OverdueChoreActions for reuse on the dashboard"
```

---

### Task 9: `ParentDashboard` component

**Files:**
- Create: `frontend/src/pages/ParentDashboard.tsx`
- Test: `frontend/src/__tests__/ParentDashboard.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useAssignments`, `useOverdue`, `useLeaderboard`, `useWeeklyPoints`, `useNudge`, `useTemplates`, `useUsers`, `OverdueChoreActions` (Task 8), `AssignChoreForm`, and the ui primitives `StatCard`, `ProgressRing`, `Card`, `Avatar`, `Leaderboard`, `EmptyState`, `Skeleton`, `Button`, `Modal`, `Toast`, `formatDueDate`/`daysOverdue` from `../utils/dateFormat`, `assignmentKey` from `../utils/assignmentKey`.
- Produces: `ParentDashboard()` — rendered by `DashboardPage` for `role === 'PARENT'`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/ParentDashboard.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ParentDashboard } from '../pages/ParentDashboard'

// jsdom has no matchMedia — simulate reduced motion so CountUp values render instantly.
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const mockNudge = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../hooks/useAssignments', () => ({ useAssignments: vi.fn() }))
vi.mock('../hooks/useOverdue', () => ({ useOverdue: vi.fn() }))
vi.mock('../hooks/usePoints', () => ({
  useLeaderboard: vi.fn(),
  useWeeklyPoints: vi.fn(),
}))
vi.mock('../hooks/useNudge', () => ({ useNudge: vi.fn() }))
vi.mock('../hooks/useTemplates', () => ({ useTemplates: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useOverdue } from '../hooks/useOverdue'
import { useLeaderboard, useWeeklyPoints } from '../hooks/usePoints'
import { useNudge } from '../hooks/useNudge'
import { useTemplates } from '../hooks/useTemplates'
import { useUsers } from '../hooks/useUsers'

const parentUser = { id: 1, name: 'Dad', role: 'PARENT', email: 'dad@home.local', color: '#4F46E5' }

const today = '2026-06-17'

const todayChore = {
  id: 1, type: 'REGULAR' as const, choreTemplateId: 1, assignedToId: 3,
  dueDate: today, status: 'PENDING' as const, completedAt: null, pointsAwarded: null,
  notes: null, createdAt: '2026-06-10T09:00:00.000Z',
  template: { id: 1, title: 'Load dishwasher', points: 20, category: 'kitchen', description: null },
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: 'alice-topic' },
}

const overdueChore = {
  ...todayChore,
  id: 2,
  dueDate: '2026-06-15',
  template: { id: 2, title: 'Take out trash', points: 15, category: 'chores', description: null },
  assignedTo: { id: 4, name: 'Bob', color: '#F59E0B', ntfyTopic: null },
}

const doneChore = {
  ...todayChore,
  id: 3,
  dueDate: '2026-06-16',
  status: 'COMPLETED' as const,
  completedAt: '2026-06-16T15:00:00.000Z',
  pointsAwarded: 20,
  template: { id: 3, title: 'Walk the dog', points: 30, category: 'chores', description: null },
}

function mockParentState(overrides: Record<string, unknown> = {}) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user: parentUser, isLoading: false, error: null, login: vi.fn(), logout: vi.fn(),
  })
  ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
    assignments: [todayChore, overdueChore, doneChore], isLoading: false, error: null,
  })
  ;(useOverdue as ReturnType<typeof vi.fn>).mockReturnValue({
    overdue: [overdueChore], isLoading: false, error: null, ...overrides,
  })
  ;(useLeaderboard as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [{ user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, balance: 480 }],
    isLoading: false,
  })
  ;(useWeeklyPoints as ReturnType<typeof vi.fn>).mockReturnValue({
    data: [{ user: { id: 3, name: 'Alice', color: '#10B981', role: 'CHILD' }, points: 120 }],
    isLoading: false,
  })
  ;(useNudge as ReturnType<typeof vi.fn>).mockReturnValue({
    mutateAsync: mockNudge, isPending: false,
  })
  ;(useTemplates as ReturnType<typeof vi.fn>).mockReturnValue({ templates: [] })
  ;(useUsers as ReturnType<typeof vi.fn>).mockReturnValue({ users: [] })
}

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ParentDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-17T12:00:00Z'), toFake: ['Date'] })
    mockMatchMedia(true)
    mockParentState()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the status strip: overdue, due today, this week done, pts this week', () => {
    renderPage()
    // "Overdue" appears both as the stat label and as the needs-action badge text.
    expect(screen.getAllByText('Overdue').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Due today').closest('div')).toHaveTextContent('1')
    expect(screen.getByText('This week').closest('div')).toHaveTextContent('1 of 3 done')
    expect(screen.getByText('Pts this week').closest('div')).toHaveTextContent('120')
  })

  it('lists needs-action rows, overdue before today', () => {
    renderPage()
    const rows = screen.getAllByText('Take out trash')
    expect(rows.length).toBeGreaterThan(0)
    expect(screen.getByText('Load dishwasher')).toBeInTheDocument()
  })

  it('disables Nudge when the assignee has no ntfyTopic', () => {
    renderPage()
    const nudgeButtons = screen.getAllByRole('button', { name: /nudge/i })
    // Bob (no topic) has a disabled button; Alice (has topic) does not.
    expect(nudgeButtons.some(b => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('nudges a chore and shows a success toast', async () => {
    mockNudge.mockResolvedValue({ id: 1 })
    renderPage()
    const nudgeButtons = screen.getAllByRole('button', { name: /nudge/i })
    const aliceRow = nudgeButtons.filter(b => !(b as HTMLButtonElement).disabled)[0]
    fireEvent.click(aliceRow)
    await waitFor(() => expect(mockNudge).toHaveBeenCalledWith({ id: 1, type: 'REGULAR' }))
    expect(await screen.findByText('Reminder sent to Alice 👀')).toBeInTheDocument()
  })

  it('shows Reschedule/Cancel only on overdue rows', () => {
    renderPage()
    // Only the single overdue row renders these; the due-today row does not.
    expect(screen.getAllByText('Cancel').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the latest completed chore in the right rail', () => {
    renderPage()
    expect(screen.getByText(/Walk the dog/)).toBeInTheDocument()
  })

  it('shows empty states when nothing needs attention', () => {
    mockParentState({
      overdue: [],
    })
    ;(useAssignments as ReturnType<typeof vi.fn>).mockReturnValue({
      assignments: [], isLoading: false, error: null,
    })
    renderPage()
    expect(screen.getByText('All caught up 🎉')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

From `frontend/`:

```bash
npm test -- ParentDashboard
```

Expected: FAIL — cannot find module `../pages/ParentDashboard`.

- [ ] **Step 3: Implement `ParentDashboard.tsx`**

Create `frontend/src/pages/ParentDashboard.tsx`:

```tsx
import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useOverdue } from '../hooks/useOverdue'
import { useLeaderboard, useWeeklyPoints } from '../hooks/usePoints'
import { useNudge } from '../hooks/useNudge'
import { formatDueDate } from '../utils/dateFormat'
import { assignmentKey } from '../utils/assignmentKey'
import { Leaderboard } from '../components/Leaderboard'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Toast } from '../components/ui/Toast'
import { OverdueChoreActions } from '../components/OverdueChoreActions'
import { AssignChoreForm } from '../components/AssignChoreForm'

type ActionChore = {
  id: number
  type: 'REGULAR' | 'RECURRING'
  dueDate: string
  status: 'PENDING'
  template: { id: number; title: string; points: number; category: string | null }
  assignedTo: { id: number; name: string; color: string; ntfyTopic: string | null }
}

function startOfWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - day)
  return monday
}

function isTodayUTC(dateStr: string): boolean {
  const now = new Date()
  const due = new Date(dateStr)
  return (
    due.getUTCFullYear() === now.getUTCFullYear() &&
    due.getUTCMonth() === now.getUTCMonth() &&
    due.getUTCDate() === now.getUTCDate()
  )
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const hours = Math.max(1, Math.round((Date.now() - then) / 3600000))
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

function extractErrorMessage(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
    if (data) return data
  }
  return null
}

export function ParentDashboard() {
  const { user } = useAuth()
  const { assignments, isLoading: isLoadingAssignments } = useAssignments()
  const { overdue, isLoading: isLoadingOverdue } = useOverdue()
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useLeaderboard()
  const { data: weeklyPoints, isLoading: isLoadingWeekly } = useWeeklyPoints()
  const { mutateAsync: nudgeAsync, isPending: isNudging } = useNudge()

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const needsAction = useMemo<ActionChore[]>(() => {
    const todayPending: ActionChore[] = assignments
      .filter(a => a.status === 'PENDING' && isTodayUTC(a.dueDate))
      .map(a => ({
        id: a.id,
        type: a.type ?? 'REGULAR',
        dueDate: a.dueDate,
        status: 'PENDING' as const,
        template: a.template,
        assignedTo: a.assignedTo,
      }))
    const merged = [...todayPending, ...overdue]
    const seen = new Set<string>()
    return merged
      .filter(c => {
        const key = assignmentKey(c)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => {
        const aOverdue = formatDueDate(a.dueDate).isOverdue ? 0 : 1
        const bOverdue = formatDueDate(b.dueDate).isOverdue ? 0 : 1
        return aOverdue - bOverdue || a.dueDate.localeCompare(b.dueDate)
      })
      .slice(0, 5)
  }, [assignments, overdue])

  const week = useMemo(() => {
    const now = new Date()
    const monday = startOfWeek(now)
    const nextMonday = new Date(monday)
    nextMonday.setUTCDate(monday.getUTCDate() + 7)
    const thisWeek = assignments.filter(a => {
      const due = new Date(a.dueDate)
      return due >= monday && due < nextMonday
    })
    return {
      total: thisWeek.length,
      done: thisWeek.filter(a => a.status === 'COMPLETED').length,
    }
  }, [assignments])

  const dueToday = useMemo(
    () => assignments.filter(a => a.status === 'PENDING' && isTodayUTC(a.dueDate)).length,
    [assignments]
  )

  const weeklyTotal = useMemo(
    () => (weeklyPoints ?? []).reduce((sum, e) => sum + e.points, 0),
    [weeklyPoints]
  )

  const latestWins = useMemo(
    () =>
      assignments
        .filter(a => a.status === 'COMPLETED' && a.completedAt !== null)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
        .slice(0, 3),
    [assignments]
  )

  async function handleNudge(chore: ActionChore) {
    try {
      await nudgeAsync({ id: chore.id, type: chore.type })
      setToast({ kind: 'success', text: `Reminder sent to ${chore.assignedTo.name} 👀` })
    } catch (err) {
      setToast({ kind: 'error', text: extractErrorMessage(err) ?? 'Failed to send reminder. Please try again.' })
    }
  }

  const isLoading = isLoadingAssignments || isLoadingOverdue || isLoadingWeekly || isLeaderboardLoading

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
        <Button onClick={() => setShowAssignModal(true)} className="mt-3 w-full justify-center">
          <Plus className="h-4 w-4" /> Assign Chore
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Overdue">
          <CountUp value={overdue.length} />
        </StatCard>
        <StatCard label="Due today">
          <CountUp value={dueToday} />
        </StatCard>
        <Card className="col-span-2 flex items-center justify-between lg:col-span-2">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500">This week</span>
            <p className="mt-1 font-display text-lg font-bold text-zinc-100">
              {week.done} of {week.total} done
            </p>
            <p className="text-sm text-zinc-400">
              {week.total > 0 && week.done === week.total ? 'Week complete — nice! 🎉' : 'Keep it going!'}
            </p>
          </div>
          <ProgressRing value={week.done} max={week.total} size={88} label={`${week.done} of ${week.total}`} />
        </Card>
        <StatCard label="Pts this week">
          <CountUp value={weeklyTotal} />
        </StatCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Needs action</h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : needsAction.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up 🎉" hint="Nothing needs your attention right now." />
          ) : (
            <div className="space-y-3">
              {needsAction.map(chore => {
                const { label, isOverdue } = formatDueDate(chore.dueDate)
                const canNudge = chore.assignedTo.ntfyTopic !== null
                return (
                  <Card
                    key={assignmentKey(chore)}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={chore.assignedTo.name} color={chore.assignedTo.color} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-100">{chore.template.title}</div>
                        <div className="text-sm text-zinc-400">
                          {chore.assignedTo.name} ·{' '}
                          <span className={isOverdue ? 'font-bold text-rose-400' : ''}>
                            {isOverdue ? 'Overdue' : label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {isOverdue && (
                        <OverdueChoreActions chore={chore} onAction={msg => setToast({ kind: 'success', text: msg })} />
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => handleNudge(chore)}
                        disabled={!canNudge || isNudging}
                        title={canNudge ? undefined : 'This child has not enabled push notifications'}
                      >
                        Nudge
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Leaderboard</h3>
            {leaderboard && leaderboard.length > 0 ? (
              <Leaderboard entries={leaderboard} limit={3} />
            ) : (
              <p className="text-sm text-zinc-500">No points earned yet.</p>
            )}
          </div>
          <div>
            <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Latest win</h3>
            {latestWins.length === 0 ? (
              <p className="text-sm text-zinc-500">No chores completed yet.</p>
            ) : (
              <div className="space-y-3">
                {latestWins.map(a => (
                  <Card key={assignmentKey(a)} className="flex items-center gap-3">
                    <Avatar name={a.assignedTo.name} color={a.assignedTo.color} size="sm" />
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-100">{a.template.title}</div>
                      <div className="text-sm text-zinc-400">
                        {a.assignedTo.name} · +{a.pointsAwarded ?? a.template.points} pts · {a.completedAt ? timeAgo(a.completedAt) : ''}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Chore">
        {showAssignModal && (
          <AssignChoreForm
            onSuccess={() => { setShowAssignModal(false); setToast({ kind: 'success', text: 'Assignment created!' }) }}
            onCancel={() => setShowAssignModal(false)}
          />
        )}
      </Modal>

      {toast && <Toast kind={toast.kind}>{toast.text}</Toast>}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

From `frontend/`:

```bash
npm test -- ParentDashboard
```

Expected: PASS. If the "1 of 3 done" assertion fails, recompute `thisWeek` against the frozen date `2026-06-17` (Mon 2026-06-15 → Sun 2026-06-21): `todayChore` (Jun 17) + `overdueChore` (Jun 15) + `doneChore` (Jun 16) are all in-week and `doneChore` is the only COMPLETED one → `1 of 3 done`. The `doneChore` `completedAt` `2026-06-16T15:00Z` → `timeAgo` rounds to `(now - then)` hours; frozen now is `2026-06-17T12:00Z` → 21h → `21h ago`, which the latest-win test doesn't assert verbatim (it only checks the title).

- [ ] **Step 5: Run the frontend suite + typecheck**

From `frontend/`:

```bash
npm test
npx tsc --noEmit
```

Expected: PASS. If `tsc` flags the `assignedTo` fixtures in `DashboardPage.test.tsx`/`OverduePage.test.tsx` (missing `ntfyTopic`), that's fixed in Task 10's fixture updates — proceed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ParentDashboard.tsx frontend/src/__tests__/ParentDashboard.test.tsx
git commit -m "feat(frontend): parent dashboard with status strip, needs-action list, and nudge"
```

---

### Task 10: Wire the role branch in `DashboardPage` + fix test fixtures

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/__tests__/DashboardPage.test.tsx`
- Modify: `frontend/src/__tests__/OverduePage.test.tsx` (fixture `ntfyTopic`)

**Interfaces:**
- Consumes: `ParentDashboard` (Task 9).
- Produces: `DashboardPage` renders `<ParentDashboard />` when `user.role === 'PARENT'`, else the existing child dashboard.

- [ ] **Step 1: Branch inside the single `AppShell`**

In `frontend/src/pages/DashboardPage.tsx`, add the import:

```tsx
import { ParentDashboard } from './ParentDashboard'
```

`ParentDashboard` does **not** render `AppShell` itself, so `DashboardPage` keeps its single `<AppShell>` wrapper and switches on role inside it. Replace the entire `return ( <AppShell> … ) </AppShell>)` block (currently lines 77-181) so parents get `ParentDashboard` and children keep the existing dashboard markup:

```tsx
  return (
    <AppShell>
      {user?.role === 'PARENT' ? (
        <ParentDashboard />
      ) : (
        <>
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Points">
              <CountUp value={myPoints?.balance ?? 0} /> <span className="text-base text-zinc-500">pts</span>
            </StatCard>
            <StatCard label="Due today">{dueToday}</StatCard>
            <StatCard label="Streak">
              <span aria-hidden>🔥</span> {gamification?.streak ?? 0}{' '}
              <span className="text-base text-zinc-500">wk</span>
            </StatCard>
            <Card className="col-span-2 flex items-center justify-between lg:col-span-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-zinc-500">This week</span>
                <p className="mt-1 font-display text-lg font-bold text-zinc-100">
                  {week.done} of {week.total} done
                </p>
                <p className="text-sm text-zinc-400">
                  {week.total > 0 && week.done === week.total ? 'Week complete — nice! 🎉' : 'Keep it going!'}
                </p>
              </div>
              <ProgressRing value={week.done} max={week.total} size={88} label={`${week.done} of ${week.total}`} />
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Upcoming Chores</h3>
              {/* existing upcoming list JSX (lines 114-150: loading/error/empty/map) unchanged */}
            </section>
            <section>
              <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Leaderboard</h3>
              {/* existing leaderboard JSX (lines 153-165) unchanged */}
            </section>
          </div>
        </>
      )}
    </AppShell>
  )
```

Cleanup in the same file:
- Remove the parent-only pieces that are now dead: the `<Button>Assign Chore</Button>` in the greeting (lines 81-85), the `{user?.role === 'PARENT' && (<Modal … AssignChoreForm …>)}` block (lines 168-177), and `{successMessage && <Toast …>}` (line 179).
- Remove the now-unused imports and state: `useState`, `useEffect`, `Plus`, `AssignChoreForm`, `Modal`, `Toast`, plus the `showAssignModal`/`successMessage` state and the `useEffect` that auto-dismisses the toast.
- `useTemplates` and `useUsers` were only used by `AssignChoreForm` — remove their imports and calls. `useAssignments`, `useMyPoints`, `useLeaderboard`, `useGamification` stay (the child branch still computes from them); for a PARENT these are still called at the top (hooks cannot be conditional) — harmless, and React Query dedupes them with `ParentDashboard`'s own reads.

- [ ] **Step 2: Update `DashboardPage.test.tsx` mocks + fixtures**

In `frontend/src/__tests__/DashboardPage.test.tsx`:
1. Add mocks so a PARENT render pulls in the new hooks:
```tsx
vi.mock('../hooks/useOverdue', () => ({ useOverdue: vi.fn() }))
vi.mock('../hooks/useNudge', () => ({ useNudge: vi.fn() }))
```
2. Extend the existing `usePoints` mock (lines 28-32) with `useWeeklyPoints: vi.fn()`.
3. In `beforeEach` (after `mockPointsState()`), add defaults:
```tsx
;(useOverdue as ReturnType<typeof vi.fn>).mockReturnValue({ overdue: [], isLoading: false, error: null })
;(useNudge as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
;(useWeeklyPoints as ReturnType<typeof vi.fn>).mockReturnValue({ data: [], isLoading: false })
```
4. Fix the `assignedTo` fixtures that now require `ntfyTopic` (the objects at lines 163, 176, 211, 261, 298, 312, 326 — add `ntfyTopic: null`). If `tsc` reports more, follow the same pattern.
5. The two existing PARENT tests ("shows the Assign Chore button for a PARENT", "opens the modal…", "closes the modal…") now exercise `ParentDashboard`. They should still pass since `ParentDashboard` renders the same `Assign Chore` button + `AssignChoreForm` modal. `mockTemplatesState`/`mockUsersState` are already set up for them.

- [ ] **Step 3: Update `OverduePage.test.tsx` fixture**

In `frontend/src/__tests__/OverduePage.test.tsx`, the `assignedTo` objects (lines 32, 37-38 spread) need `ntfyTopic: null`:
```tsx
  assignedTo: { id: 3, name: 'Alice', color: '#10B981', ntfyTopic: null },
```
(`OverdueChoreActions` reads `chore.assignedTo.name`, so the extra field is inert, but `tsc` requires the type to match.)

- [ ] **Step 4: Run the frontend suite + typecheck**

From `frontend/`:

```bash
npm test
npx tsc --noEmit
```

Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/__tests__/DashboardPage.test.tsx frontend/src/__tests__/OverduePage.test.tsx
git commit -m "feat(frontend): route parents to the new ParentDashboard"
```

---

### Task 11: Version bump, changelog, and memory log

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `CHANGELOG.md`
- Modify: `docs/VERSION_MAP.md`
- Modify: `docs/project_notes/issues.md`
- Modify: `docs/OPERATIONS.md` (if needed)

**Global Constraint:** `APP_VERSION` bump required. Current version is `3.4.1`; the parent dashboard + nudge is a feature addition, so bump to **3.4.2** (patch) unless the user says otherwise. Ask the user to confirm the exact version before committing if in doubt.

- [ ] **Step 1: Bump the versions**

In `backend/package.json` and `frontend/package.json`, set `"version": "3.4.2"`.

- [ ] **Step 2: Regenerate lockfiles**

From each of `backend/` and `frontend/`, per `docs/VERSION_MAP.md` process (never hand-edit lockfiles):

```bash
rm -rf node_modules package-lock.json && npm install
```

Run from `backend/` then `frontend/`.

- [ ] **Step 3: Update `CHANGELOG.md`**

Add a new header at the top (check the format of the existing `## [3.4.1] - 2026-08-11` entry):

```markdown
## [3.4.2] - 2026-08-11

### Added
- Parent dashboard: status strip (overdue / due today / week done / points this week), "Needs action" list, latest-win feed.
- Nudge: parents can push a gentle-reminder notification to a child for a pending chore (15-min cooldown).
- `GET /api/points/weekly` parent endpoint.
```

- [ ] **Step 4: Update `docs/VERSION_MAP.md`**

Update the current-version row(s) to `3.4.2` where the doc lists the live version.

- [ ] **Step 5: Log the work in `docs/project_notes/issues.md`**

Append a bullet matching the file's existing format:

```markdown
- 2026-08-11 — Parent dashboard (Option D) + Nudge feature. Parents now see a status strip, needs-action list, leaderboard, and latest-win on `/`; new `POST /api/assignments/nudge` (15-min cooldown via `lastNudgedAt`) and `GET /api/points/weekly`. Spec: `docs/superpowers/specs/2026-08-11-parent-dashboard-nudge-design.md`.
```

- [ ] **Step 6: Run both test suites one final time**

From `backend/`:

```bash
DATABASE_URL="file:./dev.db" npm test
```

From `frontend/`:

```bash
npm test && npx tsc --noEmit
```

Expected: everything passes.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json CHANGELOG.md docs/VERSION_MAP.md docs/project_notes/issues.md
git commit -m "chore: bump to 3.4.2, update changelog and project memory"
```

---

## Self-Review

**Spec coverage:**
- Status strip (Overdue / Due today / This week done / Pts this week) → Task 9 (data from Tasks 5, existing hooks).
- Needs-action list (merge, dedupe, overdue-first, cap 5, Reschedule/Cancel on overdue, Nudge on pending) → Tasks 8, 9.
- Nudge endpoint + cooldown + no-topic guard → Tasks 1-4.
- Weekly points endpoint → Task 5.
- Frontend API additions (`ntfyTopic`, `nudgeAssignment`, `getWeeklyPoints`) → Task 6.
- Hooks → Task 7.
- ParentDashboard + role branch → Tasks 9, 10.
- Child dashboard unchanged → Task 10 keeps the existing inner markup for children.
- Version bump + issues.md → Task 11.

**Placeholder scan:** No TBD/TODO; every code step carries full code. The only conditional is Task 4's note about bob's `ntfyTopic` possibly being mutated by another test, with an explicit fallback (create a fresh CHILD if fragile).

**Type consistency:** `nudge` returns `{ id, type }` (Tasks 3-4) matching `nudgeAssignment`'s return type (Task 6). `useNudge` mutation `{ id, type }` matches `nudgeAssignment(id, type)` (Tasks 6-7). `OverdueChoreActions` props `{ chore: OverdueChore; onAction: (message: string) => void }` used identically in Tasks 8-9. `ActionChore` in Task 9 is structurally compatible with both `Assignment` (Task 6, with `ntfyTopic`) and `OverdueChore` (Task 6, with `ntfyTopic`). `getWeeklyPoints` returns `WeeklyPointsEntry[]` (Tasks 5-6, 9).
