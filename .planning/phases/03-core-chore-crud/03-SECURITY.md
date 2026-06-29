---
phase: 03-core-chore-crud
version: 1
last_audit: 2026-05-23
threats_total: 17
threats_closed: 17
threats_open: 0
asvs_level: L1
register_authored_at_plan_time: true
---

# Phase 03: Core Chore CRUD — Security Threat Verification

## Threat Register

### T-3-01: Mass Assignment via Raw req.body (Tampering)
- **Component:** POST/PUT /api/templates, /api/assignments
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Zod schemas (`createTemplateSchema`, `updateTemplateSchema`, `createAssignmentSchema`, `updateAssignmentSchema`) define exact allowed fields. `validate()` middleware calls `schema.parse(req.body)` which strips unknown keys. Prisma `create({ data })` only includes schema-defined fields.
- **Evidence:** `backend-v2/src/middleware/validator.ts`, `backend-v2/src/schemas/template.schema.ts`, `backend-v2/src/schemas/assignment.schema.ts`

### T-3-02: Template Delete Race Condition (Tampering)
- **Component:** DELETE /api/templates
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `prisma.$transaction` wraps existence check + cascade delete atomically. Single-threaded Node.js event loop eliminates practical race window.
- **Evidence:** `backend-v2/src/services/template.service.ts` — `delete_()` uses `prisma.$transaction([deleteMany, delete])`

### T-3-03: Child Accessing Mutating Template Routes (Elevation of Privilege)
- **Component:** POST/PUT/DELETE /api/templates
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `authorize('PARENT')` middleware on all mutating routes. CHILD gets 403.
- **Evidence:** `backend-v2/src/routes/templates.routes.ts`, `backend-v2/src/middleware/auth.ts`

### T-3-04: Template Listing Information Disclosure (Information Disclosure)
- **Component:** GET /api/templates
- **Disposition:** Accept
- **Status:** CLOSED (Accepted)
- **Rationale:** D-03 explicitly allows any parent to view all templates. No sensitivity in template names/categories. Authenticated but unprivileged users can list templates by design.
- **Evidence:** `backend-v2/src/routes/templates.routes.ts` — GET /api/templates uses `authenticate` only (no `authorize`)

### T-3-05: Child Creating/Deleting Assignments (Elevation of Privilege)
- **Component:** POST/PUT/DELETE /api/assignments
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `authorize('PARENT')` on POST/PUT/DELETE + uncomplete routes.
- **Evidence:** `backend-v2/src/routes/assignments.routes.ts`

### T-3-06: Child Marking Another User's Assignment Complete (Elevation of Privilege)
- **Component:** POST /api/assignments/:id/complete
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Service checks `assignment.assignedToId === userId` before completing. Returns 403 if mismatch.
- **Evidence:** `backend-v2/src/services/assignment.service.ts` — `complete()` owner check

### T-3-07: Non-Atomic Complete (Tampering)
- **Component:** POST /api/assignments/:id/complete
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `prisma.$transaction` callback wraps status update + PointLog creation. Partial failure rolls back both operations.
- **Evidence:** `backend-v2/src/services/assignment.service.ts` — `complete()` uses callback `$transaction`

### T-3-08: SQL Injection via Free-Text Fields (Tampering)
- **Component:** PointLog reason field, template title
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Prisma parameterized queries throughout. No raw SQL in any service or route file. PointLog reason set from template.title via Prisma create data object.
- **Evidence:** `backend-v2/src/services/assignment.service.ts`, `backend-v2/src/services/template.service.ts` — all Prisma operations use parameterized data objects

### T-3-09: Deleting Completed Assignment (Tampering)
- **Component:** DELETE /api/assignments/:id
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Service checks `assignment.status === 'COMPLETED'` before delete. Returns 409 with hint "Uncomplete it first."
- **Evidence:** `backend-v2/src/services/assignment.service.ts` — `delete_()` status check

### T-3-10: User List Email Exposure (Information Disclosure)
- **Component:** GET /api/users
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `GET /api/users` uses `select: { id, name, role, color }` — email is explicitly excluded. Names and colors are already visible in assignment `assignedTo` includes.
- **Evidence:** `backend-v2/src/routes/users.routes.ts`

