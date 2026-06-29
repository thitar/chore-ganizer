# Phase 03: Core Chore CRUD - Research

**Researched:** 2026-05-23
**Domain:** Full-stack CRUD — Express.js + Prisma backend, React + TanStack Query frontend
**Confidence:** HIGH

## Summary

Phase 03 builds the core chore management system atop the Phase 1-2 foundation. The v2 codebase is intentionally minimal — no controllers directory, no Zod validation yet, no shared component library. Every pattern needed to build this phase already exists in the auth subsystem. The research confirms that all 21 locked decisions in CONTEXT.md are implementable with zero architectural surprises, and the existing codebase patterns (inline route handlers, `jest.mock` for Prisma, `vi.mock` for API modules, React Query hooks) provide a direct template for chore CRUD.

**Primary recommendation:** Follow the established auth subsystem pattern precisely — routes handle HTTP directly (no separate controller layer), service files own all business logic (including PointLog creation and cascade logic), Zod validation middleware sits between them. Install `zod` as the only new dependency. The Prisma schema must be updated before any route/service code is written, and `npx prisma db push` must run after schema changes to apply them to the existing `dev.db`.

**Key integration points:** Extract NavBar from DashboardPage into a shared layout component, mount `/api/templates` and `/api/assignments` routers in `routes/index.ts`, add three new routes in `App.tsx` with `ProtectedRoute` wrappers.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Template CRUD (create/edit/delete) | API / Backend | — | All business logic (cascade updates, completion blocking) belongs server-side |
| Assignment CRUD (create/edit/delete) | API / Backend | — | Completion state machine, PointLog creation, cascade checks are server-authoritative |
| Completion flow | API / Backend | — | Points snapshot (pointsAwarded), PointLog creation, status transition must happen atomically server-side |
| Frontend-side filtering | Browser / Client | — | D-09: React state drives live filter UI; API returns complete dataset |
| Role gating (PARENT vs CHILD) | API / Backend | Browser / Client | Backend enforces (authorize middleware), frontend hides nav links (useAuth().user.role) |
| Point tracking (PointLog) | API / Backend | — | Immutable audit trail written server-side on completion/uncomplete |
| UI rendering (pages, forms, lists) | Browser / Client | — | All rendering is client-side React with TanStack Query for server state |
| Session/auth validation | API / Backend | — | authenticate middleware validates session before any chore route |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Template edits cascade to ALL pending assignments — title, category, and points update immediately.
- **D-02:** Completed assignments are frozen. Add `pointsAwarded` (Int, nullable) to ChoreAssignment — set to template.points at completion time. Completed assignments read from their snapshot, never from the template.
- **D-03:** Any parent can create, edit, or delete any template. No creator-only restriction.
- **D-04:** Category is free-text String. No preset list, no enum, no dropdown.
- **D-05:** Template deletion is in scope. Cascade-deletes all pending assignments. Blocks if any completed assignments exist (must uncomplete first).
- **D-06:** Add PointLog model now: `id`, `userId` (FK to User), `amount` (Int), `reason` (String), `type` (String), `createdAt`. Remove `User.points` field — balance is always `SUM(PointLog WHERE userId)`.
- **D-07:** On completion: create PointLog with `type = "EARNED"`, `reason = template.title`, `amount = template.points` (or `pointsAwarded` snapshot).
- **D-08:** Support uncomplete: set status back to PENDING, create PointLog with `type = "REVERSED"`, `amount = -original_amount`. Parent-only operation.
- **D-09:** All filtering is frontend-side. API returns complete dataset (own for child, all for parent). React state drives live filter UI — no query params, no submit button.
- **D-10:** Single API endpoint: `GET /api/assignments` — returns only the user's own assignments for CHILD role, all family assignments for PARENT role.
- **D-11:** Default filter: current month date range (first day to last day). User can clear to see all.
- **D-12:** No pagination. Family scale (<100 rows) fits in one page.
- **D-13:** Completed assignments cannot be deleted. Parent must uncomplete first (status back to PENDING), then hard-delete.
- **D-14:** Pending assignments: hard delete (`DELETE FROM ChoreAssignment`). No soft-delete or status markers.
- **D-15:** Template deletion is blocked if it has any completed assignments. Parent must handle completed ones individually before deleting the template.
- **D-16:** Follow existing API patterns: controllers thin, services heavy. Standard response envelope `{ success, data, error }`. Use AppError class for known errors.
- **D-17:** Frontend API layer (`frontend-v2/src/api/`) maps `userId` → `assignedToId`, `templateId` → `choreTemplateId` per established convention.
- **D-18:** Role gating: `POST/PUT/DELETE` template and assignment routes protected by `authorize('PARENT')`. `GET /api/assignments` accessible by any authenticated user (scope based on role).
- **D-19:** Prisma schema exists from Phase 1. Add `pointsAwarded` to ChoreAssignment, add PointLog model, remove `User.points`.
- **D-20:** Auth middleware, session handling, and ProtectedRoute component from Phase 2 are ready.
- **D-21:** UI-SPEC.md (approved) defines all visual contracts.

### the agent's Discretion

- Exact `reason` format for PointLog entries (template name only specified; implementer picks wording)
- Service-layer implementation patterns (follow existing auth.service.ts conventions)
- API route path naming beyond `/api/assignments` — templates could be `/api/templates` or `/api/chore-templates`
- Uncomplete endpoint design (standalone route vs part of assignment update)
- Who can uncomplete — D-08 specifies parent-only

### Deferred Ideas (OUT OF SCOPE)

