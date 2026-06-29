# Phase 9: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 9-Foundation
**Areas discussed:** Service surface area, Body/Click format file layout, Domain wrapper signature shape, Test mocking for fetch

---

## Service surface area

| Option | Description | Selected |
|--------|-------------|----------|
| sendNtfy only | Foundation ships just `sendNtfy(topic, title, body, opts)`. Each later phase writes its own domain wrapper. | |
| sendNtfy + 3 wrappers | Foundation ships `sendNtfy` plus `notifyChoreAssigned/DueSoon/Completed`. Each wrapper encapsulates its priority/tags/body format. | ✓ |
| Let me decide | Agent uses recommended option. | |

**User's choice:** sendNtfy + 3 wrappers
**Notes:** Matches `research/SUMMARY.md` recommendation. Phases 11–13 become one-liners at the call site.

---

## Body/Click format file layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single file (service.ts) | All in `notification.service.ts` (~150 lines). One file, easy to scan end-to-end. | |
| Split: service.ts + formatters.ts | `service.ts` (~80 lines, transport only) + `formatters.ts` (~70 lines, pure format functions). | ✓ |
| Let me decide | Agent picks. | |

**User's choice:** Split: service.ts + formatters.ts
**Notes:** Formatters are pure & independently testable. Service stays focused on transport (fetch, timeout, error swallowing).

---

## Domain wrapper signature shape

| Option | Description | Selected |
|--------|-------------|----------|
| Full Prisma object | Caller pre-fetches with includes, passes the typed object. Type-safe, no string assembly in the wrapper. | ✓ (agent default) |
| Primitives only | Caller extracts `{ id, title, recipientNtfyTopic }`. Wrapper is pure/dumb. | |
| Let me decide | Agent picks. | |

**User's choice:** Let me decide
**Notes:** Agent defaulted to Full Prisma object — matches `recurring.service.completeOccurrence` style (caller pre-fetches, service consumes typed object).

---

## Test mocking for fetch

| Option | Description | Selected |
|--------|-------------|----------|
| spyOn global.fetch | `jest.spyOn(global, 'fetch').mockResolvedValue(...)`; relies on existing `clearMocks: true`. | ✓ |
| global.fetch = jest.fn() | Direct assignment. Simpler but global state leaks. | |
| Mocked fetch helper module | Wrap native fetch in a small `lib/fetch.ts`, mock the helper. | |
| Let me decide | Agent picks. | |

**User's choice:** spyOn global.fetch
**Notes:** No global pollution, standard Jest pattern, works with the existing `clearMocks: true` in `backend/jest.config.js`.

---

## the agent's Discretion

- **Log prefix** — `[ntfy]` to match `research/PITFALLS.md` examples
- **`NTFY_BASE_URL` trailing slash** — normalize internally, document in `.env.example`
- **Module-load warning vs startup-time** — read at module top-level (per `config/prisma.ts` pattern)
- **`formatters.ts` exports shape** — 3 named functions, one per event (matches the 3 wrappers)
- **Test isolation for env-disabled path** — split config read into `getNtfyConfig()` function for testability

---

## Deferred Ideas

None new — discussion stayed within Phase 9 scope. Items in `.planning/STATE.md` deferred table ("Per-user `ntfyBaseUrl` override", "Per-event notification toggles", "Email / Slack fallback") remain unaffected.
