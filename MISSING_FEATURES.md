# Missing Features

**Documented:** 2026-04-28
**Status:** Identified in codebase audit, deferred to future phases

---

## 1. API Rate Limiting Visibility

**Category:** Feature Request
**Source:** `CONCERNS.md` — Missing Critical Features

**Description:**
There is no admin UI to view or manage API rate limit status. Currently, rate limiting is configured in `backend/src/middleware/rateLimiter.ts` but administrators have no visibility into:
- Current rate limit configuration (requests per window)
- Which clients/users are being throttled
- Rate limit hit counts or logs
- Ability to adjust limits without code changes

**Status:** ✅ IMPLEMENTED in v2.1.11 — Settings page + `/api/admin/rate-limits/status` endpoint

**Suggested Approach (for future phase):**
- Add admin-only endpoint: `GET /api/admin/rate-limits/status`
- Expose configuration values and recent throttle events
- Consider adding a lightweight admin dashboard page or CLI tool

---

## 2. Test Coverage for `recurrence.service.ts` Edge Cases

**Category:** Test Coverage Gap
**Source:** `CONCERNS.md` — Missing Critical Features

**Description:**
`backend/src/services/recurrence.service.ts` handles date recurrence logic but lacks automated test coverage for edge cases including:
- **Leap years:** February 29 handling in recurring chores
- **Month-end dates:** Monthly recurrence on the 31st when the next month has fewer days
- **DST transitions:** Daylight Saving Time boundary shifts causing duplicate or skipped occurrences

**Status:** ✅ IMPLEMENTED in v2.1.11 — recurrence.service.test.ts (405 lines, edge cases covered)

**Note:** Plan `01-05` covers edge cases for `overdue-penalty.service.ts` (timezone boundaries, leap year February 29). The recurrence service requires separate test coverage.

**Suggested Approach (for future phase):**
- Create `backend/src/services/recurrence.service.test.ts`
- Add test cases for leap year Feb 29 → following year behavior
- Add test cases for month-end roll-forward (31st → 30th/28th)
- Add test cases for DST spring-forward and fall-back transitions
- Verify `rrule` library behavior or add custom handling if needed

---

## Phase 01 Scope Exclusion

These items are **explicitly out of scope** for Phase 01 (`01-remediate-codebase-concerns`), which is focused on:
- Security vulnerabilities
- Critical bugs
- Performance bottlenecks
- Test coverage gaps (for actively used services)
- Tech debt remediation

They are captured here for prioritization in a future milestone or phase.
