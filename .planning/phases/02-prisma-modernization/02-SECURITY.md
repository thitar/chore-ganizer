---
phase: 02
slug: prisma-modernization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-02
---

# Phase 02 — Prisma Modernization: Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| app → database | Prisma client writes/reads RecurringChore data to SQLite | RecurringChore records with `recurrenceRule` JSON |
| npm registry → backend | Package download during `npm install` | Prisma 6.x packages |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-001 | Tampering | database.ts $extends serialize | mitigate | Integration tests verify round-trip data integrity. All write operations (create/update/upsert) explicitly serialize `recurrenceRule`. | closed |
| T-02-002 | Information Disclosure | database.ts $extends deserialize | mitigate | Only transforms `recurrenceRule` field (verified: 17/17 references in database.ts are `recurrenceRule`-only). No other data transformed. | closed |
| T-02-003 | Denial of Service | server.ts singleton import | mitigate | Same singleton used across app. If database.ts fails to initialize, app exits at startup (existing behavior). | closed |
| T-02-004 | Tampering | npm install | transfer | Package integrity verified by npm registry signatures and lockfile. CI pins to lockfile via `npm ci`. | closed |
| T-02-005 | Spoofing | Prisma 6.x API | mitigate | Full test suite (241 unit + 152 integration + TypeScript compilation + lint) validates no behavioral changes. Fix-forward approach. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-02 | 5 | 5 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-02
