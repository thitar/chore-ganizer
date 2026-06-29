# Phase 3: Core Chore CRUD - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 03-core-chore-crud
**Areas discussed:** Template mutability, Point tracking, Filtering architecture, Delete semantics

---

## Template Mutability

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade to existing assignments | All pending assignments reflect updated points/title. Completed assignments stay with original values. | ✓ |
| Snapshot at creation | Assignments store a copy at creation. Template edits do not change existing assignments. | |
| Edit is blocked | Templates with active assignments cannot be edited. | |

**User's choice:** Cascade to existing assignments
**Notes:** Template is the single source of truth for pending assignments. Only pending ones update.

| Option | Description | Selected |
|--------|-------------|----------|
| Completed stay as-is | Completed assignments keep point value at completion time. | ✓ |
| Completed also update | Completed assignments update to match new template value. User points recalculated. | |

**User's choice:** Completed stay as-is — never retroactively change earned points.

| Option | Description | Selected |
|--------|-------------|----------|
| Add pointsAwarded field | Nullable Int on ChoreAssignment, set to template.points on completion. | ✓ |
| Use template.points always | No new field. Always read current template.points. | |

**User's choice:** Add pointsAwarded for clean audit trail.

| Option | Description | Selected |
|--------|-------------|----------|
| Cascade everything | Title, category, and points all cascade to pending assignments. | ✓ |
| Points only | Only points cascade — title and category frozen. | |

**User's choice:** Cascade everything — consistent rule.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in scope | Templates should be deletable. Cascade-delete all assignments. | ✓ |
| Defer to later phase | Keep it simple — only create and edit. | |

**User's choice:** Template deletion in scope.

| Option | Description | Selected |
|--------|-------------|----------|
| Any parent | All parents share template management equally. | ✓ |
| Creator only | Only the creating parent can edit/delete. | |

**User's choice:** Any parent — simpler family approach.

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text | Any string — no validation, no dropdown. | ✓ |
| Preset list | Fixed categories like Indoor/Outdoor/School. | |

**User's choice:** Free-text category.

---

## Point Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Direct User.points only | Just update balance. No log. Phase 5 backfills. | |
| Write PointLog now | Add PointLog model. Create entry + update points on completion. | ✓ |

**User's choice:** Write PointLog now — correct foundation.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (id, userId, amount, reason, type, createdAt) | No FK to assignment. Lean. | ✓ |
| Also add assignmentId | Link to ChoreAssignment for audit. | |

**User's choice:** Minimal model — no unnecessary FK.

| Option | Description | Selected |
|--------|-------------|----------|
| Only EARNED | Single type for now. Phase 5 extends. | ✓ |
| EARNED and COMPLETED | Two types — overengineered. | |

**User's choice:** Only EARNED type for Phase 3.

**User asked about SUM performance at family scale.** Answer: <1ms with 4 users and ~50-100 log entries. No real-world impact.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep denormalized User.points | Balance updated alongside PointLog. Fast reads. | |
| Remove, compute from log | Single source of truth. Zero drift risk. | ✓ |

**User's choice:** Remove User.points, compute from SUM(PointLog).

| Option | Description | Selected |
|--------|-------------|----------|
| Just template name | Concise. Amount column already shows points. | ✓ |
| Template name + points | Verbose but self-contained. | |
| Free-form service layer | Flexible but inconsistent. | |

**User's choice:** Just template name — concise.

| Option | Description | Selected |
|--------|-------------|----------|
| No uncomplete | Completion is permanent. | |
| Support uncomplete | Status back to PENDING, reversing PointLog entry. | ✓ |

**User's choice:** Support uncomplete — parent can undo mistakes.

---

## Filtering Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend-side | API returns all, Array.filter() in React. | ✓ |
| Backend query params | API params for filtering. Scales but complex. | |
| Hybrid | Both, no clear benefit at this scale. | |

**User's choice:** Frontend-side — KISS for family scale.

**User asked:** Does separate endpoints add unnecessary complexity? Answer: Yes. Single endpoint is simpler.

| Option | Description | Selected |
|--------|-------------|----------|
| Single endpoint | GET /api/assignments — role scoped. | ✓ |
| Separate endpoints | /mine + /all. More routes. | |

**User's choice:** Single endpoint — KISS.

| Option | Description | Selected |
|--------|-------------|----------|
| Show all by default | No date filter. All visible. | |
| Default to current month | From first day to last day of current month. | ✓ |

**User's choice:** Default to current month to reduce noise.

---

## Delete Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Delete allowed, cascade PointLog | Any assignment + its PointLog entries deleted. | |
| Block completed deletion | Only pending can be deleted. Uncomplete first. | ✓ |
| Delete allowed, keep PointLog | Orphaned log entries — messy. | |

**User's choice:** Block completed deletion. Preserve audit trail.

| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete | DELETE FROM ChoreAssignment. | ✓ |
| Soft delete | Status marker. Overengineered. | |

**User's choice:** Hard delete for pending assignments.

| Option | Description | Selected |
|--------|-------------|----------|
| Template delete: block if completed | Can't delete template with completed assignments. | ✓ |
| Template delete: cascade all | Override, delete everything. | |

**User's choice:** Block template delete if completed assignments exist. Consistent rule.

---

## the agent's Discretion

- Exact `reason` string format for PointLog (template name is specified, wording is free)
- Service-layer implementation patterns (follow auth.service.ts conventions)
- API route path naming (`/api/templates` vs `/api/chore-templates`)
- Uncomplete endpoint design (standalone vs part of assignment update)
- Who can uncomplete (parent-only per D-08, but implementer may adjust)

## Deferred Ideas

None — discussion stayed within Phase 3 scope.