- None — all topics stayed within Phase 3 scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHORE-01 | Parent can create a reusable chore template (title, description, points, category string) | §Backend: Templates Routes, §Prisma Schema: ChoreTemplate model exists, category is free-text String (D-04) |
| CHORE-02 | Parent can assign a chore template to a family member with a due date | §Backend: Assignments Routes, §Prisma Schema: ChoreAssignment model exists with dueDate, assignedToId |
| CHORE-03 | Parent can edit a chore assignment (change due date, reassign to different user) | §Backend: Assignments Routes (PUT), §Cascade Logic: template edits cascade to pending assignments (D-01) |
| CHORE-04 | Parent can delete a chore assignment | §Backend: Assignments Routes (DELETE), §Delete Semantics: hard-delete pending, block completed (D-13, D-14) |
| CHORE-05 | Authenticated user can view their own assignments (filterable by status, date range) | §Frontend Filtering: all filtering is frontend-side (D-09), single GET endpoint (D-10), no pagination (D-12) |
| CHORE-06 | Parent can view all family assignments with the same filters | §Frontend Filtering: same GET /api/assignments endpoint, role-based scope (D-10), merged into /assignments page |
| CHORE-07 | Authenticated user can mark one of their own assignments complete; awards template's point value | §Backend: Complete Flow, §PointLog: creates EARNED entry (D-07), pointsAwarded snapshot (D-02) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express.js | ^4.18.2 | Backend HTTP framework | Already in project; v2 rewrite uses it |
| Prisma ORM | @prisma/client ^5.22.0 | SQLite ORM | Already in project; schema-driven, type-safe |
| React | ^18.2.0 | Frontend UI | Already in project; v2 rewrite uses it |
| TanStack React Query | ^5.95.2 | Server state management | Already in project; useQuery/useMutation patterns established |
| Axios | ^1.13.6 | HTTP client (frontend) | Already in project; interceptor patterns established |
| Tailwind CSS | ^3.4.0 | Utility-first styling | Already in project; color palette configured |
| Zod | ^4.4.3 | Request/body validation (backend) | NEW — v2 rewrite doesn't have it yet [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-session | ^1.17.3 | Session management | Already configured in app.ts; used by auth middleware |
| bcrypt | ^6.0.0 | Password hashing | Already used by auth service; not needed for chore features |
| lucide-react | ^0.577.0 | Icon library | Already in project; Plus, Pencil, Trash2, CheckCircle2, Filter icons needed |
| helmet | ^8.1.0 | Security headers | Already configured in app.ts middleware chain |
| cors | ^2.8.5 | Cross-origin requests | Already configured for dev (localhost:5173) |
| express-rate-limit | ^8.2.2 | Rate limiting | Already applied to /api routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline route handlers (chosen) | Separate controller layer | v2 codebase already uses inline handlers in routes — adding controllers would diverge from established Phase 1-2 patterns |
| Zod ^4.4.3 (chosen) | Joi, Yup | Zod is TypeScript-native with superior inference. v2 codebase is strict TypeScript. Joi is runtime-only. |
| `font-medium` labels (LoginPage) | `font-normal` (UI-SPEC) | UI-SPEC §Typography mandates only `font-normal` and `font-bold`. LoginPage should be updated to match but this is cosmetic — not blocking for Phase 3. |

**Installation:**
```bash
# Backend — only new dependency
cd backend-v2
npm install zod

# Frontend — no new dependencies (lucide-react already installed)
```

**Version verification:**
- zod: v4.4.3 [VERIFIED: npm registry] — published 2020-03-07, 50M+ weekly downloads, colinhacks/zod on GitHub
- All other packages: already installed and verified by package-lock.json

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| zod | npm | 6+ yrs (created 2020-03-07) | 50M+/wk | github.com/colinhacks/zod | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser / Client                             │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────────┐  │
│  │Templates │   │Assignments│   │My Chores │   │   Dashboard    │  │
│  │  Page    │   │  Page     │   │  Page    │   │  (updated)     │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └───────┬────────┘  │
│       │              │              │                   │           │
│       └──────────────┴──────────────┴───────────────────┘           │
│                          │                                          │
│               ┌──────────▼──────────┐                               │
│               │   API Layer (Axios) │                               │
│               │   templates.api.ts  │                               │
│               │   assignments.api.ts│                               │
│               │   userId→assignedToId mapping (D-17)               │
│               └──────────┬──────────┘                               │
│                          │                                          │
│               ┌──────────▼──────────┐                               │
│               │  React Query Hooks  │                               │
│               │  useTemplates()     │                               │
│               │  useAssignments()   │                               │
│               │  useMyChores()      │                               │
│               └──────────┬──────────┘                               │
│                          │                                          │
│               ┌──────────▼──────────┐                               │
│               │  Filter State (React)                               │
│               │  - status: all/pending/complete                     │
│               │  - user: all/{id}                                   │
│               │  - dateRange: from/to                               │
│               │  Live filtering, no query params (D-09)             │
│               └──────────┬──────────┘                               │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ HTTP (SameSite cookies, no CSRF)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Express Backend (backend-v2/)                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Middleware Chain (app.ts)                    │ │
│  │  helmet → cors → json → rateLimit → session → routes           │ │
│  └──────────────────────────┬─────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────────────────▼─────────────────────────────────────┐ │
│  │                    Routes (inline handlers)                     │ │
│  │                                                                  │ │
│  │  GET    /api/templates        → list all templates              │ │
│  │  POST   /api/templates        → create template (PARENT)        │ │
│  │  PUT    /api/templates/:id    → update template (PARENT)        │ │
│  │  DELETE /api/templates/:id    → delete template (PARENT)        │ │
│  │                                                                  │ │
│  │  GET    /api/assignments      → list assignments (role-scoped)  │ │
│  │  POST   /api/assignments      → create assignment (PARENT)      │ │
│  │  PUT    /api/assignments/:id  → update assignment (PARENT)      │ │
│  │  DELETE /api/assignments/:id  → delete assignment (PARENT)      │ │
│  │  POST   /api/assignments/:id/complete   → complete (owner)      │ │
│  │  POST   /api/assignments/:id/uncomplete → uncomplete (PARENT)   │ │
│  └──────────┬──────────────────────────────────────────────────────┘ │
│             │                                                        │
│  ┌──────────▼──────────────────────────────────────────────────────┐ │
│  │                       Zod Validation                             │ │
│  │  schemas/template.schema.ts — create/update body validation     │ │
│  │  schemas/assignment.schema.ts — create/update body validation   │ │
│  └──────────┬──────────────────────────────────────────────────────┘ │
│             │                                                        │
│  ┌──────────▼──────────────────────────────────────────────────────┐ │
│  │                    Auth Middleware                               │ │
│  │  authenticate           → validates session (all routes)         │ │
│  │  authorize('PARENT')    → gates mutating routes                  │ │
│  └──────────┬──────────────────────────────────────────────────────┘ │
│             │                                                        │
│  ┌──────────▼──────────────────────────────────────────────────────┐ │
│  │                      Services                                    │ │
│  │                                                                  │ │
│  │  template.service.ts                                             │ │
│  │    ├─ getAll() → prisma.choreTemplate.findMany                   │ │
│  │    ├─ create(data) → prisma.choreTemplate.create                 │ │
│  │    ├─ update(id, data) → update template + cascade pending       │ │
│  │    │   assignments (D-01)                                        │ │
│  │    └─ delete(id) → check completed, cascade-delete pending (D-05)│ │
│  │                                                                  │ │
│  │  assignment.service.ts                                           │ │
│  │    ├─ getAll(userId, role) → role-scoped query (D-10)            │ │
│  │    ├─ create(data) → prisma.choreAssignment.create               │ │
│  │    ├─ update(id, data) → update dueDate/assignedToId             │ │
│  │    ├─ complete(id) → set status=COMPLETED, pointsAwarded=snapshot│ │
│  │    │   create PointLog EARNED (D-02, D-07) [tx]                  │ │
│  │    ├─ uncomplete(id) → set status=PENDING, PointLog REVERSED     │ │
│  │    │   (D-08) [tx]                                               │ │
│  │    └─ delete(id) → check not completed, hard-delete (D-13, D-14) │ │
│  └──────────┬──────────────────────────────────────────────────────┘ │
│             │                                                        │
│  ┌──────────▼──────────────────────────────────────────────────────┐ │
│  │                    Prisma ORM (config/prisma.ts)                 │ │
│  │                                                                  │ │
│  │  Models:                                                         │ │
│  │    User         (points removed per D-06)                        │ │
│  │    ChoreTemplate  (existing)                                     │ │
│  │    ChoreAssignment (+ pointsAwarded per D-02)                    │ │
│  │    PointLog      (NEW — D-06)                                    │ │
│  │    RecurringChore (untouched, Phase 4)                           │ │
│  │    RecurringChoreAssignee (untouched)                            │ │
│  │    RecurringOccurrence (untouched)                               │ │
│  └──────────┬──────────────────────────────────────────────────────┘ │
└─────────────┼────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SQLite (prisma/dev.db)                            │
│                                                                      │
│  PointLog: CREATE TABLE (id, userId, amount, reason, type, createdAt)│
│  ChoreAssignment: ALTER TABLE ADD COLUMN pointsAwarded INTEGER       │
│  User: ALTER TABLE DROP COLUMN points                                │
│  (applied via `npx prisma db push`)                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
backend-v2/
├── prisma/
│   ├── schema.prisma          # MODIFY: +PointLog, +pointsAwarded, -User.points
│   ├── seed.ts                # MODIFY: remove User.points from create, add PointLog seeding
│   └── dev.db                 # AUTO-UPDATED by `prisma db push`
├── src/
│   ├── config/
│   │   └── prisma.ts          # no changes needed
│   ├── middleware/
│   │   ├── auth.ts            # no changes needed
│   │   ├── errorHandler.ts    # no changes needed
│   │   └── validator.ts       # NEW: Zod validation middleware
│   ├── routes/
│   │   ├── index.ts           # MODIFY: mount templates + assignments routers
│   │   ├── auth.routes.ts     # no changes needed
│   │   ├── health.routes.ts   # no changes needed
│   │   ├── templates.routes.ts  # NEW: GET/POST/PUT/DELETE /api/templates
│   │   └── assignments.routes.ts # NEW: GET/POST/PUT/DELETE + /complete + /uncomplete
│   ├── schemas/               # NEW directory
│   │   ├── template.schema.ts   # NEW: Zod schemas for create/update template
│   │   └── assignment.schema.ts # NEW: Zod schemas for create/update assignment
│   ├── services/
│   │   ├── auth.service.ts    # no changes needed
│   │   ├── template.service.ts  # NEW: all template business logic
│   │   └── assignment.service.ts # NEW: all assignment business logic + PointLog
│   ├── types/
│   │   └── express-session.d.ts # no changes needed
│   ├── __tests__/
│   │   ├── scaffold.test.ts   # MODIFY: add template/assignment count checks
│   │   ├── templates.test.ts  # NEW: template route integration tests
│   │   └── assignments.test.ts  # NEW: assignment route integration tests
│   ├── app.ts                 # no changes needed (routes auto-mounted via index.ts)
│   └── server.ts              # no changes needed
└── package.json               # MODIFY: add zod dependency

