# Chore-Ganizer Documentation

An index of what's current. See the root [AGENTS.md](../AGENTS.md) for agent-specific gotchas and the project memory system.

## Start here

| Need | Document |
|------|----------|
| System design, stack, data model, auth flow | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Running, configuring, backing up, troubleshooting | [OPERATIONS.md](./OPERATIONS.md) |
| First-time production setup | [PRODUCTION-INSTALLATION.md](./PRODUCTION-INSTALLATION.md) |
| Docker/Compose file layout | [DOCKER-CONFIGURATION.md](./DOCKER-CONFIGURATION.md) |
| Push notification (ntfy) setup | [NTFY-SETUP-GUIDE.md](./NTFY-SETUP-GUIDE.md) |
| Using the app day to day | [USER-GUIDE.md](./USER-GUIDE.md) |
| What's deliberately not built yet | [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) |
| Manual UAT pass | [UAT-CHECKLIST.md](./UAT-CHECKLIST.md), [UAT-RESULTS.md](./UAT-RESULTS.md) |
| Version history | [../CHANGELOG.md](../CHANGELOG.md) (the root one — this is the only changelog) |

## API contract

There's no OpenAPI/Swagger doc by design (see AGENTS.md's "API Documentation (none — by design)" section). The source of truth is `backend/src/routes/*.ts` and the Zod schemas in `backend/src/schemas/*.ts`.

## Project memory

Institutional knowledge (bugs with solutions, ADRs, key facts, work log) lives in [project_notes/](./project_notes/), maintained per AGENTS.md's memory-aware protocols.
