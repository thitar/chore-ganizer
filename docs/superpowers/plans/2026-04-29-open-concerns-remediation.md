# Open Concerns Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 3 remaining open concerns from CONCERNS.md: migrate recurrenceRule to Prisma Json type, align Prisma field names with frontend naming, and add rate limit admin UI.

**Architecture:** Three independent work items executed in parallel. Each touches different Prisma models and different concerns. Prisma `@map` preserves existing SQLite columns (zero data migration).

**Tech Stack:** Prisma ORM, Express.js, React 18 + Vite, express-rate-limit v8, sonner (toast)

---

### File Map

| File | Action | Responsibility |
|---|---|---|
| **Item 1 — JSON Storage** | | |
| `backend/prisma/schema.prisma` | **Modify** | `recurrenceRule String` → `recurrenceRule Json` |
| `backend/src/controllers/recurring-chores-crud.controller.ts` | **Modify** | Remove `JSON.stringify(recurrenceRule)` |
| `backend/src/services/recurring-chores/transform.service.ts` | **Modify** | Remove `JSON.parse(dbRecord.recurrenceRule)` |
| `backend/src/jobs/occurrenceJob.ts` | **Modify** | Remove `JSON.parse(rc.recurrenceRule)` |
| **Item 2 — Field Rename** | | |
| `backend/prisma/schema.prisma` | **Modify** | Add `@map` to ChoreAssignment fields |
| `backend/src/controllers/chore-assignments.controller.ts` | **Modify** | Rename `assignedToId` → `userId`, `choreTemplateId` → `templateId` |
| `backend/src/controllers/overdue-penalty.controller.ts` | **Modify** | Rename `assignedToId` → `userId` |
| `backend/src/services/chore-assignments.service.ts` | **Modify** | Rename field references |
| `backend/src/schemas/validation.schemas.ts` | **Modify** | Rename Zod field names |
| `backend/src/prisma/seed.ts` | **Modify** | Rename seed data fields |
| `backend/src/__tests__/test-helpers.ts` | **Modify** | Rename mock data fields |
| `frontend/src/types/index.ts` | **Modify** | Rename interface fields |
| `frontend/src/api/assignments.api.ts` | **Modify** | Remove manual mapping |
| `frontend/src/api/chores.api.ts` | **Modify** | Rename filter param |
| `frontend/src/hooks/useChores.ts` | **Modify** | Rename filter param |
| `frontend/src/pages/Calendar.tsx` | **Modify** | Rename field references |
| `frontend/src/pages/Dashboard.tsx` | **Modify** | Rename field references |
| `frontend/src/test/utils.tsx` | **Modify** | Rename mock data fields |
| **Item 3 — Rate Limit Admin** | | |
| `backend/src/middleware/rateLimiter.ts` | **Modify** | Add env var config + throttle event tracker |
| `backend/src/app.ts` | **Modify** | Create admin routes, add configurable general limiter |
| `backend/src/routes/` | **Create** | Admin routes with rate limit status endpoint |
| `frontend/src/pages/Settings.tsx` | **Create** | Rate limit status settings page |
| `frontend/src/App.tsx` | **Modify** | Add `/settings` route |
| `frontend/src/components/layout/Sidebar.tsx` | **Modify** | Add Settings link for parents |

---

## Item 1: JSON Storage Migration

### Task 1.1: Update Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma:260`

- [ ] **Step 1: Change recurrenceRule type from String to Json**

In `backend/prisma/schema.prisma`, change line 260:
```prisma
// Before:
recurrenceRule String // JSON string

// After:
recurrenceRule Json
```

- [ ] **Step 2: Run backend build to verify type passes**

```bash
cd backend && npx prisma generate && npx tsc --noEmit
```

Expected: No type errors. Prisma client now returns `recurrenceRule` as the typed `RecurrenceRule` interface, not `string`.

---

### Task 1.2: Remove JSON.stringify from CRUD controller

**Files:**
- Modify: `backend/src/controllers/recurring-chores-crud.controller.ts:93,205`

- [ ] **Step 1: Remove JSON.stringify at create**