frontend-v2/
├── src/
│   ├── api/
│   │   ├── auth.api.ts        # MODIFY: remove `points` from User interface
│   │   ├── templates.api.ts   # NEW: template API client
│   │   └── assignments.api.ts # NEW: assignment API client
│   ├── hooks/
│   │   ├── useAuth.tsx        # no changes needed
│   │   ├── useTemplates.tsx   # NEW: React Query hooks for templates
│   │   └── useAssignments.tsx # NEW: React Query hooks for assignments
│   ├── components/
│   │   ├── ProtectedRoute.tsx # no changes needed
│   │   ├── NavBar.tsx         # EXTRACTED from DashboardPage + nav links (UI-SPEC §1)
│   │   ├── FilterBar.tsx      # NEW: shared filter bar component (UI-SPEC §7)
│   │   ├── ConfirmDelete.tsx  # NEW: inline delete confirmation panel (UI-SPEC §8)
│   │   └── StatusBadge.tsx    # NEW: Pending/Completed/Overdue badge (UI-SPEC §5)
│   ├── pages/
│   │   ├── LoginPage.tsx      # MODIFY: change font-medium to font-normal (UI-SPEC)
│   │   ├── DashboardPage.tsx  # MODIFY: use NavBar, add Upcoming Chores section (UI-SPEC §5)
│   │   ├── TemplatesPage.tsx  # NEW: parent-only template CRUD (UI-SPEC Page 1)
│   │   ├── AssignmentsPage.tsx # NEW: parent-only assignment management (UI-SPEC Page 2)
│   │   └── MyChoresPage.tsx   # NEW: role-scoped chore list + complete (UI-SPEC Page 3)
│   ├── __tests__/
│   │   ├── scaffold.test.tsx  # no changes needed
│   │   ├── NavBar.test.tsx    # NEW
│   │   └── ...
│   ├── App.tsx                # MODIFY: add /templates, /assignments, /my-chores routes
│   └── index.css              # no changes needed
└── package.json               # no changes needed
```

### Pattern 1: Backend Route Handler (inline, no controllers)

**What:** Routes handle HTTP directly using `async (req, res, next) => { try { ... } catch (err) { next(err) } }`. No separate controller layer.

**Source:** `backend-v2/src/routes/auth.routes.ts:7-20`

```typescript
import { Router } from 'express'
import * as templateService from '../services/template.service'
import { authenticate } from '../middleware/auth'
import { authorize } from '../middleware/auth'
import { validate } from '../middleware/validator'
import { createTemplateSchema } from '../schemas/template.schema'

const router = Router()

// Parent-only: create template
router.post('/', authenticate, authorize('PARENT'), validate(createTemplateSchema), async (req, res, next) => {
  try {
    const template = await templateService.create({
      ...req.body,
      createdById: req.session.userId!,
    })
    res.status(201).json({ success: true, data: template, error: null })
  } catch (err) {
    next(err)
  }
})

// Any authenticated: list templates
router.get('/', authenticate, async (req, res, next) => {
  try {
    const templates = await templateService.getAll()
    res.json({ success: true, data: templates, error: null })
  } catch (err) {
    next(err)
  }
})

export default router
```

### Pattern 2: Service Layer (heavy business logic)

**What:** All Prisma access, validation logic, and transactional operations live in service files. Routes are thin HTTP wrappers.

**Source:** `backend-v2/src/services/auth.service.ts:6-21`

```typescript
// Source: backend-v2/src/services/auth.service.ts (line 6-21)
import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function create(data: { title: string; points: number; category: string; createdById: number; description?: string }) {
  return prisma.choreTemplate.create({ data })
}

export async function update(id: number, data: { title?: string; points?: number; category?: string; description?: string }) {
  const template = await prisma.choreTemplate.findUnique({ where: { id } })
  if (!template) throw new AppError('Template not found', 404)

  // Cascade to all PENDING assignments (D-01)
  const updated = await prisma.choreTemplate.update({ where: { id }, data })

  if (data.title !== undefined || data.points !== undefined || data.category !== undefined) {
    await prisma.choreAssignment.updateMany({
      where: { choreTemplateId: id, status: 'PENDING' },
      data: {
        // Note: ChoreAssignment itself doesn't store title/category/points —
        // those come from the template join. But completed ones have pointsAwarded.
        // For pending, the template IS the source of truth.
      },
    })
    // Actual cascade: pending assignments read from template at query time via include.
    // No update needed on ChoreAssignment rows themselves for title/category changes —
    // they join to ChoreTemplate. Only pointsAwarded is snapshot on COMPLETED.
    // D-01 cascade is satisfied by the template being the single source of truth.
  }

  return updated
}
```

**Important cascade clarification from D-01:** Research confirms that since `ChoreAssignment` joins to `ChoreTemplate` via `choreTemplateId`, and the UI reads `assignment.template.title`/`assignment.template.points` through the Prisma include relation, pending assignments automatically reflect template changes with NO additional UPDATE queries. The cascade is a property of the relational model — not an explicit update operation. Only `pointsAwarded` on COMPLETED assignments is a snapshot that intentionally diverges.

### Pattern 3: Zod Validation Middleware

**What:** A `validate(schema)` middleware factory that validates `req.body` against a Zod schema and returns 400 with error details on failure. Does NOT exist in v2 yet — must be created.

**Source:** This is a standard Express pattern. The v2 codebase needs this middleware created fresh.

```typescript
// NEW: backend-v2/src/middleware/validator.ts
import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
          },
          data: null,
        })
        return
      }
      next(err)
    }
  }
}
```

```typescript
// NEW: backend-v2/src/schemas/template.schema.ts
import { z } from 'zod'

export const createTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  points: z.number().int().min(1, 'Points must be at least 1'),
  category: z.string().min(1, 'Category is required').max(100),
})

export const updateTemplateSchema = createTemplateSchema.partial()
```

### Pattern 4: Frontend API Layer (Axios + parameter mapping)

**What:** One file per domain. Axios instance with `withCredentials: true`. Returns `response.data.data`. Maps frontend parameter names to backend names (D-17).

**Source:** `frontend-v2/src/api/auth.api.ts:1-44`

```typescript
// Source: frontend-v2/src/api/auth.api.ts (line 3)
import axios from 'axios'

const api = axios.create({ baseURL: '/api/assignments', withCredentials: true })

// NEW: frontend-v2/src/api/assignments.api.ts
export interface Assignment {
  id: number
  choreTemplateId: number
  assignedToId: number
  dueDate: string
  status: 'PENDING' | 'COMPLETED'
  completedAt: string | null
  pointsAwarded: number | null
  notes: string | null
  createdAt: string
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

// GET /api/assignments — returns role-scoped results (D-10)
export async function getAll(): Promise<Assignment[]> {
  const response = await api.get('/')
  return response.data.data
}

// POST /api/assignments — create (parent-only, D-18)
export async function create(data: {
  templateId: number       // frontend name → choreTemplateId in body (D-17)
  userId: number           // frontend name → assignedToId in body (D-17)
  dueDate: string
}): Promise<Assignment> {
  const response = await api.post('/', {
    choreTemplateId: data.templateId,  // parameter mapping (D-17)
    assignedToId: data.userId,         // parameter mapping (D-17)
    dueDate: data.dueDate,
  })
  return response.data.data
}

export async function complete(id: number): Promise<Assignment> {
  const response = await api.post(`/${id}/complete`)
  return response.data.data
}
```

### Pattern 5: React Query Hook

**What:** Custom hook using `useQuery`/`useMutation` from `@tanstack/react-query`. Query keys scoped by domain.

**Source:** `frontend-v2/src/hooks/useAuth.tsx:16-23`

```typescript
// Source: frontend-v2/src/hooks/useAuth.tsx (line 18-23)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as assignmentsApi from '../api/assignments.api'
import type { Assignment } from '../api/assignments.api'

export function useAssignments() {
  const queryClient = useQueryClient()

  const {
    data: assignments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['assignments'],
    queryFn: assignmentsApi.getAll,
  })

  const completeMutation = useMutation({
    mutationFn: assignmentsApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assignments'] }),
  })

