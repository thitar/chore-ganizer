---
title: Architecture
last_mapped_commit: HEAD
date: 2026-07-12
---

# Architecture

## Overall Pattern

**Monorepo with two independent packages** — client-server architecture. `backend/` (Express API) and `frontend/` (React SPA) deployed as separate Docker containers connected by nginx reverse proxy. Not microservices — single application, two deployable units.

## Backend Layer Structure

**Pattern: Routes → Services → Prisma ORM → SQLite**

```
HTTP Request
  → Express Router (routes/*.ts)         [thin: extracts params, calls service, wraps response]
    → Service functions (services/*.ts)  [all business logic]
      → Prisma Client (config/prisma.ts) [singleton PrismaClient]
        → SQLite database
```

- **Routes** define endpoints, apply middleware (`authenticate`, `authorize`, `validate`), extract params, call services. No business logic.
- **Services** are plain exported functions (not classes). Each file is a module of related functions.
- **Schemas** (Zod) used by `validate()` middleware on 3 of 8 route files. Others read `req.body` directly.
- **Middleware** is modular: `auth.ts`, `csrf.ts`, `errorHandler.ts`, `rateLimiter.ts`, `validator.ts`.

## Frontend Layer Structure

**Pattern: Pages → Components + Hooks → API layer → Backend**

```
React Component (pages/*.tsx)
  → Custom Hook (hooks/use*.tsx)          [TanStack Query useQuery/useMutation]
    → API module (api/*.api.ts)           [axios via createApiClient()]
      → createApiClient() (lib/apiClient.ts) [CSRF interceptor]
        → Backend /api/* endpoints
```

- **Pages** are top-level route components, wrapped in `<AppShell>` (TopNav + BottomTabBar + GamificationMoments).
- **Components**: `components/ui/` (design primitives) and `components/` (page-level composites).
- **Hooks** wrap TanStack Query for each domain. `useAuth` uses React Context.
- **API modules** one per domain, each via `createApiClient()`. Parameter mapping happens here.
- **Utils** (`assignmentKey.ts`, `dateFormat.ts`, `a11y.ts`) are pure helpers.
- **Lib** (`apiClient.ts`, `csrf.ts`, `celebrate.ts`) are shared infrastructure.

## Data Flow (Request Lifecycle)

**Inbound:**
1. Client → axios (`withCredentials: true`)
2. `helmet()` → security headers
3. `cors()` → origin validation
4. `generalLimiter` → rate check (300 req/15min)
5. `express.json()` → body parse (10kb)
6. `cookie-parser` → cookie parse
7. `express-session` → session restore from `connect.sid`
8. `csrfProtection` → validate `x-xsrf-token` header
9. Route matching (`/api/*`)
10. Per-route: `authenticate` → `authorize` → `validate`
11. Service function → Prisma → SQLite
12. Response: `{ success, data, error }` envelope

**Outbound:**
- Consistent JSON envelope: `{ success: boolean, data: T | null, error: { message, code?, details? } | null }`
- `AppError` instances caught by `errorHandler` → appropriate status code
- Unknown errors → 500 "Internal server error"

## Key Abstractions

### Backend
- `AppError` class (`middleware/errorHandler.ts`) — typed HTTP errors with status code
- Prisma Client singleton (`config/prisma.ts`) — single export, imported everywhere
- Service modules — plain exported functions, no classes
- `BADGE_CATALOG` / `BADGE_RULES` — declarative badge definitions with evaluation functions
- `LEVEL_THRESHOLDS` array — level computation from lifetime points

### Frontend
- `AuthProvider` / `useAuth()` — React Context for authenticated user
- `ProtectedRoute` — guards routes by auth state + optional role
- `AppShell` — consistent page layout (TopNav + BottomTabBar + GamificationMoments)
- `createApiClient()` factory — ensures every API module gets CSRF interceptor (hard requirement)
- `celebrate()` / `GamificationMoments` — diff-based celebration system

## Entry Points

| Component | File |
|-----------|------|
| Backend HTTP server | `backend/src/server.ts` |
| Express app construction | `backend/src/app.ts` |
| React root | `frontend/src/main.tsx` |
| Route definitions | `frontend/src/App.tsx` |
| Docker Compose | `docker-compose.yml` |
| Backend Dockerfile | `backend/Dockerfile` |
| Frontend Dockerfile | `frontend/Dockerfile` |

## Module Graph

### Backend
```
server.ts → app.ts → routes/index.ts → routes/*.ts → services/*.ts → config/prisma.ts
                                            |              |
                                            |              +→ config/notifications.ts
                                            |              +→ services/notification.service.ts
                                            |              +→ services/gamification.service.ts
                                            |              +→ services/recurring.service.ts
                                            |
                                            +→ middleware/auth.ts, csrf.ts, validator.ts, rateLimiter.ts, errorHandler.ts
                                            +→ schemas/*.ts
```

### Frontend
```
main.tsx → App.tsx → pages/*.tsx → hooks/use*.tsx → api/*.api.ts → lib/apiClient.ts → lib/csrf.ts
                     → components/ProtectedRoute.tsx → hooks/useAuth.tsx
                     → components/AppShell.tsx → TopNav, BottomTabBar, GamificationMoments
```

## Auth/Authorization Flow

**Login:**
1. `POST /api/auth/login` → `authLimiter` → `bcrypt.compare` → `session.regenerate()` → set `userId`/`role`
2. Session cookie (`connect.sid`) returned

**Request auth:**
- `authenticate`: checks `req.session.userId` exists, validates user in DB
- `authorize(...roles)`: checks `req.session.role` against allowed roles

**Frontend auth:**
- `AuthProvider` queries `GET /api/auth/me` on mount (`staleTime: Infinity`)
- `ProtectedRoute` checks auth state: loading → spinner, 401 → redirect, role mismatch → 403

## Error Handling

**Backend:**
- Services throw `AppError` with status code
- Routes wrap in `try/catch`, call `next(err)`
- Global `errorHandler` → `{ success: false, data: null, error: { message } }`
- Prisma `P2025` (Record Not Found) → 404
- Notification failures caught internally, never propagate

**Frontend:**
- API modules return typed data; `auth.api.ts` catches 401 → `AuthError`
- Hooks expose `isLoading`, `error` from TanStack Query
- Pages render loading skeletons or error states with retry
- Mutation errors caught in page-level `try/catch`

## State Management

| Layer | Approach |
|-------|----------|
| Server state | TanStack Query v5 (query keys follow domain pattern) |
| Client state | React Context (`AuthContext`) + local `useState` |
| No Redux/Zustand | — |

**Cache invalidation:** Mutations invalidate related query keys on success. `AuthProvider.logout()` calls `queryClient.clear()`.
