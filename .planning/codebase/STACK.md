# Technology Stack

**Analysis Date:** 2026-07-04

## Languages

**Primary:**
- TypeScript 5.3.3 - Used for both backend and frontend logic.

## Runtime

**Environment:**
- Node.js >=18.0.0

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (implied by monorepo)

## Frameworks

**Core:**
- Express.js 4.18.2 - Backend API server.
- React 18.2.0 - Frontend UI.
- Vite 6.2.0 - Frontend build tool and dev server.

**Testing:**
- Jest 30.0.0 - Backend testing.
- Vitest 4.1.0 - Frontend testing.
- Playwright 1.50.1 - E2E testing.

**Build/Dev:**
- TypeScript - Type checking and compilation.
- Tailwind CSS 3.4.0 - Styling.
- Prisma 5.7.1 - ORM for database.

## Key Dependencies

**Critical:**
- @prisma/client 5.22.0 - Database interaction.
- Zod 4.4.3 - Validation schema definition.
- Axios 1.13.6 - Frontend API requests.
- @tanstack/react-query 5.95.2 - Frontend data fetching and caching.

**Infrastructure:**
- express-session - Session management.
- bcrypt - Password hashing.
- helmet - Express security.
- express-rate-limit - Rate limiting for API protection.

## Configuration

**Environment:**
- Configured via `.env` files (e.g., `.env`, `.env.example`).
- Key configs: `SESSION_SECRET`, `APP_VERSION`, `VITE_API_URL`, `BACKEND_PORT`, `DATABASE_URL`.

**Build:**
- `tsconfig.json` (root, backend, frontend).
- `vite.config.ts` (implied for frontend).
- `prisma/schema.prisma` (DB schema).

## Platform Requirements

**Development:**
- Node.js 18+

**Production:**
- Docker / Docker Compose.

---

*Stack analysis: 2026-07-04*