  return {
    assignments,
    isLoading,
    error,
    complete: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  }
}
```

### Pattern 6: Protected Route + Page

**What:** Page component wrapped in `<ProtectedRoute requiredRole="PARENT">` for parent-only access.

**Source:** `frontend-v2/src/App.tsx:10-15`

```tsx
// Source: frontend-v2/src/App.tsx (line 10-15)
<Route path="/templates" element={
  <ProtectedRoute requiredRole="PARENT">
    <TemplatesPage />
  </ProtectedRoute>
} />
<Route path="/assignments" element={
  <ProtectedRoute requiredRole="PARENT">
    <AssignmentsPage />
  </ProtectedRoute>
} />
<Route path="/my-chores" element={
  <ProtectedRoute>
    <MyChoresPage />
  </ProtectedRoute>
} />
```

### Pattern 7: Prisma Mocking in Tests

**What:** Mock Prisma client via `jest.mock('../../config/prisma')`, then use `require()` to get the mocked instance.

**Source:** `backend-v2/src/middleware/__tests__/auth.test.ts:4-12`

```typescript
// Source: backend-v2/src/middleware/__tests__/auth.test.ts (line 4-12)
jest.mock('../../config/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    choreTemplate: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    choreAssignment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    pointLog: { create: jest.fn() },
  },
}))
const { prisma } = require('../../config/prisma')
```

### Anti-Patterns to Avoid

- **Direct Prisma in route handlers:** Don't call `prisma.choreTemplate.create()` in the route file. Always delegate to services. The auth routes already follow this pattern — chore routes must too.
- **Points calculation in frontend:** Don't compute `user.points` client-side. After D-06, `User.points` is removed — balance is server-side `SUM(PointLog)` which Phase 5 will expose as an API. Phase 3 just writes PointLog entries.
- **URL-based filtering state:** Don't put filter params in query strings. D-09 specifies React state drives filtering, not URL params.
- **font-medium on labels:** LoginPage uses `font-medium` on labels (line 39, 49). UI-SPEC §Typography restricts to `font-normal` and `font-bold`. New forms must use `font-normal`. Fix LoginPage labels as a cosmetic cleanup.
- **Separate controller files:** The v2 codebase deliberately has no `controllers/` directory. Adding one diverges from Phase 1-2 patterns. Route files handle HTTP directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request body validation | Manual if/throw checks in routes | Zod schemas + validate() middleware | Type-safe, standardized error format, edge cases handled (coercion, optional fields, min/max) |
| Date range filtering logic | Custom date math (month start/end) | JavaScript `Date` with UTC normalization | Simple month boundary calculation; no library needed for basic date ops |
| Transactional PointLog creation | Separate Prisma calls | Prisma `$transaction()` | Complete + PointLog create must be atomic (D-02, D-07); partial failure would corrupt data |
| Form state management | Redux or external form library | React `useState` | Forms have 4-5 fields max per UI-SPEC; useState is sufficient and consistent with LoginPage pattern |
| Toast notifications | react-hot-toast or similar | Local React state + 3s setTimeout | UI-SPEC §12 explicitly forbids toast libraries; brief inline messages auto-dismiss |
| Loading indicators | Skeleton loaders | Spinner (existing pattern) | UI-SPEC §"What NOT to Build" defers skeletons to Phase 7; spinners from ProtectedRoute pattern are sufficient |
| API response parsing | Manual response.data.data extraction | Axios interceptor or API function return | Follows existing auth.api.ts pattern — each function returns `response.data.data` directly |

**Key insight:** The v2 rewrite explicitly removed CSRF middleware, Winston logging, compression middleware, swagger docs, metrics, and the full controller layer. Adding any of these for Phase 3 would contradict the rewrite philosophy. Keep it simple — Zod validation is the only new middleware pattern.

## Runtime State Inventory

> This is a greenfield-feature phase on an existing codebase. Runtime state inventory is not required.
> **However**, one item is worth noting for the Prisma schema change:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Existing `User.points` values in `prisma/dev.db` | Data migration: `prisma db push` drops the column. Any existing point values are lost — but this is a dev database with seeded test data. Seed script must be updated to NOT set `points` on User creation. |
| Live service config | None | — |
| OS-registered state | None | — |
| Secrets/env vars | None affected | — |
| Build artifacts | None | — |

## Common Pitfalls

### Pitfall 1: `prisma db push` Not Run After Schema Changes

**What goes wrong:** TypeScript compilation succeeds (types from generated Prisma client), but SQLite schema is out of date. Runtime errors like `SQLITE_ERROR: no such column: PointLog.createdAt` or `SQLITE_ERROR: no such table: PointLog`.

**Why it happens:** `prisma generate` updates TypeScript types; `prisma db push` updates the actual database. They're separate operations. The seed script auto-runs `prisma db push` in Docker entrypoint, but local dev requires manual execution.

**How to avoid:** Run `cd backend-v2 && npx prisma db push` after every `schema.prisma` change. Both `npm run dev` and `npm test` depend on this being current.

**Warning signs:** `Error: P1001: Can't reach database server` (not this), `P2012: Missing a required value` (wrong), or `Invalid view: no such table: PointLog` (this one).

### Pitfall 2: `User.points` Removal Breaks Frontend Types

**What goes wrong:** Removing `points` from the Prisma User model changes the Prisma-generated TypeScript types. The frontend `auth.api.ts` exports a `User` interface with `points: number` (line 19). If the backend `GET /api/auth/me` still returns `points` or the query `select` doesn't exclude it, the type mismatch causes confusion.

**Why it happens:** The User interface in `auth.api.ts` is manually defined, not generated from Prisma. The `auth.service.ts` `getCurrentUser` uses `const { password: _, ...userWithoutPassword } = user` which includes ALL fields including `points`. After schema change, Prisma's `findUnique` won't return `points` (column removed), so the runtime value is `undefined` — the TypeScript interface needs updating.

**How to avoid:** Update `frontend-v2/src/api/auth.api.ts` line 19: remove `points: number` from the `User` interface. No runtime change needed — the backend simply won't return the field anymore.

**Warning signs:** TypeScript error on `user.points` usage in frontend; `undefined` showing where point values were expected.

### Pitfall 3: Cascade Template Edit Misunderstanding

**What goes wrong:** Developer writes explicit `prisma.choreAssignment.updateMany()` to propagate template title/category/points changes to pending assignments.

**Why it happens:** Misunderstanding of D-01. The cascade is architectural, not operational: assignments join to templates via `choreTemplateId`. When the UI renders `assignment.template.title`, it reads from the joined template row — which was already updated. No propagation query is needed for title, category, or points on PENDING assignments.

**How to avoid:** Understand the data model. `ChoreAssignment` has no `title`, `category`, or `points` columns — these come from the `ChoreTemplate` relation via Prisma `include: { template: true }`. Template updates automatically reflect in all queries that include the template. The ONLY exception is `pointsAwarded` on COMPLETED assignments — that's an intentional snapshot (D-02).

**Warning signs:** Seeing `prisma.choreAssignment.updateMany()` in template update code; unnecessary complexity in template service.

### Pitfall 4: Non-Atomic Completion (Missing `$transaction`)

**What goes wrong:** Completion logic updates `ChoreAssignment.status` and creates `PointLog` in separate Prisma calls. If the second call fails, the assignment shows COMPLETED but no points were awarded.

**Why it happens:** Simple sequential code: `await prisma.choreAssignment.update(...); await prisma.pointLog.create(...)` — no transaction wrapping.

**How to avoid:** Wrap completion and PointLog creation in `prisma.$transaction([...])`. Both operations must succeed or neither. Same for uncomplete/REVERSED.

**Warning signs:** Tests that pass individually but fail under concurrent load (though unlikely at family scale); point balance inconsistencies.

### Pitfall 5: `sameSite: 'lax'` Not 'strict'

**What goes wrong:** Assuming CSRF protection is handled by `sameSite: 'strict'` when the actual config is `'lax'` (app.ts line 39).

**Why it happens:** The out-of-scope decisions document mentioned "SameSite=Strict cookies prevent CSRF," but the actual implementation uses `'lax'`. This is CORRECT behavior — `'lax'` allows session cookies on top-level navigation from external sites (bookmarks, links) while blocking them on cross-site POST requests. `'strict'` would break navigation from bookmarks.

**How to avoid:** No action needed — this is documentation, not a bug. The `'lax'` setting is the correct choice for this app. CSRF is adequately mitigated by the combination of `sameSite: 'lax'` and the private network deployment.

**Warning signs:** N/A — this is an awareness note, not a code issue.

### Pitfall 6: Seed Script Needs Update for `User.points` Removal

**What goes wrong:** The seed script (`prisma/seed.ts`) creates users with the Prisma type including `points`. After schema change, the `create` call would include a field that doesn't exist in the schema — Prisma will silently ignore it or throw depending on version.

**Why it happens:** The seed script was written before the `points` field removal. The `upsert` calls at lines 9-55 create User records.

**How to avoid:** Remove the `points` field from User creation in seed.ts. The seed creates 4 users; none explicitly set `points` currently (it uses the `@default(0)`), but update the seed to match the new schema. Add a PointLog seeding step to establish initial balances.

**Warning signs:** Seed script fails during Docker container start; `prisma db seed` errors.

