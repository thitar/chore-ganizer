# Milestones

## v2.1.10 — Codebase Remediation

**Shipped:** 2026-04-28
**Phases:** 1 | **Plans:** 8

### What Was Built

Security hardening, CSRF retry prevention, bug fixes, test coverage expansion, performance improvements, controller refactoring, and documentation improvements addressing all codebase audit concerns.

### Key Accomplishments

1. Security hardening: SESSION_SECRET validation + production error sanitization
2. CSRF retry loop prevention with 5 Vitest tests
3. Access denied toast for child users + CI version sync gate
4. Frontend error handling test coverage (401/network/500 paths)
5. Overdue penalty edge case hardening (18 Jest tests, double-penalty guard)
6. Batch occurrence generation via Prisma createMany + console-to-Winston migration
7. Controller refactoring: 966-line monolithic → 299 + 288 line focused controllers
8. Parameter naming conventions documented + JSON storage evaluation

### Stats

- **Commits:** 63
- **Files changed:** 41
- **Lines:** +5,887 / -1,329
- **Build:** Backend + Frontend clean
- **Tests:** 241 unit + 147 integration passing
- **Lint:** Backend ESLint clean
- **UAT:** 8/8 passed
- **Security:** 16/16 threats closed (13 mitigated, 3 accepted)

### Known Gaps

- API Rate Limiting Visibility deferred (MISSING_FEATURES.md)
- Recurrence service edge case tests deferred (MISSING_FEATURES.md)
