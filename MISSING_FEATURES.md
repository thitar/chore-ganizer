# Missing Features & Remaining Concerns

**Last Audited:** 2026-05-03
**Context:** v2.2.0 milestone (Admin Dashboard) just shipped
**App Profile:** Homelab family app — single family, 4-6 users, low traffic, no multi-tenancy

---

## Audit Status

The original `CONCERNS.md` (2026-04-28) listed ~20 items. **Most were already fixed** in v2.1.10 and v2.2.0. This document reflects the *current* state after both milestones.

---

## ✅ Fixed (no action needed)

These items from `CONCERNS.md` were addressed in prior work:

| Concern | Fixed In | How |
|---------|----------|-----|
| Large recurring-chores controller (1081 lines) | v2.1.10 | Split into `recurring-chores-crud.controller.ts` (296) + `recurring-chores-occurrences.controller.ts` (295) + barrel re-export |
| Silent child redirect on parent routes | v2.1.10 | `ProtectedRoute` now shows `toast.error('Access Denied')` before redirecting |
| Console statements in backend (45 reported) | v2.1.10 | 0 remaining in `backend/src/` — all migrated to Winston or removed |
| Session secret startup validation | v2.1.10 | `app.ts:25` — explicit check: `if (!process.env.SESSION_SECRET)` fails with clear error |
| Batch `createMany` for occurrence generation | v2.1.10 | `occurrence.service.ts:58` already uses `prisma.choreOccurrence.createMany()` |
| API Rate Limiting Visibility (admin UI) | v2.2.0 | `GET /admin/rate-limits/per-user` endpoint + `RateLimitCard` component |
| Recurrence service edge case tests | v2.1.10 | `recurrence.service.test.ts` covers leap year, month-end, DST |

---

## 🔴 Would Fix (homelab-relevant)

Items that could cause real issues for a family using this app daily.

### 1. Overdue Penalty Edge Case Tests

**Source:** `CONCERNS.md` — Test Coverage Gaps (Priority: High)

**Risk:** If `overduePenalty.service.ts` has bugs in penalty calculation — double-penalizing or missing penalties — kids can get unfairly penalized or escape consequences. Real family impact.

**Files:**
- `backend/src/services/overdue-penalty.service.ts` — penalty application logic
- `backend/src/__tests__/services/` — no dedicated penalty test file found

**What's untested:**
- `penaltyApplied` flag prevents double-penalizing on re-run
- Timezone-aware due date comparisons (UTC vs local)
- Partial weeks / mid-week penalty application
- What happens when penalty is applied after parent adjusts settings

**Suggested test coverage:**
```
describe('Overdue Penalty Service')
  it('should not double-penalize when run twice')
  it('should handle timezone boundary for due dates')
  it('should skip penalties for completed chores')
  it('should apply correct penalty amount from settings')
```

**Homelab verdict:** WORTH FIXING. Test file can reuse existing mock patterns from `statistics.service.test.ts`. ~30 min effort.

---

### 2. Frontend Error Handling Paths (API Errors)

**Source:** `CONCERNS.md` — Test Coverage Gaps (Priority: Medium)

**Risk:** If the frontend silently fails on API errors, parents won't know when something is broken. For a homelab app where the developer IS the user, this is less critical — but a confusing blank screen is still frustrating.

**What's untested:**
- `api/client.ts` — 401 auto-logout flow
- Network failure handling in hooks
- CSRF retry fallback behavior
- ErrorDisplay component rendering on API 500s

**Homelab verdict:** LOW PRIORITY. Developer can check browser console. Fix only if you encounter confusing blank screens.

---

## 🟡 Nice to Have (low effort, minor polish)

Items that are easy to address and improve the experience slightly.

### 3. CSRF Retry Max Count

**Source:** `CONCERNS.md` — Security Considerations

**Current state:** `frontend/src/api/client.ts` retries CSRF errors once. No max retry count — could theoretically loop if token refresh keeps failing.

**For homelab:** Probability of hitting this in a single-family setup ≈ 0%. But adding a max retry is a 3-line change.

**Fix:**
```typescript
// In client.ts CSRF interceptor — add:
if (retryCount > 3) {
  console.error('[ApiClient] CSRF retry exhausted — not retrying')
  return Promise.reject(error)
}
```

**Homelab verdict:** SKIP unless you're bored.

---

### 4. JSON `recurrenceRule` → Prisma Json Type

**Source:** `CONCERNS.md` — Tech Debt

**Current state:** `recurrenceRule` stored as JSON string, parsed with `JSON.parse()` at read boundaries. Works fine.

**Prisma fix:** Change `String` → `Json` in schema, remove manual parse/stringify.

**Homelab verdict:** SKIP. Cosmetic. If you upgrade Prisma and touch this model anyway, fold it in.

---

## ⚪ Skip (production scaling concerns)

These are real concerns *if* this app ever needs to serve multiple families with concurrent users. For a homelab: not relevant.

| Concern | Why Skip for Homelab |
|---------|---------------------|
| SQLite → PostgreSQL migration | Single-family concurrent writes are fine on SQLite |
| In-memory cache → Redis | Single backend instance — no replication needed |
| Prisma major upgrade risk | Pin to current version; upgrade when needed |
| Lucide React bundle size | Negligible on modern devices with good internet |
| Frontend error path test coverage | Developer has console access for debugging |
| Integration test DB lifecycle | Only matters if CI is flaky |

---

## Summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 Would fix | Overdue penalty edge case tests | ~30 min | Prevents unfair double-penalties |
| 🟡 Nice to have | CSRF retry max count | ~5 min | Belt-and-suspenders safety |
| 🟡 Nice to have | JSON recurrenceRule → Prisma Json | ~15 min | Cleaner code |
| ⚪ Skip | Everything else in CONCERNS.md | N/A | Not relevant for homelab |

**Bottom line:** The codebase is in solid shape. The v2.1.10 remediation + v2.2.0 admin dashboard addressed almost every concern. New feature work would be more valuable than further polish.

---

*Last updated: 2026-05-03*
