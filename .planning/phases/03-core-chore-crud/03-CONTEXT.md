# Phase 3: Core Chore CRUD - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Full-stack chore template CRUD, assignment CRUD, completion flow, and filtering. Parents create reusable templates, assign them to family members with due dates, and manage the lifecycle. Anyone can view and complete their own chores. Points are tracked via PointLog entries.

This phase delivers: ChoreTemplate API + UI, ChoreAssignment API + UI, completion flow with point tracking, frontend-side filtering, and role-gated access (child cannot create/delete).

</domain>

<decisions>
## Implementation Decisions

### Template Mutability
- **D-01:** Template edits cascade to ALL pending assignments — title, category, and points update immediately. The template is the single source of truth for pending work.
- **D-02:** Completed assignments are frozen. Add `pointsAwarded` (Int, nullable) to ChoreAssignment — set to template.points at completion time. Completed assignments read from their snapshot, never from the template.
- **D-03:** Any parent can create, edit, or delete any template. No creator-only restriction.
- **D-04:** Category is free-text String. No preset list, no enum, no dropdown.
- **D-05:** Template deletion is in scope. Cascade-deletes all pending assignments. Blocks if any completed assignments exist (must uncomplete first).

### Point Tracking
- **D-06:** Add PointLog model now (not defer to Phase 5): `id`, `userId` (FK to User), `amount` (Int), `reason` (String), `type` (String), `createdAt`. Remove `User.points` field — balance is always `SUM(PointLog WHERE userId)`.
- **D-07:** On completion: create PointLog with `type = "EARNED"`, `reason = template.title`, `amount = template.points` (or `pointsAwarded` snapshot). Phase 5 adds `"ADJUSTMENT"` type.
- **D-08:** Support uncomplete: set status back to PENDING, create PointLog with `type = "REVERSED"`, `amount = -original_amount`. Parent-only operation.

### Filtering Architecture
- **D-09:** All filtering is frontend-side. API returns complete dataset (own for child, all for parent). React state drives live filter UI — no query params, no submit button.
- **D-10:** Single API endpoint: `GET /api/assignments` — returns only the user's own assignments for CHILD role, all family assignments for PARENT role.
- **D-11:** Default filter: current month date range (first day to last day). User can clear to see all.
- **D-12:** No pagination. Family scale (<100 rows) fits in one page.

### Delete Semantics
- **D-13:** Completed assignments cannot be deleted. Parent must uncomplete first (status back to PENDING), then hard-delete.
- **D-14:** Pending assignments: hard delete (`DELETE FROM ChoreAssignment`). No soft-delete or status markers.
- **D-15:** Template deletion is blocked if it has any completed assignments. Parent must handle completed ones individually before deleting the template.

### API Conventions
- **D-16:** Follow existing API patterns: controllers thin, services heavy. Standard response envelope `{ success, data, error }`. Use AppError class for known errors.
- **D-17:** Frontend API layer (`frontend-v2/src/api/`) maps `userId` → `assignedToId`, `templateId` → `choreTemplateId` per established convention.
- **D-18:** Role gating: `POST/PUT/DELETE` template and assignment routes protected by `authorize('PARENT')`. `GET /api/assignments` accessible by any authenticated user (scope based on role).

### Existing Code Dependencies
- **D-19:** Prisma schema exists from Phase 1 (ChoreTemplate, ChoreAssignment models). Add `pointsAwarded` to ChoreAssignment, add PointLog model, remove `User.points`.
- **D-20:** Auth middleware, session handling, and ProtectedRoute component from Phase 2 are ready.
- **D-21:** UI-SPEC.md (03-UI-SPEC.md, approved) defines all visual contracts — spacing, typography, color, component patterns, page states, copywriting.

