<!-- refreshed: 2026-07-04 -->
# Architecture

**Analysis Date:** 2026-07-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (React)                    │
│         `frontend/src/pages/`, `frontend/src/components/`    │
├──────────────────┬──────────────────┬───────────────────────┤
│   API Client     │   Domain Hooks   │      Router           │
│  `api/*.api.ts`  │  `hooks/use*.tsx`│      `App.tsx`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│         `backend/src/routes/`                                │
└──────────────────────────┬──────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic (Services)                 │
│         `backend/src/services/`                              │
└──────────────────────────┬──────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Prisma + SQLite)              │
│         `backend/prisma/schema.prisma`                       │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Routes | HTTP routing | `backend/src/routes/` |
| Services | Business logic | `backend/src/services/` |
| Middleware| Security/Auth/Err| `backend/src/middleware/` |
| API | Data fetching | `frontend/src/api/` |
| Hooks | Domain state | `frontend/src/hooks/` |
| Pages | UI/Routing | `frontend/src/pages/` |

## Pattern Overview

**Overall:** Layered Monolith (Backend) / Component-Driven (Frontend)

**Key Characteristics:**
- Separation of HTTP/transport layer from business logic.
- Domain-driven service organization.
- Strict API/backend communication via defined domain API files.

## Layers

**Backend API Layer:**
- Purpose: HTTP request handling
- Location: `backend/src/routes/`
- Contains: Express router definitions
- Depends on: Services, Middleware

**Backend Service Layer:**
- Purpose: Core business rules
- Location: `backend/src/services/`
- Contains: TS classes/functions for data manipulation
- Depends on: Prisma Client

**Frontend API Layer:**
- Purpose: Backend data communication
- Location: `frontend/src/api/`
- Contains: Axios clients with CSRF protection

## Data Flow

### Primary Request Path

1. User interacts (e.g., clicks a chore) -> `frontend/src/pages/`
2. UI triggers domain hook -> `frontend/src/hooks/useChores.tsx`
3. Hook calls API client -> `frontend/src/api/assignments.api.ts`
4. Backend route handler -> `backend/src/routes/assignments.routes.ts`
5. Service processes logic -> `backend/src/services/assignment.service.ts`
6. Database updated -> `backend/prisma/schema.prisma`

## Key Abstractions

**Service Pattern:**
- Purpose: Centralize business logic for entities.
- Examples: `backend/src/services/users.service.ts`

**API Client Pattern:**
- Purpose: Standardize API calls with CSRF tokens.
- Examples: `frontend/src/api/client.ts`

## Entry Points

**Backend Server:**
- Location: `backend/src/server.ts`

**Frontend App:**
- Location: `frontend/src/main.tsx`

## Architectural Constraints

- **Auth:** Strict PARENT/CHILD role enforcement.
- **State:** Auth state lives in React Context (`frontend/src/hooks/useAuth.tsx`), not external state managers.

---

*Architecture analysis: 2026-07-04*
