# Coding Conventions

**Analysis Date: 2026-07-04**

## Naming Patterns

**Files:**
- Use camelCase for filenames (e.g., `assignments.test.ts`, `app.ts`).
- React components use PascalCase (e.g., `DashboardPage.tsx`).

**Functions:**
- Use camelCase for function names and variable names.

**Variables:**
- Use camelCase.

**Types:**
- Use PascalCase for TypeScript interfaces and types.

## Code Style

**Formatting:**
- No automated formatting tool detected.

**Linting:**
- No linting tools detected.

## Import Organization

**Order:**
1. External libraries (e.g., `express`, `react-router-dom`)
2. Internal modules (e.g., `./routes/index`, `../app`)

**Path Aliases:**
- None detected.

## Error Handling

**Patterns:**
- Backend uses `AppError` class (implied by `errorHandler.ts`) with `statusCode` and `code` fields.
- Global error handler `backend/src/middleware/errorHandler.ts` catches and formats errors as `{"success": false, "error": { ... }}`.

## Logging

**Framework:** `console`.

## Comments

**When to Comment:**
- Minimal commenting observed.

**JSDoc/TSDoc:**
- Used for API documentation in some places (e.g., `@swagger` tags in controllers — although no Swagger doc generation is currently configured as per `AGENTS.md`).

## Function Design

**Size:**
- Aim for small, focused functions, especially in services (`backend/src/services/`).

**Parameters:**
- Zod schemas are used for validation (`backend/src/schemas/`) and middleware (`backend/src/middleware/validator.ts`).

---

*Convention analysis: 2026-07-04*
