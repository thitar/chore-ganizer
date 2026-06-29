# Phase 4: Recurring Chores - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Full-stack recurring chore system with lazy occurrence generation. Parents create daily/weekly/monthly recurring chores with a single fixed assignee. Occurrences appear on demand (no background cron) when users view assignments for a date window, merged transparently into the same `GET /api/assignments` response shape used in Phase 3. Child completes a recurring occurrence using a new `/api/occurrences/:id/complete` endpoint. Parent deletes a recurring chore — pending occurrences are removed, completed ones preserved for history.

This phase delivers: simplified schema (drop RecurringChoreAssignee), recurring service + routes (create, list, delete, complete occurrence), lazy occurrence generation piggybacked on assignmentService.getAll(), frontend API client + hook + RecurringChoresPage, type discriminator in API response, and wire-up so existing pages (MyChores, Assignments, Dashboard) display recurring occurrences alongside regular assignments.

</domain>

<decisions>
## Implementation Decisions

### Schema Simplification (RECUR-05)
- **D-01:** Drop the `RecurringChoreAssignee` many-to-many table entirely. Add `assignedToId Int` directly on `RecurringChore` with a `@relation` to User. One fixed assignee per recurring chore.
- **D-02:** Add `pointsAwarded Int?` to `RecurringOccurrence` (null for PENDING, set to template.points at completion time). Same pattern as ChoreAssignment from Phase 3.
- **D-03:** Remove `onDelete: Cascade` from the `RecurringOccurrence` → `RecurringChore` relation. Service handles deletion: deletes only PENDING occurrences, leaves COMPLETED intact. Completed occurrences' `recurringChoreId` becomes a historical reference (orphaned but preserved).
- **D-04:** Update `User` model relations: remove `recurringAssignees RecurringChoreAssignee[]`, add `assignedRecurringChores RecurringChore[]` (inverse of the new `assignedTo` relation). Keep `completedOccurrences RecurringOccurrence[]` as-is.
- **D-05:** Keep `@@unique([recurringChoreId, dueDate])` on `RecurringOccurrence` — critical for idempotent lazy generation (prevents duplicate occurrences for the same chore+date).

### Lazy Occurrence Generation (RECUR-02)
- **D-06:** No background cron, no scheduled job. `generateOccurrences(from, to)` is called by `assignmentService.getAll()` BEFORE querying existing assignments/occurrences. Idempotent — running multiple times is safe.
- **D-07:** Algorithm: for each RecurringChore, compute expected dates in `[from, to]` based on frequency, query existing occurrences for those dates, create only the missing ones. Use `createMany` with `skipDuplicates: true` to handle race conditions.
- **D-08:** Date computation: DAILY = every date in range. WEEKLY = every `{dayOfWeek}` in range (0=Sunday per JavaScript getDay()). MONTHLY = every `{dayOfMonth}` in range, clamped to last day of month (dayOfMonth=31 → Feb 28/29, Apr 30, etc.).
- **D-09:** Use UTC date normalization. All dates compared as `YYYY-MM-DD` strings to avoid timezone issues with SQLite DateTime.
- **D-10:** Family-scale performance is fine — O(N_recurring × days_in_range) = at most ~10 × 90 = 900 operations per request. No caching needed.

### API Response Shape (Merge with Type Discriminator)
- **D-11:** `GET /api/assignments` returns a single array with a `type: 'REGULAR' | 'RECURRING'` discriminator field on each item. The frontend hook merges them and routes completion to the correct endpoint based on type.
- **D-12:** Recurring occurrence mapping: `{ id, type: 'RECURRING', choreTemplateId, assignedToId, dueDate, status, completedAt, pointsAwarded, template: {...}, assignedTo: {...} }` — same shape as regular assignments.
- **D-13:** Separate completion endpoint: `POST /api/occurrences/:id/complete` (operates on `RecurringOccurrence` table, not `ChoreAssignment`). Both endpoints follow the same pattern: transactional update + PointLog insert.
- **D-14:** No uncomplete for occurrences in Phase 4. RECUR requirements don't mention it.