### T-3-11: Frontend Sends Wrong Parameter Names (Tampering)
- **Component:** assignments.api.ts
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** D-17 mapping enforced in API layer: `templateId` → `choreTemplateId`, `userId` → `assignedToId` in `create()` and `update()` functions.
- **Evidence:** `frontend-v2/src/api/assignments.api.ts`

### T-3-12: Stale Query Cache After Logout (Information Disclosure)
- **Component:** React Query cache
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `queryClient.clear()` on logout (from Phase 2) wipes all cached data. No per-query action needed.
- **Evidence:** `frontend-v2/src/hooks/useAuth.tsx` — logoutMutation `onSuccess` clears query client

### T-3-13: CHILD Sees Parent Nav Links (Information Disclosure)
- **Component:** NavBar.tsx
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** NavBar conditionally renders Templates/Assignments links based on `user.role === 'PARENT'`. CHILD never sees the links. Backend also enforces via `authorize('PARENT')` — defense in depth.
- **Evidence:** `frontend-v2/src/components/NavBar.tsx`

### T-3-14: Bypass ConfirmDelete UI (Elevation of Privilege)
- **Component:** ConfirmDelete modal
- **Disposition:** Accept
- **Status:** CLOSED (Accepted)
- **Rationale:** ConfirmDelete is UX, not security. Backend enforces delete rules independently (D-13, D-15). No client-side security reliance.
- **Evidence:** `backend-v2/src/services/template.service.ts` — `delete_()` 409 guard, `backend-v2/src/services/assignment.service.ts` — `delete_()` 409 guard

### T-3-15: CHILD Accesses Parent-Only Routes via URL (Elevation of Privilege)
- **Component:** App.tsx route definitions
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** `<ProtectedRoute requiredRole="PARENT">` wraps `/templates` and `/assignments` routes. CHILD gets 403 at route level, not component level — defense before component mounts.
- **Evidence:** `frontend-v2/src/App.tsx`, `frontend-v2/src/components/ProtectedRoute.tsx`

### T-3-16: Dashboard Shows Other Users' Chores (Information Disclosure)
- **Component:** DashboardPage Upcoming Chores
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Dashboard `upcoming` filter uses `assignedToId === user.id`. Backend `GET /api/assignments` returns role-scoped data (D-10). Defense in depth.
- **Evidence:** `frontend-v2/src/pages/DashboardPage.tsx`, `backend-v2/src/services/assignment.service.ts`

### T-3-17: Double-Click Mark Complete (Tampering)
- **Component:** MyChoresPage complete button
- **Disposition:** Accept
- **Status:** CLOSED (Accepted)
- **Rationale:** Button disables immediately with `disabled={isCompleting}`. Backend returns 409 on already-completed (idempotent). No practical exploit beyond wasted API call.
- **Evidence:** `frontend-v2/src/pages/MyChoresPage.tsx`, `backend-v2/src/services/assignment.service.ts`

## Additional Package Security

### T-3-SC: npm Package Supply Chain
- **Component:** zod, supertest
- **Disposition:** Mitigate
- **Status:** CLOSED
- **Mitigation:** Package legitimacy verified: zod@4.4.3 (50M+ weekly downloads, 6+ yr history, colinhacks/zod), supertest@7.1.0 (12M+ weekly, ladjs/supertest). Both — no SLOP or SUS flags per RESEARCH audit.
- **Evidence:** `.planning/phases/03-core-chore-crud/03-RESEARCH.md`

## Security Audit 2026-05-23

| Metric | Count |
|--------|-------|
| Threats total | 17 |
| Closed (mitigated) | 14 |
| Closed (accepted) | 3 |
| Open | 0 |

## Accepted Risks

| Threat | Risk | Rationale | Accepted Date |
|--------|------|-----------|---------------|
| T-3-04 | Template listing to all authenticated users | D-03 — any parent can view all templates by design. No sensitivity in template names. | 2026-05-23 |
| T-3-14 | ConfirmDelete UI bypass | Delete rules enforced server-side independently. UI is convenience, not security boundary. | 2026-05-23 |
| T-3-17 | Double-click complete | Button disables client-side; backend 409 is idempotent. No meaningful exploit. | 2026-05-23 |

---

*Phase: 03-core-chore-crud*
*Audited: 2026-05-23*