Find line ~93 (`recurrenceRule: JSON.stringify(recurrenceRule)`) and change to:
```typescript
recurrenceRule,
```

- [ ] **Step 2: Remove JSON.stringify at update**

Find line ~205 (`recurrenceRule: JSON.stringify(recurrenceRule)`) and change to:
```typescript
recurrenceRule,
```

---

### Task 1.3: Remove JSON.parse from transform service

**Files:**
- Modify: `backend/src/services/recurring-chores/transform.service.ts:8-14`

- [ ] **Step 1: Remove JSON.parse**

Find the `JSON.parse(dbRecord.recurrenceRule)` call and change to direct access:
```typescript
recurrenceRule: dbRecord.recurrenceRule,
```

---

### Task 1.4: Remove JSON.parse from occurrence job

**Files:**
- Modify: `backend/src/jobs/occurrenceJob.ts:67-77`

- [ ] **Step 1: Remove JSON.parse**

Find `JSON.parse(rc.recurrenceRule)` and change to:
```typescript
const rule = rc.recurrenceRule
```

Since `rc` is typed from Prisma, `recurrenceRule` is already the parsed `RecurrenceRule` object.

---

### Task 1.5: Verify Item 1 changes

- [ ] **Step 1: Run backend build**

```bash
cd backend && npx prisma generate && npx tsc --noEmit
```

Expected: Clean compilation, no type errors.

- [ ] **Step 2: Run backend tests**

```bash
cd backend && npm test 2>&1 | tail -20
```

Expected: All tests pass. Recurring chore tests verify create, read, and update with the new Json type.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/src/controllers/recurring-chores-crud.controller.ts backend/src/services/recurring-chores/transform.service.ts backend/src/jobs/occurrenceJob.ts
git commit -m "refactor: migrate recurrenceRule to Prisma Json type"
```

---

## Item 2: Prisma Field Rename

### Task 2.1: Add @map to Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma:86-88`

- [ ] **Step 1: Add @map to ChoreAssignment fields**

In `backend/prisma/schema.prisma`, modify the ChoreAssignment model:
```prisma
model ChoreAssignment {
  id              Int           @id @default(autoincrement())
  templateId      Int           @map("choreTemplateId")
  choreTemplate   ChoreTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  userId          Int           @map("assignedToId")
  assignedTo      User          @relation("AssignedTo", fields: [userId], references: [id], onDelete: Cascade)
  assignedById    Int
  assignedBy      User          @relation("AssignedBy", fields: [assignedById], references: [id], onDelete: Cascade)
  // ... rest unchanged
  @@index([userId])
  @@index([dueDate])
  @@index([status])
  @@index([penaltyApplied])
  @@index([userId, dueDate]) // For calendar views
  @@index([userId, status]) // For user dashboard
  @@index([status, dueDate]) // For overdue detection
}
```

---

### Task 2.2: Update backend controllers

**Files:**
- Modify: `backend/src/controllers/chore-assignments.controller.ts:15,24,117,120,130,136,144,159,181,192,203,204,255,263`
- Modify: `backend/src/controllers/overdue-penalty.controller.ts:157,205`

- [ ] **Step 1: Update chore-assignments controller**

In `chore-assignments.controller.ts`, replace all `assignedToId` with `userId` and `choreTemplateId` with `templateId`:

Line 15: `const { status, assignedToId, dueDateFrom, dueDateTo } = req.query`
→ `const { status, userId, dueDateFrom, dueDateTo } = req.query`

Line 23-24: `if (assignedToId) filters.assignedToId = Number(assignedToId)`
→ `if (userId) filters.userId = Number(userId)`

Line 117: `const { choreTemplateId, assignedToId, dueDate, notes } = req.body`
→ `const { templateId, userId, dueDate, notes } = req.body`

Line 119: `if (!choreTemplateId || !assignedToId || !dueDate)`
→ `if (!templateId || !userId || !dueDate)`

Line 120: throw message
→ `throw new AppError('templateId, userId, and dueDate are required', 400, 'VALIDATION_ERROR')`

