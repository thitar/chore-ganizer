# Codebase Structure

**Analysis Date:** 2026-07-04

## Directory Layout

```
chore-ganizer/
├── backend/            # Backend Express server
│   ├── src/
│   │   ├── routes/     # API Endpoints
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Auth, Validation, Err
│   │   └── prisma/     # DB Schema/Migrations
├── frontend/           # Frontend React App
│   ├── src/
│   │   ├── api/        # Data fetching layer
│   │   ├── hooks/      # Domain-specific logic
│   │   ├── components/ # Shared UI components
│   │   └── pages/      # Route components
```

## Directory Purposes

**`backend/src/routes/`**: API definitions, mapping HTTP requests to service methods.
**`backend/src/services/`**: The core business engine.
**`frontend/src/api/`**: One file per domain (e.g., `assignments.api.ts`).

## Key File Locations

**Entry Points:**
- `backend/src/server.ts`: Backend entry.
- `frontend/src/main.tsx`: Frontend entry.

**Core Logic:**
- `backend/src/services/`: All primary business rules.

## Naming Conventions

**Files:**
- API: `[domain].routes.ts` (backend), `[domain].api.ts` (frontend)
- Services: `[domain].service.ts`

## Where to Add New Code

**New Feature:**
- API Route: `backend/src/routes/[domain].routes.ts`
- Service Logic: `backend/src/services/[domain].service.ts`
- Frontend API: `frontend/src/api/[domain].api.ts`
- Frontend UI: `frontend/src/pages/[domain].tsx`

---

*Structure analysis: 2026-07-04*