### Completion Flow (RECUR-03)
- **D-15:** On `POST /api/occurrences/:id/complete`: find occurrence with `include: { chore: { include: { template: true } } }`. Owner check (`assignedToId === userId` for CHILD, parent can complete for anyone). Already-completed check → 409. Snapshot points.
- **D-16:** Transactional update: `recurringOccurrence.update({ status: 'COMPLETED', completedAt: now, pointsAwarded })` + `pointLog.create({ userId, amount, type: 'EARNED', reason: template.title })`.

### Deletion Flow (RECUR-04)
- **D-17:** `DELETE /api/recurring/:id`: delete PENDING occurrences only (`status: 'PENDING'` filter), then delete the RecurringChore. COMPLETED occurrences remain (orphaned from RecurringChore, but their `pointsAwarded` snapshot preserves history).
- **D-18:** Parent-only operation. CHILD gets 403.

### Frontend
- **D-19:** New `RecurringChoresPage` (parent-only, route `/recurring-chores`, gated by `ProtectedRoute requiredRole="PARENT"`). Lists existing recurring chores with template title, frequency, assignee. Has a "Create" form. Each row has a "Delete" button with confirmation.
- **D-20:** Add "Recurring" link to `NavBar` for PARENT role only. Place between "Templates" and "Assignments" in the nav order.
- **D-21:** Existing pages (MyChoresPage, AssignmentsPage, DashboardPage) display recurring occurrences automatically because they consume the merged `assignments` array from `useAssignments`. The complete button routes to the correct endpoint based on `type`.
- **D-22:** Follow Phase 3 API conventions: `frontend-v2/src/api/recurring.api.ts` for API layer, `frontend-v2/src/hooks/useRecurringChores.tsx` for React Query hooks, `frontend-v2/src/pages/RecurringChoresPage.tsx` for the page.

### Seed Data
- **D-23:** Add 2 recurring chores to `seed.ts`: Alice's daily "Make Bed" (5 pts), Bob's weekly "Take Out Trash" (10 pts, dayOfWeek=1 Monday).

### Existing Code Dependencies
- **D-24:** Prisma schema exists from Phase 1 (RecurringChore, RecurringChoreAssignee, RecurringOccurrence models). Must be updated per D-01 through D-05.
- **D-25:** `assignmentService.getAll()` shape from Phase 3 — must be extended to call `generateOccurrences` and merge results. Response shape with `type` discriminator preserves backwards compat (existing pages don't break).
- **D-26:** Auth middleware, session handling, ProtectedRoute, NavBar from Phases 2-3 are ready for reuse.
- **D-27:** PointLog model from Phase 3 — completion uses same EARNED type. No schema changes needed for PointLog.

### the agent's Discretion
- Exact `reason` format for PointLog entries (template name only specified; implementer picks wording)
- Service-layer implementation patterns (follow existing assignment.service.ts conventions)
- Uncomplete endpoint design for occurrences (not required by RECUR but could be added for consistency with regular assignments)
- Error message wording for validation failures
- RecurringChoresPage layout details (table vs card grid) as long as it's consistent with existing pages
- Test fixture names and structure (follow Phase 3 patterns)
- UI-SPEC.md design contract details (spacing, typography, copy) — must match Phase 3 patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Contracts
- `04-UI-SPEC.md` — UI design contract for RecurringChoresPage. Component patterns, colors, typography, spacing, page states, copywriting, interaction contracts.

### Project References
- `.planning/ROADMAP.md` §Phase 4 — Recurring Chores goal, success criteria, requirements RECUR-01..05
- `.planning/REQUIREMENTS.md` — RECUR-01 through RECUR-05 requirements
- `.planning/PROJECT.md` — Key Decisions table (lazy generation, points as integer, binary status, fixed assignment only)

### Codebase
- `backend-v2/prisma/schema.prisma` — Current models. MUST be updated per D-01..D-05.
- `backend-v2/prisma/seed.ts` — Add 2 recurring chores per D-23.
- `backend-v2/src/services/assignment.service.ts` — Reference service pattern; must be extended per D-11.
- `backend-v2/src/routes/index.ts` — Mount new recurring router.
- `frontend-v2/src/api/assignments.api.ts` — Reference API layer pattern; must add `type` discriminator.
- `frontend-v2/src/hooks/useAssignments.tsx` — Reference hook pattern; must handle `type` for completion routing.
- `frontend-v2/src/components/NavBar.tsx` — Add "Recurring" link per D-20.
- `frontend-v2/src/App.tsx` — Add `/recurring-chores` route.
- `frontend-v2/src/pages/TemplatesPage.tsx` — Reference parent-only page pattern.

### Architecture Analysis
- `.planning/codebase/STACK.md` — Technology stack (Express, Prisma, React, TanStack Query, Tailwind)
- `.planning/codebase/ARCHITECTURE.md` — System overview, data flow, anti-patterns
- `.planning/codebase/CONVENTIONS.md` — Naming, imports, frontend-backend parameter mapping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProtectedRoute** — Already supports `requiredRole="PARENT"` for the new RecurringChoresPage
- **useAuth** — Provides `user.role` for role-based UI (hide Recurring Chores nav link from children)
- **Auth API client pattern** — `ApiError` class, Axios interceptors from Phase 2
- **TanStack Query** — All data fetching uses `useQuery`/`useMutation` from `@tanstack/react-query`
- **React Hook Form + Zod** — Pattern from TemplatesPage for create forms
- **ConfirmDelete component** — From Phase 3, reusable for delete confirmation on recurring chore rows
- **FilterBar, StatusBadge, FormField** — From Phase 3, reusable for RecurringChoresPage
- **PointLog** — Phase 3 model reused for EARNED entries from occurrence completions

### Established Patterns
- Backend: `router → controller → service → Prisma` with Zod validation in middleware
- Frontend: `api/*.api.ts → hooks/*.tsx → pages/*.tsx` with React Query for server state
- 401 responses trigger auto-logout via `auth:unauthorized` event
- Form patterns: inline Tailwind, `px-3 py-2` inputs, primary indigo buttons
- API response envelope: `{ success: true, data: {...}, error: null }`
- Service exports camelCase methods (`getAll`, `create`, `delete_`, `completeOccurrence`)
- TDD: write failing test first, watch it fail, then implement

### Integration Points
- NavBar in `frontend-v2/src/components/NavBar.tsx`: add "Recurring" link for PARENT role
- Route definitions in `frontend-v2/src/App.tsx`: add `/recurring-chores` route
- Backend routes in `backend-v2/src/routes/index.ts`: mount `recurringRouter` at `/recurring`
- `assignmentService.getAll()`: must call `generateOccurrences` then merge with regular assignments
- PointLog creation: from both `assignment.service.ts` (existing) and `recurring.service.ts` (new)

</code_context>

<specifics>
## Specific Ideas

- Recurring occurrence completion uses the same EARNED PointLog pattern as regular chore completion
- Lazy generation runs on every `GET /api/assignments` call — keep it simple, no caching at family scale
- `type` discriminator (`'REGULAR' | 'RECURRING'`) is the cleanest way to route completion — alternative would be separate response arrays but that doubles frontend code
- RecurringChoresPage should show: Template title, Frequency (DAILY/WEEKLY/MONTHLY), Day of week/month detail, Assignee name, Created by
- Default order in RecurringChoresPage: most recently created first
- "Create" form: template select (from existing ChoreTemplates), frequency radio, day of week/month (conditional), assignee select (CHILD users only)
- NavBar link order: Dashboard, My Chores, Templates (PARENT), Recurring (PARENT), Assignments (PARENT)
- Seed data: Make Bed (Daily, Alice), Take Out Trash (Weekly Mon, Bob) — testable immediately

</specifics>

<deferred>
## Deferred Ideas

- Round-robin or mixed assignment modes — RECUR-05 mandates fixed only, deferred to a future phase if needed
- Custom recurrence rules beyond daily/weekly/monthly — RECUR-01 specifies 3 simple patterns
- Bulk operations (create many recurring chores at once) — single-create per parent UX, defer until user feedback
- Recurring chore edit — current implementation is create+delete only; edit can be added in a polish phase
- Calendar view of recurring occurrences — Phase 5 calendar work will cover this
- Notification when new occurrence is generated — Phase 5+ notification work
- Uncomplete for recurring occurrences — not in RECUR scope; could be added in Phase 5 if needed

</deferred>

---

*Phase: 04-recurring-chores*
*Context gathered: 2026-06-28*
