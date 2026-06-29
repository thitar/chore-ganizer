# Phase 04: Recurring Chores — Research

**Researched:** 2026-05-23
**Domain:** Full-stack recurring chore system — Prisma + Express backend, React + TanStack Query frontend
**Confidence:** HIGH

## Summary

Phase 4 builds daily/weekly/monthly recurring chores with lazy on-demand occurrence generation. The Prisma schema already has RecurringChore, RecurringChoreAssignee, and RecurringOccurrence models from Phase 1 scaffolding. However, RECUR-05 mandates fixed assignment only — the RecurringChoreAssignee many-to-many table is unnecessary overhead. The plan must simplify the schema and add lazy generation logic that piggybacks on the existing `GET /api/assignments` endpoint, making occurrences indistinguishable from regular assignments to the frontend.

**Primary recommendation:** Simplify RecurringChore (add `assignedToId` directly, drop RecurringChoreAssignee table). Implement a `generateOccurrences(from, to)` function called lazily by the assignment service's `getAll()`. Recurring occurrences appear in the same API response as regular assignments — no new frontend data hooks needed. Add a new RecurringChoresPage for parent management (create, delete).

---

## User Constraints

### From ROADMAP.md Phase 4 Goal

- **RECUR-01:** Parent creates recurring chore with frequency (daily / weekly on specific weekday / monthly on specific day-of-month) and a fixed assignee.
- **RECUR-02:** Occurrences generated lazily on demand — no background cron. Generated when viewing assignments for a date window.
- **RECUR-03:** User can complete a recurring occurrence; completion awards template points.
- **RECUR-04:** Parent deletes recurring chore; future (incomplete) occurrences removed; completed preserved.
- **RECUR-05:** One fixed assignee per recurring chore (no round-robin, no mixed modes).

### Existing Architecture Constraints

- Phase 3 established the `GET /api/assignments` response shape: `{ id, status, dueDate, pointsAwarded, completedAt, template: { id, title, points, category }, assignedTo: { id, name, color } }` with role-scoping.
- The frontend MyChoresPage, AssignmentsPage, and DashboardPage all consume this API response shape.
- PointLog is the single source of truth for points balance — completion creates EARNED, uncomplete creates REVERSED.
- All mutations are parent-only; GET endpoints are role-scoped (child sees own, parent sees all).
- API response envelope: `{ success: true, data: ..., error: null }`.

---

## Schema Changes Required

### Current State

The schema has 3 models for recurring chores:

```prisma
model RecurringChore {
  id              Int @id
  choreTemplateId Int
  frequency       String       // "DAILY" | "WEEKLY" | "MONTHLY"
  dayOfWeek       Int?         // 0=Sun for WEEKLY
  dayOfMonth      Int?         // 1-31 for MONTHLY
  createdById     Int
  assignees       RecurringChoreAssignee[]
  occurrences     RecurringOccurrence[]
}

model RecurringChoreAssignee {
  id                Int @id
  recurringChoreId  Int
  userId            Int
  @@unique([recurringChoreId, userId])
}

model RecurringOccurrence {
  id                Int @id
  recurringChoreId  Int
  assignedToId      Int
  dueDate           DateTime
  status            String  @default("PENDING")
  completedAt       DateTime?
  @@unique([recurringChoreId, dueDate])
}
```

### Required Changes

1. **Drop RecurringChoreAssignee table** — RECUR-05 mandates fixed assignment. Add `assignedToId Int` directly to RecurringChore with a `@relation` to User. No migration concern — Phase 4 is the first time these models are used (they were scaffolding from Phase 1).

2. **Add `pointsAwarded Int?` to RecurringOccurrence** — Same pattern as ChoreAssignment. Null for PENDING, set to template.points at completion time. Completed occurrences read from their snapshot.

3. **Keep `@@unique([recurringChoreId, dueDate])`** — This constraint prevents duplicate occurrences for the same chore on the same date. Critical for idempotent lazy generation.

4. **User model** — Already has `recurringAssignees RecurringChoreAssignee[]` and `completedOccurrences RecurringOccurrence[]` fields. After dropping RecurringChoreAssignee, remove the `recurringAssignees` field and replace with `assignedRecurringChores RecurringChore[]`.

### Seed Data Update

Add 1-2 recurring chores to seed.ts so the feature is testable immediately:
- Alice: Daily "Make Bed" (5 pts) — today's occurrence generated on first load
- Bob: Weekly "Take Out Trash" (10 pts) every Monday

---

## Lazy Occurrence Generation (RECUR-02)

### Algorithm

```
function generateOccurrences(from: Date, to: Date):
  chores = prisma.recurringChore.findMany({ include: { template: true } })
  
  for each chore in chores:
    dates = computeOccurrenceDates(chore, from, to)
    
    existing = prisma.recurringOccurrence.findMany({
      where: { recurringChoreId: chore.id, dueDate: { in: dates } }
    })
    existingDates = Set(existing.map(e => e.dueDate))
    
    missingDates = dates.filter(d => !existingDates.has(d))
    
    for each missing in missingDates:
      prisma.recurringOccurrence.create({
        data: {
          recurringChoreId: chore.id,
          assignedToId: chore.assignedToId,
          dueDate: missing,
          status: 'PENDING',
        }
      })
```

### Date Computation Logic

```
computeOccurrenceDates(chore, from, to):
  switch chore.frequency:
    DAILY:
      return every date in [from, to]
    
    WEEKLY (chore.dayOfWeek):
      return every {dayOfWeek} in [from, to]
      e.g., dayOfWeek=1 (Monday) → every Monday in range
    
    MONTHLY (chore.dayOfMonth):
      return every {dayOfMonth} in [from, to]
      Clamp to last day of month if dayOfMonth > days in that month
      e.g., dayOfMonth=31 → Jan 31, Feb 28/29, Mar 31, ...
```

### Integration Point

Call `generateOccurrences()` from `assignmentService.getAll()` BEFORE querying assignments. The generation ensures occurrences exist for the date range the user is viewing (default: current month per D-11). Then:

```typescript
export async function getAll(userId: number, role: string) {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  await generateOccurrences(from, to) // lazy generation

  const where = role === 'PARENT' ? {} : { assignedToId: userId }

  // Fetch both regular assignments and occurrences
  const [assignments, occurrences] = await Promise.all([
    prisma.choreAssignment.findMany({ where, include: {...}, orderBy: { dueDate: 'asc' } }),
    prisma.recurringOccurrence.findMany({ where, include: {...}, orderBy: { dueDate: 'asc' } }),
  ])

  // Merge and sort by dueDate
  return [...assignments, ...occurrences.map(mapOccurrenceToAssignment)].sort(...)
}
```

### Occurrence-to-Assignment Mapping

RecurringOccurrence has a different shape than ChoreAssignment (different relation to template, no `assignedTo` relation). A mapping function normalizes it:

```typescript
function mapOccurrenceToAssignment(occ) {
  return {
    id: occ.id,
    type: 'RECURRING', // distinguish for completion endpoint
    choreTemplateId: occ.chore.choreTemplateId,
    assignedToId: occ.assignedToId,
    dueDate: occ.dueDate,
    status: occ.status,
    completedAt: occ.completedAt,
    pointsAwarded: occ.pointsAwarded,
    template: { id: occ.chore.template.id, title: occ.chore.template.title, points: occ.chore.template.points, category: occ.chore.template.category },
    assignedTo: { id: occ.assignedTo.id, name: occ.assignedTo.name, color: occ.assignedTo.color },
  }
}
```

**Alternative approach (cleaner):** Add a `type: 'REGULAR' | 'RECURRING'` discriminator field to the API response. The frontend filters/states/complete flows work identically — only the completion endpoint differs (`/api/assignments/:id/complete` vs `/api/occurrences/:id/complete`).

---

## Completion Flow (RECUR-03)

Recurring occurrences follow the same pattern as ChoreAssignment completion:

1. Find occurrence with `include: { chore: { include: { template: true } } }`
2. Owner check: `occurrence.assignedToId !== userId` → 403
3. Already-completed check: `occurrence.status === 'COMPLETED'` → 409
4. Snapshot points: `pointsAwarded = occurrence.chore.template.points`
5. Transactional update + PointLog:

```typescript
return prisma.$transaction(async (tx) => {
  await tx.recurringOccurrence.update({
    where: { id: occurrenceId },
    data: { status: 'COMPLETED', completedAt: new Date(), pointsAwarded },
  })
  await tx.pointLog.create({
    data: {
      userId: occurrence.assignedToId,
      amount: pointsAwarded,
      type: 'EARNED',
      reason: occurrence.chore.template.title,
    },
  })
  return tx.recurringOccurrence.findUnique({ where: { id: occurrenceId }, include: {...} })
})
```

### API Endpoint

`POST /api/occurrences/:id/complete` — separate from `/api/assignments/:id/complete` since they operate on different tables.

**No uncomplete for occurrences in Phase 4.** RECUR requirements don't mention it.

---

## Deletion Flow (RECUR-04)

When a parent deletes a recurring chore:

1. Find the RecurringChore
2. Delete PENDING occurrences: `prisma.recurringOccurrence.deleteMany({ where: { recurringChoreId: id, status: 'PENDING' } })`
3. COMPLETED occurrences remain (their `recurringChoreId` FK becomes a historical reference — but with `onDelete: Cascade` on the relation, they would be deleted too)

**Critical fix:** Change the RecurringOccurrence → RecurringChore relation from `onDelete: Cascade` to `onDelete: SetNull` or remove `onDelete` and handle deletion manually in the service. This way completed occurrences survive chore deletion.

4. Delete the RecurringChore itself.

---

## Architecture Patterns

### Pattern 1: Service Layer (follow Phase 3 patterns)

- `backend-v2/src/services/recurring.service.ts` — create, getAll, delete_, generateOccurrences, complete
- `backend-v2/src/routes/recurring.routes.ts` — POST/, GET/, DELETE/:id, POST/:id/complete
- `backend-v2/src/routes/index.ts` — mount at `/recurring`

### Pattern 2: Frontend API + Hooks (follow Phase 3 patterns)

- `frontend-v2/src/api/recurring.api.ts` — Axios client with D-17 mapping
- `frontend-v2/src/hooks/useRecurringChores.tsx` — React Query hooks
- `frontend-v2/src/pages/RecurringChoresPage.tsx` — Parent-only management page

### Pattern 3: Existing Pages Auto-Display Occurrences

If occurrences are returned by `GET /api/assignments`, the MyChoresPage, AssignmentsPage, and DashboardPage display them automatically — no frontend changes needed for viewing.

### Pattern 4: Occurrence Count on Dashboard

The Dashboard's "Upcoming Chores" section already filters `assignments` by `assignedToId === user.id && status === 'PENDING'`. If occurrences are mixed into the assignments array, they appear automatically.

---

## Standard Stack

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Express.js | ^4.18.2 | Backend routes | Already in project |
| Prisma | @prisma/client ^5.22.0 | ORM for SQLite | Already in project |
| Zod | ^4.4.3 | Request validation | Installed in Phase 3 |
| React | ^18.2.0 | Frontend UI | Already in project |
| TanStack React Query | ^5.95.2 | Server state | Already in project |
| Axios | ^1.13.6 | HTTP client | Already in project |
| Tailwind CSS | ^3.4.0 | Styling | Already in project |
| lucide-react | ^0.577 | Icons | Already in project |

**No new dependencies required.**

---

## Common Pitfalls

### Pitfall 1: Filtering out COMPLETED occurrences on DELETE

The `@@unique([recurringChoreId, dueDate])` constraint combined with `onDelete: Cascade` means deleting a RecurringChore deletes ALL occurrences — including completed ones. Fix by removing `onDelete: Cascade` and handling deletion manually in the service.

### Pitfall 2: Date math edge cases

