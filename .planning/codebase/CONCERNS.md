# Codebase Concerns

**Analysis Date:** 2026-07-04

## Tech Debt

**JSON `recurrenceRule` Storage:**
- Issue: `recurrenceRule` is stored as a JSON string and requires manual `JSON.parse()`/`JSON.stringify()` at read/write boundaries.
- Files: `backend/src/services/recurring.service.ts` and related models.
- Impact: Increased code complexity for data access.
- Fix approach: Update schema to use Prisma `Json` type and remove manual parsing. (Priority: Low)

## Known Bugs

**Overdue Penalty Edge Cases:**
- Issue: Lack of test coverage for the `overduePenalty` service.
- Files: `backend/src/services/overdue-penalty.service.ts`
- Impact: Potential for unfair double-penalizing or incorrect penalty calculation due to timezone or timing edge cases.
- Fix approach: Implement dedicated test suite (`backend/src/__tests__/services/overdue-penalty.service.test.ts`) covering timezone boundary, re-run scenarios, and completion checks. (Priority: High)

## Security Considerations

**CSRF Retry Mechanism:**
- Risk: `frontend/src/api/client.ts` implements a CSRF retry without a max limit, potentially causing loops if token refresh fails repeatedly.
- Current mitigation: Single retry.
- Recommendations: Implement a max retry count in the CSRF interceptor logic in `frontend/src/api/client.ts`. (Priority: Low)

## Performance Bottlenecks

- *Not detected* - Most performance-sensitive areas (like occurrence generation) have been addressed in previous milestones.

## Fragile Areas

**Frontend Error Handling Paths:**
- Files: `frontend/src/api/client.ts`, `frontend/src/components/common/ErrorDisplay.tsx`
- Why fragile: API error paths and network failures are not fully tested, leading to potential "blank screen" behavior on failures.
- Safe modification: Improve hooks and component error boundaries to handle API failure states explicitly.
- Test coverage: Gaps in `api/client.ts` (401 flow) and general network error handling. (Priority: Medium)

## Scaling Limits

- *Not detected* - For the intended homelab (single family, low traffic), current architecture is sufficient.

## Dependencies at Risk

- *Not detected* - Pinned to stable versions.

## Missing Critical Features

- *Not detected* - Current roadmap is focused on polish; all core features are present.

## Test Coverage Gaps

**Overdue Penalty Service:**
- What's not tested: `penaltyApplied` flag logic, timezone-aware comparisons, and partial week application.
- Files: `backend/src/services/overdue-penalty.service.ts`
- Risk: Financial/point inaccuracies for users.
- Priority: High

---

*Concerns audit: 2026-07-04*