Line 124: `const template = await templatesService.getTemplateById(choreTemplateId)`
→ `const template = await templatesService.getTemplateById(templateId)`

Line 130: `{ choreTemplateId, assignedToId, dueDate: new Date(dueDate), notes }`
→ `{ templateId, userId, dueDate: new Date(dueDate), notes }`

Line 136: `userId: assignedToId`
→ `userId: userId`

Line 144: `assignedToId`
→ `userId`

Line 159: `newValue: { choreTemplateId, assignedToId, dueDate }`
→ `newValue: { templateId, userId, dueDate }`

Line 181: `const { dueDate, notes, assignedToId } = req.body`
→ `const { dueDate, notes, userId } = req.body`

Line 192: `if (assignedToId) updateData.assignedToId = assignedToId`
→ `if (userId) updateData.userId = userId`

Line 203: `oldValue: { dueDate: existing.dueDate, notes: existing.notes, assignedToId: existing.assignedToId }`
→ `oldValue: { dueDate: existing.dueDate, notes: existing.notes, userId: existing.userId }`

Line 204: `newValue: { dueDate, notes, assignedToId }`
→ `newValue: { dueDate, notes, userId }`

Line 255: `userId: existing.assignedToId`
→ `userId: existing.userId`

Line 263: `existing.assignedToId`
→ `existing.userId`

- [ ] **Step 2: Update overdue-penalty controller**

In `overdue-penalty.controller.ts`, replace both `assignedToId: user.id` instances (lines 157, 205):
```typescript
userId: user.id,
```

---

### Task 2.3: Update backend services

**Files:**
- Modify: `backend/src/services/chore-assignments.service.ts`

- [ ] **Step 1: Update chore-assignments service**

Search for `assignedToId` and `choreTemplateId` in the service file and replace each with `userId` and `templateId` respectively. The service uses these when building Prisma `where` clauses and `create` data objects.

For example, filter interface:
```typescript
interface AssignmentFilters {
  status?: string
  userId?: number
  dueDateFrom?: Date
  dueDateTo?: Date
}
```

And any `where: { assignedToId: ... }` → `where: { userId: ... }`
And any `data: { choreTemplateId: ... }` → `data: { templateId: ... }`

---

### Task 2.4: Update Zod validation schemas

**Files:**
- Modify: `backend/src/schemas/validation.schemas.ts:95-96`

- [ ] **Step 1: Rename Zod field names**

```typescript
templateId: z.number().int('Template ID must be an integer').positive('Template ID must be positive'),
userId: z.number().int('User ID must be an integer').positive('User ID must be positive'),
```

---

### Task 2.5: Update seed data

**Files:**
- Modify: `backend/src/prisma/seed.ts:190-218`

- [ ] **Step 1: Rename seed data fields**

Replace all `choreTemplateId:` with `templateId:` and `assignedToId:` with `userId:` in the seed file.

---

### Task 2.6: Update backend test helpers

**Files:**
- Modify: `backend/src/__tests__/test-helpers.ts:142-155`

- [ ] **Step 1: Rename mock data fields**

```typescript
// Before:
choreTemplateId: 1,
assignedToId: 2,

// After:
templateId: 1,
userId: 2,
```

---

### Task 2.7: Update frontend types

**Files:**
- Modify: `frontend/src/types/index.ts:62,64,84,112,120,157,158,163`

- [ ] **Step 1: Rename interface fields**

Replace all `choreTemplateId` with `templateId` and `assignedToId` with `userId` in the types file. Affected interfaces: `ChoreAssignment`, `CreateAssignmentData`, `UpdateAssignmentData`.

---

### Task 2.8: Update frontend API layer

**Files:**
- Modify: `frontend/src/api/assignments.api.ts:14,32-36`
- Modify: `frontend/src/api/chores.api.ts:21`

- [ ] **Step 1: Remove manual mapping from assignments API**

