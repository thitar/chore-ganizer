---
phase: 03
reviewers: [claude]
reviewed_at: 2026-05-23T12:00:00Z
plans_reviewed:
  - 03-01-PLAN.md
  - 03-02-PLAN.md
  - 03-03-PLAN.md
  - 03-04-PLAN.md
  - 03-05-PLAN.md
  - 03-06-PLAN.md
  - 03-07-PLAN.md
---

# Cross-AI Plan Review — Phase 3

## Claude Review

### Summary

The seven plans are architecturally sound and highly faithful to the research, context decisions, and UI-SPEC. The wave structure is logical, the TDD discipline is correctly applied to the riskiest backend code, and the plans avoid scope creep. However, three execution blockers will cause the phase to fail as-written, and one gap means CHORE-02 (assign to a family member) cannot be completed in a usable way. These need fixes before execution begins.

### Strengths

- **Excellent domain fidelity.** Every locked decision (D-01 through D-18) maps to a concrete task, test, or acceptance criterion. The cascade-is-architectural insight (D-01 requires no `updateMany`) is correctly carried into Plan 03-02.
- **Right test strategy.** Backend unit tests mock Prisma; integration tests use supertest against the live app. Frontend tests mock hooks. This matches the existing `auth.test.ts` pattern precisely.
- **Threat model is proportionate.** STRIDE register covers the real risks (mass assignment, elevation of privilege, non-atomic complete) without inventing phantom threats.
- **Correct TDD sequencing.** Plans 03-02 and 03-03 have explicit RED/GREEN/REFACTOR gates with verification commands. The failing-first requirement is clear.
- **UI-SPEC traceability.** Every component in Plans 03-05/06/07 cites the exact UI-SPEC section (§1, §7, §8, etc.). Copywriting is specified verbatim.
- **D-17 parameter mapping is handled in exactly one place.** The API layer owns it; hooks and pages stay clean.
- **Plan 03-01 correctly sequences foundation work.** Schema push must precede service code; zod must exist before any route validation.

### Concerns

#### HIGH — Execution Blockers

**1. Route stubs in Plan 03-01 Task 2 will break `npm test` before Plan 03-02/03-03 run**

Plan 03-01 Task 2 instructs the executor to add route imports to `routes/index.ts` for `templates.routes` and `assignments.routes`. Neither file exists until Plans 03-02 and 03-03 complete. Plan 03-01's own Task 3 verify runs `npx jest`, which compiles the entire project — it will fail with `Cannot find module './templates.routes'`.

**Fix:** Remove route mounting from Plan 03-01 entirely. Each plan mounts its own router: 03-02 adds `router.use('/templates', ...)`, 03-03 adds `router.use('/assignments', ...)`. Plan 03-01 only touches schema, seed, zod, validator middleware, and Zod schemas.

**2. `supertest` is never installed**

Plans 03-02 and 03-03 both describe integration tests using `request(app)` from `supertest`. Supertest is not in `backend-v2/package.json` and no plan installs it.

**Fix:** Add `cd backend-v2 && npm install --save-dev supertest @types/supertest` to Plan 03-01 Task 1 alongside the `npm install zod` step.

**3. `complete()` and `uncomplete()` return the wrong shape — frontend will crash**

Plan 03-03 uses `prisma.$transaction([update, create])` which returns the raw Prisma result with no `include`s. But `assignments.api.ts` types `Assignment` with `template` and `assignedTo` as required fields. The frontend will render `undefined.template.title` and crash.

**Fix:** Use the callback form of `$transaction` and end with a re-fetch that includes the joins:
```typescript
const updated = await prisma.$transaction(async (tx) => {
  await tx.choreAssignment.update({ ... })
  await tx.pointLog.create({ ... })
  return tx.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { template: true, assignedTo: true },
  })
})
return updated
```

#### HIGH — Goal Completeness

**4. CHORE-02 cannot be fulfilled — first assignment is impossible to create**