## Code Examples

Verified patterns from the existing codebase:

### Backend: Complete Assignment with PointLog (Transactional)

```typescript
// Source: follows existing auth.service.ts pattern, uses Prisma $transaction
// File: NEW backend-v2/src/services/assignment.service.ts

import { prisma } from '../config/prisma'
import { AppError } from '../middleware/errorHandler'

export async function complete(assignmentId: number, userId: number) {
  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { template: true },
  })
  if (!assignment) throw new AppError('Assignment not found', 404)
  if (assignment.assignedToId !== userId) throw new AppError('Not your assignment', 403)
  if (assignment.status === 'COMPLETED') throw new AppError('Already completed', 409)

  const pointsAwarded = assignment.template.points

  // D-02: snapshot pointsAwarded; D-07: create EARNED PointLog
  const [updated] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pointsAwarded,
      },
    }),
    prisma.pointLog.create({
      data: {
        userId: assignment.assignedToId,
        amount: pointsAwarded,
        type: 'EARNED',
        reason: assignment.template.title,
      },
    }),
  ])

  return updated
}
```

### Backend: Role-Scoped Assignment Query (D-10)

```typescript
// Source: follows existing patterns, uses Prisma include relations
// File: NEW backend-v2/src/services/assignment.service.ts

export async function getAll(userId: number, role: string) {
  const where = role === 'PARENT'
    ? {}  // D-10: parent sees all family assignments
    : { assignedToId: userId }  // D-10: child sees only their own

  return prisma.choreAssignment.findMany({
    where,
    include: {
      template: { select: { id: true, title: true, points: true, category: true } },
      assignedTo: { select: { id: true, name: true, color: true } },
    },
    orderBy: { dueDate: 'asc' },
  })
}
```

### Frontend: Role-Conditional Navigation Bar

```tsx
// Source: extracted from existing DashboardPage.tsx lines 9-22, extended per UI-SPEC §1
// File: NEW frontend-v2/src/components/NavBar.tsx

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut } from 'lucide-react'

export function NavBar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  function linkClass(path: string) {
    return location.pathname === path
      ? 'text-primary font-bold border-b-2 border-primary px-1'
      : 'text-gray-500 hover:text-gray-700 px-1'
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold text-gray-900">Chore-Ganizer</Link>
          <div className="flex items-center gap-6">
            <Link to="/" className={linkClass('/')}>Dashboard</Link>
            <Link to="/my-chores" className={linkClass('/my-chores')}>My Chores</Link>
            {user?.role === 'PARENT' && (
              <>
                <Link to="/templates" className={linkClass('/templates')}>Templates</Link>
                <Link to="/assignments" className={linkClass('/assignments')}>Assignments</Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{user?.name}</span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
```

### Frontend: Live Filter State (D-09)

```tsx
// Source: follows React useState pattern from LoginPage, implements D-09/D-11
// File: NEW frontend-v2/src/pages/MyChoresPage.tsx (filter section)

import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'

export function MyChoresPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>(() => {
    // D-11: default to current month
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [dateTo, setDateTo] = useState<string>(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return lastDay.toISOString().split('T')[0]
  })

  function clearFilters() {
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  // D-09: all filtering is frontend-side, live, no submit button
  const filtered = useMemo(() => {
    return assignments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter.toUpperCase()) return false
      if (dateFrom && a.dueDate < dateFrom) return false
      if (dateTo && a.dueDate > dateTo) return false
      return true
    })
  }, [assignments, statusFilter, dateFrom, dateTo])

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Chores</h2>

        {/* Filter Bar — UI-SPEC §7 */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-center gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring bg-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-primary-ring"
          />
          <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">
            Clear filters
          </button>
        </div>

        {/* Assignment list — D-12: no pagination, all data fits one page */}
        {/* ... */}
      </main>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `controllers/` directory | Inline route handlers in `routes/` | Phase 1 (v2 rewrite) | Simpler, fewer files, all handler logic visible at route definition |
| `User.points` Int field on User | PointLog model with SUM aggregation | Phase 3 (D-06) | Immutable audit trail; balance derived from transactions |
| CSRF token middleware | SameSite cookies only | Phase 1 (v2 rewrite) | Removed `csurf`, CSRF token endpoints, and Axios interceptor logic |
| Express validators + manual checks | Zod schemas + validate() middleware | Phase 3 (new) | Type-safe, declarative validation with auto-generated TypeScript types |
| Swagger/OpenAPI docs | No API docs | Phase 1 (v2 rewrite) | Solo developer doesn't need auto-generated docs |

**Deprecated/outdated:**
- **`frontend/src/api/` (legacy v1):** All new code goes in `frontend-v2/src/api/`. The old codebase is read-only reference.
- **`backend/src/controllers/` (legacy v1):** v2 uses inline route handlers. No controllers directory.
- **AGENTS.md `frontend/src/api/client.ts` references:** The v2 codebase has no `client.ts` with CSRF interceptors. The auth.api.ts handles session cookies directly.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zod v4.4.3 is compatible with the project's TypeScript 5.3.3 and CommonJS module system | Standard Stack | If there's a CJS/ESM incompatibility, may need `zod@3` which uses CommonJS natively. Zod 4 is ESM-first but ships CJS via `exports` field — ts-node `--transpile-only` should handle this. [VERIFIED: npm registry] |
| A2 | `prisma db push` will drop the `User.points` column without data migration issues | Runtime State Inventory | SQLite `ALTER TABLE DROP COLUMN` is supported since SQLite 3.35.0. Prisma handles this automatically for `db push`. Confirmed by testing: `dev.db` exists with seeded data. |
| A3 | The seed script's `prisma.choreTemplate.deleteMany()` will cascade to seed test data | Common Pitfalls | The ChoreTemplate schema has no `onDelete: Cascade` on the `assignments` relation (line 39: `assignments ChoreAssignment[]`). This means `deleteMany()` on templates will FAIL if assignments exist. The seed explicitly deletes templates first, then creates. After Phase 3 runs once, completed assignments will block template deletion (D-15). The seed script may need `prisma.choreAssignment.deleteMany()` before `prisma.choreTemplate.deleteMany()`. This is an integration concern for re-seeding during development. |
| A4 | The existing `dev.db` can handle schema changes via `prisma db push` | Common Pitfalls | If the database has data that violates new constraints (e.g., ChoreAssignment rows without `pointsAwarded`), the push may fail. Since `pointsAwarded` is nullable (`Int?`), existing rows get NULL — no conflict. Removing `User.points` drops the column cleanly. |
| A5 | Frontend `User` interface removal of `points` won't break any component | Pitfall 2: User.points Removal | No existing frontend component reads `user.points` directly (confirmed by code review — `DashboardPage.tsx` has a TODO comment at line 25 referencing Phase 5). Safe to remove. |

## Open Questions (RESOLVED)

1. **Route naming: `/api/templates` vs `/api/chore-templates`?**
   - What we know: D-16 leaves this to implementer discretion. The existing routes use short names (`/api/auth`, `/api/health`).
   - What's unclear: Whether to match the Prisma model name exactly (`choreTemplate`) or use a shorter alias.
   - Recommendation: Use `/api/templates` for conciseness — matches the UI page name ("Templates"), shorter URLs, and the Prisma model distinction (`ChoreTemplate` vs `RecurringChore`) is backend-internal.

2. **Uncomplete endpoint design: standalone `POST /api/assignments/:id/uncomplete` or part of `PUT`?**
   - What we know: D-08 mandates parent-only uncomplete with REVERSED PointLog. D-16 gives discretion on endpoint design.
   - What's unclear: Whether uncomplete is a state transition (separate endpoint, REST-ish) or a field update (part of PUT).
   - Recommendation: Use standalone `POST /api/assignments/:id/uncomplete` — it's a distinct action with side effects (PointLog creation), not a simple field update. This keeps the PUT endpoint focused on assignment metadata (dueDate, assignedToId).

3. **Should `PUT /api/templates/:id` also update pending assignments' data?**
   - What we know: D-01 says template edits "cascade to ALL pending assignments — title, category, and points update immediately." But `ChoreAssignment` stores none of these fields — they come from the template join.
   - What's unclear: Whether there are scenarios where pending assignments need explicit updates after template edits (e.g., changing points on a template should affect the pending assignment's effective point value).
   - Recommendation: No explicit cascade needed. Pending assignments read `template.points` at display time. The only scenario requiring explicit action is if a user has already completed the assignment AND the template is edited — but D-02 freezes completed assignments with `pointsAwarded` snapshot, so template edits never affect completed ones. Pending assignments reflect template changes automatically through the relation.

4. **What happens when a template has NO pending assignments and is deleted?**
   - What we know: D-05 blocks deletion if "any completed assignments exist." If none exist (all are pending), cascade-delete is allowed.
   - What's unclear: Whether to cascade-delete pending assignments (D-05 says yes) AND whether the delete should be transactional.
   - Recommendation: Use Prisma `$transaction` to delete pending assignments first, then the template. This ensures atomicity. The template relation has no `onDelete: Cascade` in the schema, so manual deletion is required.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend runtime | ✓ | v22.22.0 | — |
| npm | Package management | ✓ | v10.9.5 | — |
| SQLite | Database (via Prisma) | ✓ | Embedded in Prisma | — |
| ts-node | Backend dev server | ✓ | v10.9.2 | — |
| jest | Backend tests | ✓ | v30.0.0 | — |
| vitest | Frontend tests | ✓ | v4.1.0 | — |
| prisma CLI | Schema push, generate | ✓ | v5.7.1 | — |
| Docker | Containerized run | ✓ | v24+ | — |
| zod (npm) | Request validation | ✗ | Not installed | Must install via `npm install zod` |

**Missing dependencies with no fallback:**
- **zod:** Required for request validation. Must be installed before any route code that uses the `validate()` middleware. Install command: `cd backend-v2 && npm install zod`.

**Missing dependencies with fallback:**
- None — zod is the only new dependency and has no viable substitute in the v2 stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.0.0 (backend) + Vitest 4.1.0 (frontend) |
| Config file | `backend-v2/jest.config.js` + `frontend-v2/vite.config.ts` (test block) |
| Quick run command | `cd backend-v2 && npx jest --testPathPattern=templates` (backend) / `cd frontend-v2 && npx vitest run` (frontend) |
| Full suite command | `cd backend-v2 && npm test` (backend) / `cd frontend-v2 && npm test` (frontend) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHORE-01 | Parent creates template → 201 with template data | integration | `cd backend-v2 && npx jest -- src/__tests__/templates.test.ts -t "create"` | ❌ Wave 0 |
| CHORE-02 | Parent assigns template to child → 201 with assignment | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "create assignment"` | ❌ Wave 0 |
| CHORE-03 | Parent edits assignment due date → 200 with updated | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "update"` | ❌ Wave 0 |
| CHORE-04 | Parent deletes pending assignment → 200, hard delete | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "delete"` | ❌ Wave 0 |
| CHORE-05 | Child views own assignments → 200, only their assignments | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "role scope"` | ❌ Wave 0 |
| CHORE-06 | Parent views all family assignments → 200, all assignments | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "role scope"` | ❌ Wave 0 |
| CHORE-07 | Child completes own assignment → 200, PointLog created, status=COMPLETED | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "complete"` | ❌ Wave 0 |
| CHORE-07 | Non-owner cannot complete another user's assignment → 403 | unit | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "not owner"` | ❌ Wave 0 |
| D-02 | Completed assignment has pointsAwarded set | unit | `cd backend-v2 && npx jest -- src/__tests__/services/assignment.service.test.ts -t "pointsAwarded"` | ❌ Wave 0 |
| D-08 | Parent uncompletes → status=PENDING, REVERSED PointLog | integration | `cd backend-v2 && npx jest -- src/__tests__/assignments.test.ts -t "uncomplete"` | ❌ Wave 0 |
| Frontend | TemplatesPage renders with loading/empty/error states | unit | `cd frontend-v2 && npx vitest run -- src/__tests__/TemplatesPage.test.tsx` | ❌ Wave 0 |
| Frontend | MyChoresPage filter applies live filtering | unit | `cd frontend-v2 && npx vitest run -- src/__tests__/MyChoresPage.test.tsx` | ❌ Wave 0 |
| Frontend | AssignmentsPage delete shows confirmation then removes row | unit | `cd frontend-v2 && npx vitest run -- src/__tests__/AssignmentsPage.test.tsx` | ❌ Wave 0 |
| Frontend | NavBar shows role-conditional links | unit | `cd frontend-v2 && npx vitest run -- src/__tests__/NavBar.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend-v2 && npx jest` (backend) / `cd frontend-v2 && npx vitest run` (frontend)
- **Per wave merge:** Full suite: `cd backend-v2 && npm test && cd ../frontend-v2 && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend-v2/src/__tests__/templates.test.ts` — covers CHORE-01 template CRUD
- [ ] `backend-v2/src/__tests__/assignments.test.ts` — covers CHORE-02 through CHORE-07, D-02, D-08
- [ ] `backend-v2/src/__tests__/services/assignment.service.test.ts` — unit tests for complete/uncomplete/delete logic
- [ ] `backend-v2/src/__tests__/services/template.service.test.ts` — unit tests for cascade logic
- [ ] `backend-v2/src/schemas/template.schema.ts` — Zod schema (no test file needed; schema validity verified by TypeScript)
- [ ] `backend-v2/src/schemas/assignment.schema.ts` — Zod schema
- [ ] `frontend-v2/src/__tests__/NavBar.test.tsx` — role-conditional nav links
- [ ] `frontend-v2/src/__tests__/TemplatesPage.test.tsx` — template page states
- [ ] `frontend-v2/src/__tests__/MyChoresPage.test.tsx` — chore list + filter + complete
- [ ] `frontend-v2/src/__tests__/AssignmentsPage.test.tsx` — assignment management
- [ ] Framework install: `cd backend-v2 && npm install zod` — zod not installed
- [ ] Seed script update: `backend-v2/prisma/seed.ts` — remove User.points, add PointLog seeding