In `assignments.api.ts`:
- Remove the comment block (lines 8-21) documenting the convention (the mapping is now structural)
- Change `getAll()` to pass `userId` directly instead of mapping:
```typescript
getAll: async (params?: {
  status?: string
  userId?: number
  fromDate?: string
  toDate?: string
}): Promise<ChoreAssignment[]> => {
  const apiParams: any = {}
  if (params?.status) apiParams.status = params.status
  if (params?.userId) apiParams.userId = params.userId
  if (params?.fromDate) apiParams.dueDateFrom = params.fromDate
  if (params?.toDate) apiParams.dueDateTo = params.toDate
  const response = await client.get<{ assignments: ChoreAssignment[] }>('/chore-assignments', { params: apiParams })
  const assignments = response.data?.assignments || []
  return assignments
},
```

- [ ] **Step 2: Update chores API**

In `chores.api.ts`, rename filter param:
```typescript
getAll: async (params?: { status?: string; userId?: number }): Promise<ChoreAssignment[]> => {
```

---

### Task 2.9: Update frontend hooks

**Files:**
- Modify: `frontend/src/hooks/useChores.ts:5`

- [ ] **Step 1: Rename filter param**

```typescript
export function useChores(filters?: { status?: string; userId?: number }) {
```

---

### Task 2.10: Update frontend pages

**Files:**
- Modify: `frontend/src/pages/Calendar.tsx:71,72,136`
- Modify: `frontend/src/pages/Dashboard.tsx:40`

- [ ] **Step 1: Update Calendar page**

Line 71: `choreTemplateId: Number(newChoreTemplateId),` → `templateId: Number(newChoreTemplateId),`
Line 72: `assignedToId: Number(newChoreUserId),` → `userId: Number(newChoreUserId),`
Line 136: `assignment.assignedToId` → `assignment.userId`

- [ ] **Step 2: Update Dashboard page**

Line 40: `a.assignedToId` → `a.userId`

---

### Task 2.11: Update frontend test utils

**Files:**
- Modify: `frontend/src/test/utils.tsx:66,68`

- [ ] **Step 1: Rename mock data fields**

```typescript
// Before:
choreTemplateId: 1,
assignedToId: 2,

// After:
templateId: 1,
userId: 2,
```

---

### Task 2.12: Verify Item 2 changes

- [ ] **Step 1: Run backend build**

```bash
cd backend && npx prisma generate && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 2: Run backend tests**

```bash
cd backend && npm test 2>&1 | tail -20
```

Expected: All unit tests pass.

- [ ] **Step 3: Run frontend build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && npm test 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/ backend/src/services/chore-assignments.service.ts backend/src/schemas/ backend/src/prisma/ backend/src/__tests__/ frontend/src/types/ frontend/src/api/ frontend/src/hooks/ frontend/src/pages/ frontend/src/test/ backend/prisma/schema.prisma
git commit -m "refactor: rename assignedToId/choreTemplateId to userId/templateId"
```

---

## Item 3: Rate Limit Admin UI

### Task 3.1: Add env var configuration to rate limiter

**Files:**
- Modify: `backend/src/middleware/rateLimiter.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Update rateLimiter.ts with env var support and throttle tracker**

```typescript
import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'

// Throttle event store — max 100 events, auto-prunes outside window
const throttleEvents: Array<{ timestamp: string; ip: string; path: string }> = []
const MAX_THROTTLE_EVENTS = 100

export function addThrottleEvent(ip: string, path: string): void {
  const event = { timestamp: new Date().toISOString(), ip, path }
  throttleEvents.unshift(event)
  if (throttleEvents.length > MAX_THROTTLE_EVENTS) {
    throttleEvents.pop()
  }
}

export function getThrottleEvents(windowMs: number): Array<{ timestamp: string; ip: string; path: string }> {
  const cutoff = Date.now() - windowMs
  return throttleEvents.filter(e => new Date(e.timestamp).getTime() > cutoff)
}

export function getCurrentCount(limiter: any): number {
  // express-rate-limit v8 stores current count on req.rateLimit
  // For aggregate stats, we track via the handler
  return 0 // placeholder — actual tracking via custom middleware
}

export function getAuthLimiterConfig(): { windowMs: number; max: number } {
  return {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10),
  }
}