- Monthly chore with dayOfMonth=31: January has 31, February has 28/29. Must clamp to last day of month.
- Weekly chore: dayOfWeek 0 = Sunday vs Monday. JavaScript Date.getDay() returns 0=Sun. Keep consistent with standard.
- Timezone: Use UTC date normalization. SQLite stores DateTime without timezone. Convert all dates to `YYYY-MM-DD` for comparison.

### Pitfall 3: Lazy generation called too frequently

If `generateOccurrences()` runs on every `GET /api/assignments`, it scans all RecurringChores every time. At family scale (<10 recurring chores, date range of 30-90 days), this is O(10 × 90) = ~900 operations — negligible. No caching needed.

### Pitfall 4: Occurrence IDs overlap with Assignment IDs

If occurrences are mixed into the same array as assignments, the frontend's complete button calls `completeAssignment(id)`. Since the `id` could be an occurrence ID but the hook calls `POST /api/assignments/:id/complete`, the completion would fail with 404.

**Solution:** Either (a) keep assignments and occurrences separate in the API response (separate `assignments` and `occurrences` arrays), or (b) add a `type` discriminator and let the frontend route completion to the correct endpoint. Option (a) is simpler and doesn't break existing code. The frontend hook merges them for display and selects the correct completion endpoint based on type.

---

## Integration Points

| From | To | Description |
|------|----|-------------|
| `recurring.service.ts` | `assignment.service.ts` | `getAll()` calls `generateOccurrences()` before querying |
| `routes/recurring.routes.ts` | `routes/index.ts` | Mount `recurringRouter` at `/recurring` |
| `routes/index.ts` | `app.ts` | Auto-mounted via existing `/api` prefix |
| `RecurringChoresPage.tsx` | `App.tsx` | New route `/recurring-chores` with `ProtectedRoute requiredRole="PARENT"` |
| `NavBar.tsx` | `App.tsx` | Add "Recurring" link for PARENT role |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date math for occurrence dates | Custom calendar library | JavaScript Date with UTC normalization | Simple loop over date range; no timezone complexity at family scale |
| Cron/scheduler for background generation | node-cron or setInterval | Lazy generation in getAll() | RECUR-02 explicitly says lazy, no background cron |
| Separate occurrence API response type | New frontend data model | Same Assignment shape with `type` discriminator | Existing pages render assignments already; reuse the UI |
| Complex recurrence rules (RRULE) | rrule library | Simple switch on frequency + dayOfWeek/dayOfMonth | RECUR-01 specifies only 3 simple patterns; RRULE is overkill |

---

## Test Strategy

### Backend Tests
- **Unit tests** (`services/__tests__/recurring.service.test.ts`): Mock Prisma. Test create, generateOccurrences date computation, delete_, complete. Mock `prisma.$transaction` for completion.
- **Integration tests** (`routes/__tests__/recurring.routes.test.ts`): Use supertest + live DB. Test CRUD, occurrence generation, completion, role gating.

### Frontend Tests
- **Unit tests** (`__tests__/RecurringChoresPage.test.tsx`): Mock useRecurringChores hook. Test loading/empty/error/populated states, create form, delete confirmation.

---

## Validation Architecture

| Requirement | Behavior to Verify | Test Approach |
|-------------|-------------------|---------------|
| RECUR-01 | Parent creates recurring chore with frequency + assignee | Integration test: POST /api/recurring → 201, verify chore in DB |
| RECUR-02 | Occurrences appear on demand for date window | Integration test: create chore, GET /api/assignments, verify today's occurrence exists |
| RECUR-03 | Child completes occurrence, points awarded | Integration test: POST /api/occurrences/:id/complete → 200, EARNED PointLog created |
| RECUR-04 | Delete removes future occurrences, preserves completed | Integration test: DELETE /api/recurring/:id, verify PENDING gone, COMPLETED remain |
| RECUR-05 | Only one assignee (no multi-assignee UI) | Schema check: RecurringChore has assignedToId (single), no RecurringChoreAssignee table |

---

*Phase: 04-recurring-chores*
*Research completed: 2026-05-23*