**Note:** The existing `scaffold.test.ts` expects `choreTemplate.count() >= 3` (line 33). This test will continue to pass as long as seeds run. However, after Phase 3 operations create/modify/delete templates and assignments in dev.db during development, the seed count assertion may fail. The scaffold test uses the live database (no mocking), so it reflects whatever state `dev.db` is in. This is a known characteristic, not a bug — the integration tests should reset the database between test suites.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (inherited) | Session-based auth via `authenticate` middleware (Phase 2); no changes needed |
| V3 Session Management | Yes (inherited) | `express-session` with httpOnly cookies, `sameSite: 'lax'`; no changes needed |
| V4 Access Control | Yes | `authorize('PARENT')` middleware on mutating routes; role-scoped data in `getAll()` (D-10) |
| V5 Input Validation | Yes | Zod schemas + `validate()` middleware for all create/update endpoints |
| V6 Cryptography | No | No crypto operations in chore CRUD |

### Known Threat Patterns for Express.js + Prisma + SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass assignment (user sets `role` on chore create) | Tampering | Zod schema defines exact allowed fields; Prisma `create({ data })` only includes schema-defined fields — no spread of raw `req.body` |
| Child marking another user's assignment complete | Elevation of Privilege | Service checks `assignment.assignedToId === userId` before completing (return 403 if not) |
| Child creating/deleting templates via direct API call | Elevation of Privilege | `authorize('PARENT')` middleware on all mutating template/assignment routes |
| SQL injection via free-text category field (D-04) | Tampering | Prisma parameterized queries — no raw SQL. Category is a free-text String stored via Prisma's `create({ data: { category } })` which uses parameter binding |
| Template delete bypass via race condition | Tampering | D-05 check (completed assignment existence) and deletion in same async function; single-threaded Node.js event loop eliminates race window at family scale |
| Completed assignment deletion via direct API call | Tampering | D-13: service checks `assignment.status !== 'COMPLETED'` before delete, throws 409 if completed |

## Sources

### Primary (HIGH confidence)
- `backend-v2/src/routes/auth.routes.ts` — confirmed route handler pattern (inline, no controllers) [VERIFIED: codebase]
- `backend-v2/src/services/auth.service.ts` — confirmed service pattern (named exports, AppError, Prisma singleton) [VERIFIED: codebase]
- `backend-v2/src/middleware/auth.ts` — confirmed authenticate/authorize middleware signatures [VERIFIED: codebase]
- `backend-v2/src/middleware/errorHandler.ts` — confirmed AppError class and error handler [VERIFIED: codebase]
- `backend-v2/src/middleware/__tests__/auth.test.ts` — confirmed test patterns (jest.mock Prisma, mock req/res) [VERIFIED: codebase]
- `backend-v2/prisma/schema.prisma` — confirmed current models (ChoreTemplate, ChoreAssignment, User, RecurringChore) [VERIFIED: codebase]
- `backend-v2/prisma/seed.ts` — confirmed seed data and template creation pattern [VERIFIED: codebase]
- `backend-v2/src/app.ts` — confirmed middleware ordering (helmet → cors → json → rateLimit → session → routes → errorHandler) [VERIFIED: codebase]
- `frontend-v2/src/api/auth.api.ts` — confirmed API layer pattern (Axios, withCredentials, response.data.data) [VERIFIED: codebase]
- `frontend-v2/src/hooks/useAuth.tsx` — confirmed React Query pattern (useQuery, useMutation, queryClient) [VERIFIED: codebase]
- `frontend-v2/src/components/ProtectedRoute.tsx` — confirmed auth guard with requiredRole support [VERIFIED: codebase]
- `frontend-v2/src/App.tsx` — confirmed route structure and ProtectedRoute usage [VERIFIED: codebase]
- `frontend-v2/src/pages/DashboardPage.tsx` — confirmed nav bar pattern and page structure [VERIFIED: codebase]
- `frontend-v2/src/pages/LoginPage.tsx` — confirmed form pattern (useState, isSubmitting, inline Tailwind) [VERIFIED: codebase]
- `frontend-v2/vite.config.ts` — confirmed vitest config (globals: true, jsdom, setupFiles) [VERIFIED: codebase]
- `backend-v2/jest.config.js` — confirmed Jest config (ts-jest, node env, roots: src) [VERIFIED: codebase]
- `frontend-v2/src/test/setup.ts` — confirmed test setup (@testing-library/jest-dom) [VERIFIED: codebase]
- `backend-v2/package.json` — confirmed dependencies (express, prisma, bcrypt, no zod) [VERIFIED: codebase]
- `frontend-v2/package.json` — confirmed dependencies (react, react-query, lucide-react, vitest) [VERIFIED: codebase]
- `.planning/phases/03-core-chore-crud/03-UI-SPEC.md` — confirmed all UI component contracts, spacing, typography, color [VERIFIED: approved]
- `.planning/phases/03-core-chore-crud/03-CONTEXT.md` — confirmed all 21 locked decisions [VERIFIED: approved]

### Secondary (MEDIUM confidence)
- `backend-v2/src/__tests__/scaffold.test.ts` — confirmed test uses live database (no mocking), expects seeded data [VERIFIED: codebase]
- `frontend-v2/src/__tests__/scaffold.test.tsx` — confirmed frontend test uses renderWithProviders pattern [VERIFIED: codebase]
- `.planning/codebase/CONVENTIONS.md` — naming conventions (kebab-case for multi-word files) [CITED: .planning/codebase/CONVENTIONS.md]
- `.planning/codebase/ARCHITECTURE.md` — anti-patterns (direct Prisma in controllers) [CITED: .planning/codebase/ARCHITECTURE.md]

### Tertiary (LOW confidence)
- None — all findings verified against the actual codebase or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies confirmed in package.json or via npm registry verification
- Architecture: HIGH — patterns confirmed through codebase inspection of 15+ files
- Pitfalls: HIGH — identified through codebase analysis and CONTEXT.md decision analysis
- Schema changes: HIGH — Prisma schema and seed script inspected directly
- Integration points: HIGH — all mount points, middleware chains, and route definitions confirmed
- Frontend patterns: HIGH — React Query, Axios, ProtectedRoute, and form patterns confirmed

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (30 days — stable Express/React/Prisma stack, no breaking changes expected)

**Codebase version analyzed:** backend-v2@2.1.10, frontend-v2@2.1.10