The `AssignmentsPage` create form populates its user dropdown from `assignments.map(a => a.assignedTo)`. With zero existing assignments, the dropdown is empty. CHORE-02 requires "Parent assigns template to family member" — this fails at the empty-state boundary.

**Fix:** Add a `GET /api/users` endpoint returning `{ id, name, role, color }` to Plan 03-03 (~15 lines). Mark it `authenticate`-only. The `AssignmentsPage` calls `useUsers()` filtered to `role === 'CHILD'` for the create form.

#### MEDIUM — Will Cause Failures or Incorrect Behavior

**5. Zod v4 changed `err.errors` to `err.issues`**

The `validate()` middleware uses `err.errors.map(...)`. Zod v4 renamed this to `err.issues`. This will compile but throw runtime `undefined` errors on every validation failure.

**Fix:** Change `err.errors` to `err.issues` in the validator. Add a unit test asserting 400 response with `VALIDATION_ERROR`.

**6. `useTemplates` and `useAssignments` update function signatures are mismatched**

Hooks expose `updateTemplate(id, data)` but `mutateAsync` takes a single `{ id, data }` object. Pages will call with two args; only `id` will be received.

**Fix:** Expose wrapper: `updateTemplate: (id, data) => updateMutation.mutateAsync({ id, data })`.

**7. Integration tests share dev.db with no isolation strategy**

Plans 03-02 and 03-03 use the live `dev.db`. Scaffold test asserts `choreTemplate.count() >= 3`. Integration tests that create/delete templates will cause intermittent failures.

**Recommendation:** Add `afterAll`/`beforeEach` cleanup tracking only created IDs in each test file.

#### LOW — Non-Blocking

**8. Completed assignments have no uncomplete path in the UI** — 409 error leaves no forward path. Surface "uncomplete first" hint in error message.

**9. `setTimeout` cleanup in success messages** — unmount before 3s timeout causes React warning. Use `useEffect` cleanup pattern.

**10. Prisma `$transaction([])` mock complexity in unit tests** — the array of Promises needs `Promise.all(ops)` not `ops[0]`. Document explicitly.

### Risk Assessment

**MEDIUM-HIGH** without fixes → **LOW-MEDIUM** with fixes.

The architecture is correct and the plans are well-reasoned. The three execution blockers (route stubs, missing supertest, wrong return shape) are all mechanical fixes under 30 minutes each. The CHORE-02 user-list gap is the one substantive scope addition. The Zod v4 API drift and hook signature mismatch are silent failures that would require debugging after the fact.

With the four HIGH items addressed, this phase plan is ready for execution.

---

## Consensus Summary

*Only one reviewer (Claude) — no multi-reviewer consensus available.*

### Agreed Strengths
- Architectural fidelity to locked decisions (D-01 through D-18)
- Correct TDD sequencing on backend plans
- UI-SPEC traceability throughout frontend plans
- Threat model is proportionate and covers real risks
- Plan 03-01 correctly sequences foundation dependencies

### Key Concerns (Prioritized)
1. **[HIGH]** Route stubs in Plan 03-01 cause compile failure — remove route mounting from foundation plan
2. **[HIGH]** `supertest` never installed — add to Plan 03-01 dependency installs
3. **[HIGH]** `complete()`/`uncomplete()` return wrong Prisma shape — use callback `$transaction` with re-fetch
4. **[HIGH]** CHORE-02 empty-state: no user list for first assignment — add `GET /api/users` to Plan 03-03
5. **[MEDIUM]** Zod v4 `err.errors` → `err.issues` API drift
6. **[MEDIUM]** Hook update function signature mismatch
7. **[MEDIUM]** Integration test DB isolation strategy needed

### Recommendation
Apply fixes for all 4 HIGH items before execution. The MEDIUM items will cause silent failures but can be addressed in execution if the executor is aware of them. Run `/gsd-plan-phase 3 --reviews` to incorporate feedback into revised plans.
