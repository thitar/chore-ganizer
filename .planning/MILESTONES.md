# Milestones

## v2.1.10 — Codebase Health & Quality

**Shipped:** 2026-05-02
**Phases:** 4 | **Plans:** 13 | **Tasks:** 13

### What Was Built

Systematic remediation of 22 known issues across dependency security, tech debt, performance, bugs, and test coverage. The journey moved from low-risk foundation cleanup through Prisma modernization (deprecated `$use` → typed `$extends` + 6.x upgrade), into architecture restructuring (fat controller extraction, versioned migrations, penalty race-condition fixes), and concluded with comprehensive test coverage and CI gates.

### Key Accomplishments

1. **Security & dependency hardening**: 0 HIGH/CRITICAL npm vulns across both packages, SESSION_SECRET startup validation, production error sanitization
2. **Prisma modernization**: $use → $extends migration + seamless 5.22→6.19.3 upgrade with zero breaking changes
3. **Controller extraction**: PocketMoney 817→56 line controller, 4 testable sub-services; consistent service naming (dot.case.ts)
4. **Penalty performance**: $transaction atomicity, Promise.allSettled parallel processing, N+1 notification queries eliminated
5. **Database migrations**: prisma db push → versioned prisma migrate deploy; seed password warning
6. **Frontend console gating**: 57 unconditional console calls replaced with tree-shakeable debug.ts utility
7. **Backend test coverage**: 15 controller test files (261 tests) + 11 service test files — overall 72% statement coverage
8. **Frontend test coverage**: useAuth branch 23%→84.6%, 4 new page test files, CI coverage gates enforced

### Stats

- **Phases:** 4 (13 plans, 13 tasks)
- **Build:** Backend + Frontend clean
- **Tests:** 652 backend unit + 147 integration passing; 245 frontend tests
- **Coverage:** Backend 72% statements, Frontend 68% statements (thresholds: 50/40/45/50)
- **Lint:** Backend ESLint clean (no-console enforced)
- **Known deferred:** Integration test DB lifecycle, SQLite scaling limits, CSP nonce migration