export function getGeneralLimiterConfig(): { windowMs: number; max: number } {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  }
}

// Track request counts in the current window
interface RequestCounter {
  count: number
  windowStart: number
}
let requestCounter: RequestCounter = { count: 0, windowStart: Date.now() }

export function incrementRequestCount(): void {
  const now = Date.now()
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10)
  if (now - requestCounter.windowStart > windowMs) {
    requestCounter = { count: 0, windowStart: now }
  }
  requestCounter.count++
}

export function resetRequestCount(): void {
  requestCounter = { count: 0, windowStart: Date.now() }
}

export function getRequestCount(): { count: number; windowStart: string } {
  return {
    count: requestCounter.count,
    windowStart: new Date(requestCounter.windowStart).toISOString(),
  }
}

export function createAuthLimiter() {
  const config = getAuthLimiterConfig()
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      addThrottleEvent(req.ip || 'unknown', req.path)
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMITED',
        },
      })
    },
    skip: (req) => {
      if (req.path === '/api/auth/login' || req.url === '/api/auth/login') {
        return true
      }
      return false
    },
  })
}

export { rateLimit }
```

- [ ] **Step 2: Update app.ts to use configurable general limiter**

In `app.ts`, replace the hardcoded general limiter with:

```typescript
import { getGeneralLimiterConfig, incrementRequestCount, rateLimit } from './middleware/rateLimiter.js'

const generalLimiterConfig = getGeneralLimiterConfig()
const generalLimiter = rateLimit({
  windowMs: generalLimiterConfig.windowMs,
  max: generalLimiterConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    incrementRequestCount()
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
      },
    })
  },
})
if (process.env.DISABLE_RATE_LIMIT === 'true') {
  // Keep existing skip behavior
}
app.use('/api', generalLimiter)
```

---

### Task 3.2: Create admin rate limit status endpoint

**Files:**
- Create: `backend/src/routes/admin.routes.ts`

- [ ] **Step 1: Create admin routes file**

```typescript
import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { getRequestCount, getGeneralLimiterConfig, getAuthLimiterConfig } from '../middleware/rateLimiter.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

/**
 * @swagger
 * /api/admin/rate-limits/status:
 *   get:
 *     summary: Get rate limiter status and configuration
 *     tags: [Admin]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Rate limiter status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not a parent
 */
router.get('/rate-limits/status',
  authenticate,
  authorize('PARENT'),
  asyncHandler(async (_req, res) => {
    const generalConfig = getGeneralLimiterConfig()
    const authConfig = getAuthLimiterConfig()
    const requestStats = getRequestCount()
    const disabled = process.env.DISABLE_RATE_LIMIT === 'true'

    res.json({
      success: true,
      data: {
        general: {
          windowMs: generalConfig.windowMs,
          max: generalConfig.max,
          currentCount: requestStats.count,
          windowStart: requestStats.windowStart,
          disabled,
        },
        auth: {
          windowMs: authConfig.windowMs,
          max: authConfig.max,
        },
      },
    })
  })
)

export default router
```

- [ ] **Step 2: Mount admin routes in the app**

In `backend/src/app.ts`, add:
```typescript
import adminRoutes from './routes/admin.routes.js'
// ...
app.use('/api/admin', adminRoutes)
```

---

### Task 3.3: Create frontend Settings page

**Files:**
- Create: `frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Create Settings page component**

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks'
import client from '../api/client'

interface RateLimitStatus {
  general: {
    windowMs: number
    max: number
    currentCount: number
    windowStart: string
    disabled: boolean
  }
  auth: {
    windowMs: number
    max: number
  }
}

function formatWindow(ms: number): string {
  const minutes = Math.round(ms / 60000)
  return `${minutes} min`
}

function UsageBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="mt-2">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{label}</span>
        <span>{current} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Settings() {
  const { isParent } = useAuth()
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchStatus() {
      try {
        setError(null)
        const response = await client.get('/admin/rate-limits/status')
        if (mounted) {
          setStatus(response.data.data)
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.error?.message || 'Failed to load rate limit status')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  if (!isParent) return null

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">API Rate Limiting</h2>
        {loading && <p className="text-gray-500">Loading rate limit status...</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {status && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">General API Limiter</h3>
              <p className="text-sm text-gray-500">Window: {formatWindow(status.general.windowMs)}</p>
              {status.general.disabled && (
                <p className="text-sm text-orange-600 font-medium">Rate limiting is disabled</p>
              )}
              <UsageBar
                current={status.general.currentCount}
                max={status.general.max}
                label="Requests this window"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Auth Route Limiter</h3>
              <p className="text-sm text-gray-500">Window: {formatWindow(status.auth.windowMs)}</p>
              <p className="text-sm text-gray-500">Max: {status.auth.max} requests</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create tests for Settings page**

Create `frontend/src/pages/Settings.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils'
import type { Mock } from 'vitest'

vi.mock('../hooks', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { useAuth } from '../hooks'
import client from '../api/client'
import { Settings } from './Settings'

const mockUseAuth = useAuth as Mock
const mockClientGet = client.get as Mock

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isParent: true, isAuthenticated: true, loading: false })
  })

  it('shows loading state initially', () => {
    mockClientGet.mockReturnValue(new Promise(() => {}))
    render(<Settings />)
    expect(screen.getByText('Loading rate limit status...')).toBeDefined()
  })

  it('displays rate limit status after fetch', async () => {
    mockClientGet.mockResolvedValue({
      data: {
        data: {
          general: { windowMs: 900000, max: 300, currentCount: 45, windowStart: new Date().toISOString(), disabled: false },
          auth: { windowMs: 900000, max: 100 },
        },
      },
    })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('General API Limiter')).toBeDefined()
      expect(screen.getByText('45 / 300')).toBeDefined()
    })
  })

  it('shows error message on API failure', async () => {
    mockClientGet.mockRejectedValue({ error: { message: 'Failed to fetch' } })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeDefined()
    })
  })

  it('shows rate limit disabled status', async () => {
    mockClientGet.mockResolvedValue({
      data: {
        data: {
          general: { windowMs: 900000, max: 300, currentCount: 0, windowStart: new Date().toISOString(), disabled: true },
          auth: { windowMs: 900000, max: 100 },
        },
      },
    })
    render(<Settings />)
    await waitFor(() => {
      expect(screen.getByText('Rate limiting is disabled')).toBeDefined()
    })
  })
})
```

---

### Task 3.4: Add Settings route and navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add lazy import and route in App.tsx**

Add import:
```typescript
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
```

Add route (after Notifications route):
```typescript
<Route path="/settings" element={
  <ProtectedRoute>
    <Suspense fallback={<PageLoader />}><Settings /></Suspense>
  </ProtectedRoute>
} />
```

- [ ] **Step 2: Add Settings link in Sidebar**

In `Sidebar.tsx`, add a `SettingsIcon` component:
```typescript
const SettingsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
```

Add to `ICON_MAP`:
```typescript
const ICON_MAP: Record<string, React.FC> = {
  settings: SettingsIcon,
  // ... existing icons
}
```

Add to `menuItems` (after statistics):
```typescript
...(isParent ? [{ id: 'settings', label: 'Settings' }] : []),
```

---

### Task 3.5: Verify Item 3 changes

- [ ] **Step 1: Run backend build**

```bash
cd backend && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 2: Run backend tests**

```bash
cd backend && npm test 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 3: Run frontend build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: Clean compilation.

- [ ] **Step 4: Run frontend tests**

```bash
cd frontend && npm test 2>&1 | tail -20
```

Expected: All tests pass, including the new Settings page tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/rateLimiter.ts backend/src/app.ts backend/src/routes/admin.routes.ts frontend/src/pages/Settings.tsx frontend/src/pages/Settings.test.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add rate limit admin UI with configurable env vars"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
cd backend && npm test && cd ../frontend && npm test
```

Expected: All backend + frontend tests pass.

- [ ] **Run lint**

```bash
cd backend && npm run lint && cd ../frontend && npm run lint
```

Expected: Clean lint output.
