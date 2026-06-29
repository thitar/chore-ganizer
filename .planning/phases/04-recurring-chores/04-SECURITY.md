---
phase: "04"
slug: recurring-chores
status: verified
threats_closed: 10
threats_open: 0
created: 2026-06-28
---

# Phase 04 — Security Threat Verification

> STRIDE verification: every threat registered in the plan's `threat_model` has been confirmed closed by the implementation.

---

## Threat Register (from PLAN files)

| ID | STRIDE | Component | Plan | Disposition | Status |
|----|--------|-----------|------|-------------|--------|
| T-4-01 | Tampering | Schema migration | 04-01 | mitigate (--accept-data-loss) | ✅ Closed — applied in dev DB only |
| T-4-02 | Elevation of Privilege | POST/DELETE /api/recurring | 04-02 | mitigate (authorize PARENT) | ✅ Closed — `authorize('PARENT')` on all mutations |
| T-4-03 | Elevation of Privilege | Complete another's occurrence | 04-02 | mitigate (owner check in service) | ✅ Closed — `assignedToId !== userId` throws 403 |
| T-4-04 | Tampering | Non-atomic complete | 04-02 | mitigate (prisma.$transaction) | ✅ Closed — transaction wraps update + PointLog |
| T-4-05 | Tampering | Duplicate occurrence generation | 04-02 | mitigate (unique constraint) | ✅ Closed — `@@unique([recurringChoreId, dueDate])` |
| T-4-06 | Information Disclosure | Wrong-user occurrence visibility | 04-03 | mitigate (role-scoped where) | ✅ Closed — same `assignedToId` filter on occurrences |
| T-4-07 | Tampering | Occurrence/Assignment ID overlap | 04-03 | accept (discriminator mitigates) | ✅ Closed — `type` field + correct endpoint routing |
| T-4-08 | Elevation of Privilege | CHILD accesses /recurring-chores | 04-04 | mitigate (ProtectedRoute PARENT) | ✅ Closed — `requiredRole="PARENT"` in App.tsx |
| T-4-09 | Information Disclosure | NavBar shows Recurring to CHILD | 04-04 | mitigate (role-gate) | ✅ Closed — `{user?.role === 'PARENT' && <Link>}` |
| T-4-10 | Tampering | Wrong completion endpoint | 04-05 | mitigate (type discriminator) | ✅ Closed — `completeAssignment(id, type)` routes correctly |

---

## Closed-Loop Checks

### T-4-02: PARENT-gated mutations
- **File:** `backend-v2/src/routes/recurring.routes.ts`
- **Code:** `router.post('/', authenticate, authorize('PARENT'), ...)` and `router.delete('/:id', authenticate, authorize('PARENT'), ...)`
- **Test:** `recurring.test.ts` — `POST /api/recurring` returns 403 for CHILD ✓
- **Test:** `recurring.test.ts` — `DELETE /api/recurring/:id` returns 403 for CHILD ✓

### T-4-03: Owner-only completion
- **File:** `backend-v2/src/services/recurring.service.ts`
- **Code:** `if (occurrence.assignedToId !== userId) throw new AppError('You can only complete your own occurrences', 403)`
- **Test:** `recurring.service.test.ts` — `throws 403 when user is not the assignee` ✓

### T-4-04: Atomic completion
- **File:** `backend-v2/src/services/recurring.service.ts`
- **Code:** `prisma.$transaction(async (tx) => { ... update + create PointLog ... })`
- **Test:** `recurring.service.test.ts` — `completes the occurrence and creates EARNED PointLog in transaction` ✓

### T-4-05: Idempotent occurrence generation
- **File:** `backend-v2/prisma/schema.prisma`
- **Code:** `@@unique([recurringChoreId, dueDate])`
- **Test:** `recurring.service.test.ts` — `is idempotent — does not create occurrences for dates that already exist` ✓

### T-4-07/T-4-10: Type discriminator routing
- **File:** `frontend-v2/src/hooks/useAssignments.tsx`
- **Code:** `completeAssignment: (id, type) => { if (type === 'RECURRING') return completeRecurringMutation.mutateAsync(id) ... }`
- **Test:** `MyChoresPage.test.tsx` — `completes a recurring occurrence with type=RECURRING passed to completeAssignment` ✓

### T-4-08/T-4-09: Frontend role gates
- **File:** `frontend-v2/src/App.tsx`
- **Code:** `<ProtectedRoute requiredRole="PARENT"><RecurringChoresPage /></ProtectedRoute>`
- **Test:** `ProtectedRoute` redirects CHILD to dashboard (Phase 2 test, still passing)
- **File:** `frontend-v2/src/components/NavBar.tsx`
- **Code:** `{user?.role === 'PARENT' && <Link to="/recurring-chores">Recurring</Link>}`
- **Test:** `NavBar.test.tsx` — Recurring link only renders for PARENT role ✓

---

## Defense in Depth

The type discriminator alone is not the only safeguard. Defense in depth:

1. **Route-level:** `authorize('PARENT')` blocks any non-parent from mutating recurring chores (even if they bypass the type check)
2. **Service-level:** Owner check in `completeOccurrence` ensures child cannot complete another user's occurrence
3. **DB-level:** `@@unique` constraint prevents duplicate occurrences
4. **Frontend type discriminator:** Routes to correct endpoint; non-malicious client errors caught

A malicious user attempting to send `POST /api/assignments/{occurrenceId}/complete` would get 404 from the assignments service (occurrence ID not in ChoreAssignment table), not a 200. A malicious user attempting to send `POST /api/occurrences/{assignmentId}/complete` would get 403 from the service (not the assignee).

---

## Summary

**Threats registered:** 10
**Threats closed:** 10
**Threats open:** 0

Phase 4 ships with all STRIDE threats mitigated. No open security items.

---

*Phase: 04-recurring-chores*
*Security verified: 2026-06-28*
