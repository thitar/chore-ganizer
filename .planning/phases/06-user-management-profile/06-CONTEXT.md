# Phase 6: User Management + Profile - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Family member account management. Parents create and delete user accounts. Any authenticated user can change their own password and display color.

This phase delivers: UsersPage (parent creates/deletes family members), ProfilePage (self-service password + color change), backend UsersService (create, delete, update password/color with ownership), frontend API + hooks + 2 new pages, NavBar updates.

</domain>

<decisions>
## Implementation Decisions

### User Management (Parent-only)
- **D-01:** New `UsersService.create` — parents create new user accounts with `{ name, email, password, role, color }`. Email must be unique. Password min 6 chars. Role is PARENT or CHILD. Color is hex string (default from frontend).
- **D-02:** `UsersService.delete` — parent deletes a user. Cannot delete self. Cannot delete user with non-zero balance (or completed chores) — block with 409.
- **D-03:** `UsersService.getAll` — returns all users with name, role, color (existing endpoint already does this). Any authenticated user can list.
- **D-04:** Routes: `POST /api/users` (PARENT), `DELETE /api/users/:id` (PARENT).

### Profile (Self-service)
- **D-05:** `UsersService.updatePassword(userId, currentPassword, newPassword)` — verify current password first, then update. Min 6 chars. Logged-in user can only change own.
- **D-06:** `UsersService.updateColor(userId, color)` — change display color. Hex string format. Logged-in user can only change own.
- **D-07:** Routes: `PUT /api/users/me/password`, `PUT /api/users/me/color`. Any authenticated user. Ownership enforced in service.

### Validation
- **D-08:** Email format validated via Zod.
- **D-09:** Password strength: minimum 6 characters, no other requirements (family-scale).
- **D-10:** Color format: hex string `#RRGGBB` (validated via regex).
- **D-11:** Self-delete protection: parent cannot delete their own user (would leave the app in a weird state).

### Frontend
- **D-12:** New `UsersPage` at `/users` (parent-only). Lists all family members with: name, email, role badge, color swatch, delete button.
- **D-13:** Create user form on UsersPage: name, email, password, role select, color picker.
- **D-14:** New `ProfilePage` at `/profile` (any authenticated user). Shows current user info. Has password change form and color picker.
- **D-15:** NavBar adds "Profile" link (all roles) and "Users" link (parent only).
- **D-16:** Follow Phase 3 patterns: card + table layout, loading/error/empty states.

### Existing Code Dependencies
- **D-17:** `User` model from Phase 1 — name, email, password (bcrypt), role, color, createdAt, updatedAt.
- **D-18:** Bcrypt already in dependencies (Phase 2 auth).
- **D-19:** `GET /api/users` exists from Phase 2 — list all family members.

### the agent's Discretion
- Color picker UI (input type=color vs custom palette)
- Self-delete error message copy
- User creation form validation feedback (inline vs submit-time)
- Whether to show "created by" or "joined at" timestamps in user list
- Password show/hide toggle in form

</decisions>

<canonical_refs>
## Canonical References

### Design Contracts
- `06-UI-SPEC.md` — UI design contract for UsersPage and ProfilePage

### Project References
- `.planning/ROADMAP.md` §Phase 6 — User Management + Profile goal, success criteria
- `.planning/REQUIREMENTS.md` — AUTH-03..06 requirements
- `.planning/PROJECT.md` — Key Decisions table

### Codebase
- `backend-v2/src/services/template.service.ts` — Reference service patterns
- `backend-v2/src/routes/templates.routes.ts` — Reference route patterns
- `backend-v2/src/routes/users.routes.ts` — Existing user routes (Phase 2)
- `backend-v2/src/services/auth.service.ts` — Reference password hashing
- `frontend-v2/src/api/templates.api.ts` — Reference API layer
- `frontend-v2/src/pages/TemplatesPage.tsx` — Reference parent-only page
- `frontend-v2/src/components/NavBar.tsx` — Current nav structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **useUsers** (Phase 2) — fetches family members list
- **useAuth** (Phase 2) — current user info + login/logout
- **TemplatesPage** — reference for parent-only pages with create form
- **FormCard pattern** — card + form + table layout

### Established Patterns
- Backend: `router → controller → service → Prisma` with Zod validation
- Frontend: `api/*.api.ts → hooks/*.tsx → pages/*.tsx`
- AppError class for known errors
- Bcrypt for passwords

### Integration Points
- **NavBar.tsx** — Add 2 new links
- **App.tsx** — Add 2 new routes
- **routes/index.ts** — Mount user routes (extend existing)
- **routes/users.routes.ts** — Add POST + DELETE + PUT endpoints
- **prisma/seed.ts** — No changes (4 users already seeded)

</code_context>

<specifics>
## Specific Ideas

- UsersPage table columns: Name, Email, Role, Color (swatch), Actions
- ProfilePage: 2 cards side-by-side (password + color) on desktop, stacked on mobile
- Color picker uses native `<input type="color">` for simplicity
- Self-delete protection: button hidden for current user, or shows "Cannot delete yourself" tooltip
- Create user form: name, email, password (min 6), role (PARENT/CHILD), color
- Use existing useUsers hook for UsersPage list

</specifics>

<deferred>
## Deferred Ideas

- **Avatar/profile picture** — out of scope, use color only
- **User edit** (change name, email) — out of scope, only create/delete
- **Bulk import** — out of scope
- **Email verification** — out of scope (private network)
- **Password reset via email** — out of scope
- **2FA** — out of scope
- **Audit log** of who created/deleted whom — out of scope
- **Account lockout** after failed logins — out of scope

</deferred>

---

*Phase: 06-user-management-profile*
*Context gathered: 2026-06-28*
