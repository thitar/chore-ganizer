# Open Concerns Remediation

**Date:** 2026-04-29
**Status:** Approved

## Problem

Three open items remain from the v2.1.10 codebase audit (`.planning/codebase/CONCERNS.md` + `MISSING_FEATURES.md`):

1. **JSON Storage:** `recurrenceRule` stored as Prisma `String` requiring manual `JSON.parse`/`JSON.stringify` at 4 boundaries — error-prone, no type safety.
2. **Parameter naming mismatch:** Frontend uses `userId`/`templateId` while backend Prisma fields are `assignedToId`/`choreTemplateId` — requires manual mapping in API layer.
3. **Rate limit opacity:** Rate limiting is configured but invisible — no admin UI, no throttle visibility, config values hardcoded.

## Solution

Three independent work items executed in a single phase. Each is self-contained and can be verified independently.

---

## Item 1: JSON Storage Migration

Convert `recurrenceRule` from Prisma `String` to `Json` type.

**Rationale:** Prisma `Json` auto-serializes/deserializes — eliminates manual `JSON.parse`/`JSON.stringify`. SQLite stores `Json` identically to `String` (as text), so no data migration is needed. Existing data is already valid JSON.

### Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` (line ~259) | `recurrenceRule String // JSON string` → `recurrenceRule Json` |
| `controllers/recurring-chores-crud.controller.ts` | Remove `JSON.stringify(recurrenceRule)` at create (line 93) and update (line 205) |
| `services/recurring-chores/transform.service.ts` | Remove `JSON.parse(dbRecord.recurrenceRule)` (lines 8-14) |
| `jobs/occurrenceJob.ts` | Remove `JSON.parse(rc.recurrenceRule)` (lines 67-77) |

### Verification

- Existing tests for recurrence creation/retrieval pass
- Prisma client returns `recurrenceRule: RecurrenceRule` (typed) instead of `recurrenceRule: string`
- Build compiles clean

---

## Item 2: Prisma Field Rename

Rename Prisma fields from `assignedToId`/`choreTemplateId` to `userId`/`templateId` using `@map` attribute.

**Strategy:** `@map("assignedToId")` keeps the SQLite column name unchanged — zero data migration. Only the Prisma client API surface changes.

### Prisma Schema Changes

Only `ChoreAssignment` model needs renaming — all other models already use `userId`:

```prisma
model ChoreAssignment {
  userId     Int  @map("assignedToId")
  templateId Int  @map("choreTemplateId")
  // ... rest unchanged, including assignedById (different concept)
}
```

### Backend Files Updated

- `prisma/schema.prisma` — `@map` on `assignedToId` and `choreTemplateId`
- `controllers/chore-assignments.controller.ts` — field references (~25 refs)
- `controllers/overdue-penalty.controller.ts` — `assignedToId` in notification creation
- `services/chore-assignments.service.ts` — query field references
- `schemas/validation.schemas.ts` — Zod schema field names
- `prisma/seed.ts` — seed data field names
- `__tests__/test-helpers.ts` — mock data factories

### Frontend Files Updated

- `api/assignments.api.ts` — remove `userId → assignedToId` mapping in `getAll()`
- `api/chores.api.ts` — rename `assignedToId` filter param to `userId`
- `types/index.ts` — align interface field names (~6 interfaces)
- `hooks/useChores.ts` — rename filter param
- `pages/Calendar.tsx` — direct references
- `pages/Dashboard.tsx` — direct references
- `test/utils.tsx` — mock data factories

### Verification

- All backend unit/integration tests pass
- Frontend tests pass
- E2E smoke test: create assignment, verify data flows correctly

---

## Item 3: Rate Limit Admin UI

Give parents visibility into API rate limiting status and make limits configurable.

### Backend

**Environment variable configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | 900000 (15min) | Rate limit window duration |
| `RATE_LIMIT_MAX` | 300 | Max requests per window (global) |
| `AUTH_RATE_LIMIT_MAX` | 100 | Max requests per window (auth) |
| `DISABLE_RATE_LIMIT` | false | Existing — bypass all rate limiting |

**Throttle event tracker:**
- In-memory array, max 100 events
- Records `{ timestamp, ip, path }` per throttle via `express-rate-limit` `onLimitReached` callback
- Auto-prunes events outside current window

**New endpoint:**
```
GET /api/admin/rate-limits/status
Auth: Parent-only
Response: {
  success: true,
  data: {
    general: { windowMs: 900000, max: 300, currentCount: 45, disabled: false },
    auth: { windowMs: 900000, max: 100, currentCount: 2 },
    recentThrottleEvents: [{ timestamp, ip, path }, ...]
  }
}
```

### Frontend

**New Settings page (`/settings`, ProtectedRoute):**
- Rate limit status card with config values
- Usage meter: visual bar showing currentCount / max
- Throttle event log: timestamp, IP, path (reasonably truncated)
- Auto-refresh every 30 seconds
- Sonner toast for errors

**Navigation:** Add "Settings" link in Navbar for parents only.

### Verification

- Backend test: `GET /api/admin/rate-limits/status` (auth gate + response shape)
- Frontend test: Settings page renders, displays config, handles error state
- Manual: parent navigates to /settings, sees rate limit info

---

## Execution Plan

All 3 items are independent (touch different Prisma models and different concerns). Recommended wave ordering:

| Wave | Items | Description |
|------|-------|-------------|
| 1 (parallel) | Item 1 + Item 2 | Schema changes — both touch different models (RecurringChore vs ChoreAssignment). `prisma db push` handles both. |
| 2 (parallel) | Item 3 backend + frontend | Rate limit admin API endpoint + Settings page. No dependency on Items 1/2. |
| 3 | Integration tests + E2E | Full test suite run after all changes are in. |

## Testing

- Backend unit tests: update Prisma mocks for new field names; add admin endpoint tests
- Backend integration tests: verify field rename data access; test admin endpoint auth gate
- Frontend tests: update API mock assertions; add Settings page component tests
- Full test suite: `npm test` in both backend and frontend

## Rollback

- Item 1: Revert `prisma/schema.prisma` change — SQLite stores both types as text, safe revert
- Item 2: Remove `@map` attributes and revert field names — no data migration needed
- Item 3: Revert env var refactoring — old defaults are the same constants
