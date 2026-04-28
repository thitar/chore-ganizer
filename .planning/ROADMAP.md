# Roadmap

## Active Milestone

### Phase 1: Remediate Codebase Concerns

**Goal:** Address all concerns raised in the codebase audit (CONCERNS.md) — covering security vulnerabilities, critical bugs, performance bottlenecks, test coverage gaps, and tech debt.

**Depends on:** None

**Plans:** 8 plans in 4 waves

**Plan list:**
- [x] `01-01-PLAN.md` — Security hardening (session validation, error sanitization)
- [x] `01-02-PLAN.md` — CSRF retry loop prevention (TDD)
- [x] `01-03-PLAN.md` — Bug fixes (access denied toast, version sync)
- [x] `01-04-PLAN.md` — Frontend error handling tests (TDD)
- [x] `01-05-PLAN.md` — Overdue penalty edge case tests (TDD)
- [ ] `01-06-PLAN.md` — Performance improvements (batch inserts, console cleanup)
- [ ] `01-07-PLAN.md` — Controller refactoring (extract services)
- [ ] `01-08-PLAN.md` — Documentation & JSON storage evaluation

**Wave Structure:**

| Wave | Plans | Dependencies | What it builds |
|------|-------|--------------|----------------|
| 1 | 01, 02, 03 | None | Security hardening + bug fixes |
| 2 | 04, 05 | 01-02 (client.ts changes) | Test coverage expansion |
| 3 | 06 | 01-04, 01-05 | Performance improvements |
| 4 | 07, 08 | 01-06 | Tech debt reduction + docs |

**Cross-cutting constraints:**
- All backend changes must pass `npm run build` and `npm run lint`
- All frontend changes must pass `npm run build` and `npm run lint`
- TDD plans (02, 04, 05) require RED→GREEN→REFACTOR commit sequence

---

*Roadmap updated: 2026-04-28*
