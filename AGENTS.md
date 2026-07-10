# AGENTS.md

This file provides guidance to agents when working with code in this repository. It covers only what's agent-specific: gotchas that would otherwise cause a regression, and the project's memory system. For system design, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). For running/deploying/troubleshooting, see [docs/OPERATIONS.md](./docs/OPERATIONS.md).

## Quick Reference

- Version bumps: [docs/OPERATIONS.md#version-bumps](./docs/OPERATIONS.md#version-bumps)
- Environment variables: [docs/OPERATIONS.md#environment-variables](./docs/OPERATIONS.md#environment-variables)
- Starting the app: [docs/OPERATIONS.md#starting-the-app](./docs/OPERATIONS.md#starting-the-app)
- Health checks: [docs/OPERATIONS.md#health-checks--monitoring](./docs/OPERATIONS.md#health-checks--monitoring)
- Stack, backend/frontend structure, auth flow, data model, key decisions: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

Local dev: `cd backend && npm install && npm run dev` (port 3010), `cd frontend && npm install && npm run dev` (port 5173, proxies `/api/*` to the backend). Requires Node.js 18+.

## Testing Patterns

- **Backend unit tests**: `jest.mock('../../config/prisma', () => ({ prisma: { ... } }))` inline per test file — there is no shared `__mocks__`/`prismaMock` helper. Look at an existing test file (e.g. `backend/src/__tests__/services/points.service.test.ts`) for the pattern before writing a new one.
- **No integration test suite currently exists** — no `jest.integration.config.js`, no test database, no `test:unit`/`test:integration` npm scripts. `npm test` runs the full (mocked-Prisma) unit suite via plain `jest`.
- **Frontend tests**: `frontend/src/test/setup.ts` only wires up `jest-dom` matchers and `cleanup()` — there is no shared `utils.tsx` with mock data factories or a `renderWithRouter` helper. API calls are mocked per-test via `vi.mock()`.
- **E2E tests** (`e2e/`, root-level, Playwright): use `.spec.ts` suffix; run with `npm run test:e2e` from the repo root. Unit tests use `.test.ts`/`.test.tsx`.
- **No lint or format npm scripts** currently exist in either package (`npm run lint`/`npm run format` are not defined) — there's no ESLint or Prettier config checked in for either `backend/` or `frontend/`. If you add one, wire it into CI too, since nothing currently gates on it.

## Non-Obvious Conventions

### Frontend-Backend Parameter Mapping

Frontend uses simplified parameter names internally, mapped to backend API expectations in the `frontend/src/api/` layer:

| Frontend | Backend | File |
|----------|---------|------|
| `userId` | `assignedToId` | `frontend/src/api/assignments.api.ts` |
| `templateId` | `choreTemplateId` | `frontend/src/api/assignments.api.ts` |

**Rule:** Mapping always happens in `frontend/src/api/` files, never in components or hooks.

- **Children accessing parent-only routes** see an explicit "403 Forbidden" message rendered by `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx`) — this is not a silent redirect to the dashboard.
- **401 responses**: `frontend/src/api/auth.api.ts` catches a `401` and throws a typed `AuthError`; `useAuth` surfaces it via React Query's error state, and `ProtectedRoute` reacts by redirecting to `/login`. There is no custom DOM event involved.
- **CSRF cookie name must stay an inline string literal**: `backend/src/middleware/csrf.ts` sets `res.cookie('XSRF-TOKEN', ...)` with the literal instead of a `CSRF_COOKIE` const, because CodeQL's `js/missing-token-validation` check only resolves literal string arguments (no constant propagation) to recognize hand-rolled CSRF middleware. Don't "clean this up" by switching back to a const — it silently regresses CodeQL's security scan.
- **Every `frontend/src/api/*.ts` module must build its axios instance via `createApiClient()`** in `frontend/src/lib/apiClient.ts`, never `axios.create()` directly — instances created independently don't share interceptors with the CSRF-token-injecting one, so a raw `axios.create()` silently drops the `x-xsrf-token` header on every mutating request. (Root-caused in `docs/project_notes/bugs.md`, 2026-07-08 — this exact bug has happened before.)

### Monorepo Structure

Two independent npm packages, `backend/` and `frontend/`, each producing its own Docker image (`ghcr.io/thitar/chore-ganizer-{backend,frontend}:VERSION`). Both `package.json` files must carry identical version numbers — see [docs/OPERATIONS.md#version-bumps](./docs/OPERATIONS.md#version-bumps). The root `package.json` exists only for Playwright e2e tooling and has its own independent (currently out-of-sync) version field — not part of that contract.

### API Documentation (none — by design)

The v1-rewrite intentionally does **not** generate OpenAPI/Swagger docs. A solo developer who wrote the API doesn't need docs to remember it. The `backend/src/routes/*.ts` and `backend/src/schemas/*.ts` files (Zod schemas) are the authoritative contract.

If a future contributor wants API docs:
- The Zod schemas in `backend/src/schemas/*.ts` are the single source of truth for request bodies
- The TypeScript return types in service methods document the response shapes
- Run the dev server and curl endpoints; the Express middleware returns JSON `{success, data, error}` envelopes with descriptive error messages

Legacy references removed during the v1-rewrite (Phase 8) and not replaced: `docs/swagger.json`, `backend/src/swagger.config.ts`, `backend/scripts/generate-swagger.ts`, `SWAGGER_JSDOC_GUIDE.md`, the "Validate Swagger documentation" CI step.

## Project Memory System

This project maintains institutional knowledge in `docs/project_notes/` for consistency across sessions.

### Memory Files

- **bugs.md** — Bug log with dates, solutions, and prevention notes
- **decisions.md** — Architectural Decision Records (ADRs) with context and trade-offs
- **key_facts.md** — Project configuration, credentials, ports, important URLs
- **issues.md** — Work log with ticket IDs, descriptions, and URLs

### Memory-Aware Protocols

**Before proposing architectural changes:**
- Check `docs/project_notes/decisions.md` for existing decisions
- Verify the proposed approach doesn't conflict with past choices
- If it does conflict, acknowledge the existing decision and explain why a change is warranted

**When encountering errors or bugs:**
- Search `docs/project_notes/bugs.md` for similar issues
- Apply known solutions if found
- Document new bugs and solutions when resolved

**When looking up project configuration:**
- Check `docs/project_notes/key_facts.md` for ports, URLs, service accounts
- Prefer documented facts over assumptions

**When completing work on tickets:**
- Log completed work in `docs/project_notes/issues.md`
- Include date, brief description, and relevant context

**When user requests memory updates:**
- Update the appropriate memory file (bugs, decisions, key_facts, or issues)
- Follow the established format and style (bullet lists, dates, concise entries)