### the agent's Discretion
- Exact `reason` format for PointLog entries (template name only specified; implementer picks wording)
- Service-layer implementation patterns (follow existing auth.service.ts conventions)
- API route path naming beyond `/api/assignments` — templates could be `/api/templates` or `/api/chore-templates`
- Uncomplete endpoint design (standalone route vs part of assignment update)
- Who can uncomplete — negotiable (parent-only set in D-08, but implementer can decide based on UX)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Contracts
- `03-UI-SPEC.md` — UI design contract (approved 2026-05-23). Component patterns, colors, typography, spacing, page states, copywriting, interaction contracts. MANDATORY for all frontend work.

### Project References
- `.planning/ROADMAP.md` §Phase 3 — Core Chore CRUD goal, success criteria, requirements
- `.planning/REQUIREMENTS.md` — CHORE-01 through CHORE-07 requirements
- `.planning/PROJECT.md` — Key Decisions table (lazy generation, points as integer, binary status, fixed assignment only)

### Codebase
- `backend-v2/prisma/schema.prisma` — Current ChoreTemplate, ChoreAssignment, User, RecurringChore models. MUST be updated per D-02, D-06.
- `backend-v2/src/services/auth.service.ts` — Reference service pattern (thin controller, heavy service, Zod validation)
- `backend-v2/src/routes/auth.routes.ts` — Reference route + controller + middleware pattern
- `backend-v2/src/server.ts` — App entry point, middleware ordering
- `frontend-v2/src/api/auth.api.ts` — Reference API layer pattern (Axios, error classes)
- `frontend-v2/src/hooks/useAuth.tsx` — Reference hook pattern (React Context + TanStack Query)
- `frontend-v2/src/components/ProtectedRoute.tsx` — Auth guard with role gating
- `frontend-v2/src/pages/DashboardPage.tsx` — Nav bar pattern to extend with Phase 3 links
- `frontend-v2/tailwind.config.js` — Primary palette (indigo), Inter font

### Architecture Analysis
- `.planning/codebase/STACK.md` — Technology stack
- `.planning/codebase/ARCHITECTURE.md` — System overview, data flow, anti-patterns
- `.planning/codebase/CONVENTIONS.md` — Naming, imports, frontend-backend parameter mapping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ProtectedRoute** — Already supports `requiredRole="PARENT"` for template and assignment pages
- **useAuth** — Provides `user.role` for role-based UI (hide template/assignment nav links from children)
- **Auth API client pattern** — `ApiError` class, Axios interceptors, CSRF token injection (not used for Phase 3 since SameSite cookies cover it, but patterns are established)
- **TanStack Query** — All data fetching uses `useQuery`/`useMutation` from `@tanstack/react-query`

### Established Patterns
- Backend: `router → controller → service → Prisma` with Zod validation in middleware
- Frontend: `api/*.api.ts → hooks/*.tsx → pages/*.tsx` with React Query for server state
- 401 responses trigger auto-logout via `auth:unauthorized` event
- Form patterns: inline Tailwind, `px-3 py-2` inputs, primary indigo buttons
- API response envelope: `{ success: true, data: {...}, error: null }`

### Integration Points
- Nav bar in DashboardPage: extract to shared layout component, add role-conditional links (Dashboard, My Chores, Templates (PARENT), Assignments (PARENT))
- Route definitions in `frontend-v2/src/App.tsx`: add `/templates`, `/assignments`, `/my-chores` routes
- Backend routes in `backend-v2/src/routes/index.ts`: mount new template and assignment routers
- Auth middleware: `authenticate` and `authorize` from Phase 2 ready for chore routes

</code_context>

<specifics>
## Specific Ideas

- PointLog reason field uses template name only (e.g., "Wash dishes"), not a verbose format. The `amount` column provides the point value context.
- Template delete confirmation copy: "Delete Template" / "This will permanently delete the chore template and all its assignments. This cannot be undone. Continue?" — matches UI-SPEC.
- Uncomplete should create a REVERSED type PointLog with negative amount to maintain a clean audit trail.
- Default date filter: current month. User can clear to see all assignments including past/future.

</specifics>

<deferred>
## Deferred Ideas

- No deferred ideas came up during discussion — all topics stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-core-chore-crud*
*Context gathered: 2026-05-23*
