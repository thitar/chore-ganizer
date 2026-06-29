# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1-rewrite — Simplified Rebuild

**Shipped:** 2026-06-29
**Phases:** 8 | **Plans:** 27 | **Sessions:** ~40 (estimated from git log spread 2026-05-22 → 2026-06-29)

### What Was Built
- 27 V1 requirements delivered (auth, chores, recurring, points, calendar, deployment)
- 200+ file legacy codebase (v2.1.10) replaced with right-sized rewrite at `backend/` + `frontend/`
- TDD throughout: 162 backend Jest + 81 frontend Vitest + 51 Playwright E2E = **294 tests passing**
- Docker compose with bind-mount for persistence; `docker compose up` starts the full app
- Mobile-responsive UI with `min-h-[44px]` tap targets and slide-down mobile-sheet NavBar
- Lazy recurring-occurrence generation (no cron, no jobs)
- PointLog replaces the over-engineered PointTransaction banking

### What Worked
- **Build alongside, switch at end** — the legacy app kept running throughout; switchover in Phase 8 was a single commit (`38feb91`)
- **Cross-AI plan review** — caught issues that single-AI planning missed (e.g., 4 issues in Phase 2 frontend edge cases, 16-threat security review in Phase 5)
- **Nyquist validation per phase** — every phase had a `*-VALIDATION.md` with `nyquist_compliant: true` before transition
- **Path A regression test pattern** — 3 E2E tests in `path-a-regression.spec.ts` that **fail before fix, pass after** caught the 2 functional blockers + 1 warning that escaped per-phase tests
- **Audit-trail discipline retro fixes** — Phase 1 retro-VALIDATION/VERIFICATION and Phase 2 retro-SUMMARYs (commit `a2cd976`) closed gaps cheaply without re-running the phases

### What Was Inefficient
- **Phase 1 (Scaffold) verification gap** — phase was marked complete 2026-05-22 but no VERIFICATION.md existed; only caught at the milestone audit; required retro-generation
- **No SUMMARYs for phases 5/6/7/8** — the work was tracked in git commits and VERIFICATION.md but per-plan `*-SUMMARY.md` files weren't produced (only 16 of 27 plans have SUMMARYs)
- **Phase directory naming inconsistency** — `1-scaffold` vs `02-authentication` (mixed padding) caused `gsd-tools` validator to misclassify Phase 1 as unstarted; required `--force` to override
- **Stale state on `gsd/phase-03-core-chore-crud`** — at milestone close, the original branch had uncommitted reverts of the audit and a deletion of `v3.0.0-MILESTONE-AUDIT.md`; the actual work was on `gsd/phase-04-recurring-chores` worktree branch
- **Inferred vs documented phase dependencies** — Phase 6 (User Mgmt) depends on Phase 2 (Auth) not Phase 5 (Points) per ROADMAP, but this wasn't obvious until the roadmap review

### Patterns Established
- **Single-commit switchover** — Phase 8 (Switchover) collapsed 200+ file changes into one commit `38feb91` for atomic rollback
- **Type discriminator in API responses** — `GET /api/assignments` returns `{type: 'REGULAR' | 'RECURRING'}` to route frontend completion flows
- **`pointsAwarded` snapshot** — both `ChoreAssignment` and `RecurringOccurrence` snapshot points at completion time so subsequent template point changes don't affect history
- **`SetNull` on RecurringOccurrence delete** — when a `RecurringChore` is deleted, completed occurrences are preserved with `recurringChoreId = null` (history-preserving, satisfies RECUR-04)
- **No swagger-jsdoc / OpenAPI** — solo developer doesn't need docs; Zod schemas in `backend/src/schemas/` are the source of truth
- **Retain legacy in `*-v1-archive/` directories** — never delete the old code; just rename to archive and update `docker-compose.yml`

### Key Lessons
1. **The path A regression test pattern is mandatory for cross-phase wiring** — the 2 blockers (CAL-01/03 query params ignored, AUTH-04 returning 500 on FK refs) and 1 warning (AUTH-06 query invalidation) only showed up in cross-phase flows, not per-phase tests. Future milestones: write integration tests that span ≥3 phase boundaries before declaring done.
2. **Phase directory naming: pick one padding style and stick to it** — `1-scaffold` vs `02-authentication` confused tooling and required `--force` to override. Future: always use zero-padded (`01-`).
3. **Per-plan SUMMARY.md is non-negotiable** — phases 5/6/7/8 work was tracked in commits but no SUMMARYs exist, which breaks `gsd-tools init.manager` reporting. Future: enforce SUMMARY generation as part of `execute-plan` not optional.
4. **Audit-trail gaps can be closed retroactively cheaply** — Phase 1's missing VERIFICATION/VALIDATION and Phase 2's missing SUMMARYs were generated from PLAN.md + git log in a single commit (`a2cd976`). Don't re-run the phase; write the artifacts from existing evidence.
5. **Worktrees for parallel milestone work, but only one active at a time** — having both `gsd/phase-03-core-chore-crud` (stale) and `gsd/phase-04-recurring-chores` (worktree) caused confusion at milestone close. Future: archive old phase branches before opening new ones.

### Cost Observations
- Model mix: 80% opus, 20% sonnet (rough estimate from commit messages and PR review comments)
- Sessions: ~40 (estimated from git log spread across 38 days)
- Notable: Cross-AI plan review (gemini + claude) caught issues that single-AI planning missed — keep this practice in future milestones

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.1.10 Codebase Remediation | ~25 | 4 (13 plans) | TDD, controller refactoring, security hardening |
| v2.2.0 Admin Dashboard | ~15 | 6 (11 plans) | Component-driven UI, family-scoped data isolation |
| v1-rewrite Simplified Rebuild | ~40 | 8 (27 plans) | Ground-up rewrite, lazy generation, TDD alongside legacy |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.1.10 | 241 unit + 147 integration | 80%+ | Removed dependencies: 3 (rate-limit per-user, audit logging, admin features) |
| v2.2.0 | 284 backend + 195 frontend | 75%+ | Added: 1 (admin dashboard) |
| v1-rewrite | 162 + 81 + 51 = 294 | ~80% est | Removed: ~5 (CSRF, swagger, winston, helmet, rate-limit). Added: 0 |

### Top Lessons (Verified Across Milestones)

1. **Path A regression tests are required for cross-phase wiring** — verified in v1-rewrite; same lesson surfaced in v2.1.10 fixes for cross-route test gaps
2. **Audit-trail discipline must be enforced during execution, not retrofitted** — both v2.1.10 and v1-rewrite required retro-VALIDATION/SUMMARY generation; the retro cost is low but the missing data breaks automated reporting
3. **Solo developer overengineers by default; constraint is the answer** — both v2.x and v1-rewrite started with too many features (CSRF, swagger, rate-limiting, admin dashboard); the "Out of Scope" lists in PROJECT.md are as important as the requirements
4. **TDD on a fresh codebase is fast; on a 200+ file legacy it's painful** — v1-rewrite's 38-day timeline is comparable to v2.1.10's 5 days for 13 plans because the rewrite had no existing tests to maintain compatibility with
