---
phase: 9
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.0.0 |
| **Config file** | `backend/jest.config.js` |
| **Quick run command** | `cd backend && npm test -- --testPathPattern="notification"` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && npm test -- --testPathPattern="notification"`
- **After every wave:** Run `cd backend && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | NOTIFY-05 | — | No-ops when NTFY_BASE_URL unset | unit | `cd backend && npm test -- notification.service` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | NOTIFY-05 | — | Warning logged once at module load | unit | `cd backend && npm test -- notification.service` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | NOTIFY-06 | — | Catches fetch errors, never throws | unit | `cd backend && npm test -- notification.service` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | NOTIFY-06 | — | AbortSignal.timeout(3000) applied | unit | `cd backend && npm test -- notification.service` | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | NOTIFY-08 | — | Body contains chore summary, no user name | unit | `cd backend && npm test -- notification.formatters` | ❌ W0 | ⬜ pending |
| 9-01-06 | 01 | 1 | NOTIFY-08 | — | Click header is relative path /chores/{id} | unit | `cd backend && npm test -- notification.formatters` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/__tests__/services/notification.service.test.ts` — stubs for NOTIFY-05, NOTIFY-06
- [ ] `backend/src/__tests__/services/notification.formatters.test.ts` — stubs for NOTIFY-08
- [ ] `backend/src/config/notifications.ts` — new config module
- [ ] `backend/src/services/notification.service.ts` — new service module
- [ ] `backend/src/services/notification.formatters.ts` — new formatters module
- [ ] Prisma schema update — 3 new nullable columns

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending