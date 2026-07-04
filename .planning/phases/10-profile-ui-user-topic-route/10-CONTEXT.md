# Phase 10: Profile UI + User topic route - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Any user can set, change, or clear their ntfy topic from the Profile page. Parents can also view and edit their children's topics. The Profile page gains a "Push Notifications" section with topic input, "Generate random topic" button, and save functionality via `PUT /api/users/me/ntfy-topic`.

**Requirements addressed:** NOTIFY-01 (User can set their own ntfy topic in the Profile page; topic must be 12-64 chars `[A-Za-z0-9_-]` and unique across users)

</domain>

<decisions>
## Implementation Decisions

### Random topic generation
- **D-01:** Generated topic format: `chore-{username}-{6chars}` (e.g., `chore-alice-a1b2c3`). Matches ROADMAP example.
- **D-02:** Random suffix uses alphanumeric lowercase (a-z, 0-9) — 36 chars, easy to read aloud.
- **D-03:** Generation triggered by button click ("Generate random topic"), not auto-generated on page load.
- **D-04:** No frontend uniqueness check — generate freely, let backend return 409 Conflict if topic is already taken.

### Parent access to children's topics
- **D-05:** Parents see all family members' topics on the Profile page (not just their own).
- **D-06:** Family topics displayed as cards — one card per user with topic display and Edit button.
- **D-07:** Edit flow is inline — clicking Edit reveals topic input in the card with Save/Cancel buttons.
- **D-08:** "Generate random topic" button available when editing a child's topic (same as for own topic).

### Profile page layout
- **D-09:** Notifications section placed after Display Color (User info → Change Password → Display Color → Push Notifications).
- **D-10:** Section title: "Push Notifications" with brief help text: "Set your ntfy topic to receive push notifications when chores are assigned or due."

### Empty state and feedback
- **D-11:** Empty state shows helper message "Topic required for notifications" with a "Generate random topic" button.
- **D-12:** Success feedback: green toast notification "Topic saved!" that disappears after 3 seconds (matches existing color/password pattern).
- **D-13:** 409 Conflict error message: "This topic is already in use. Please choose another."

### the agent's Discretion
- **Route location:** Add `PUT /me/ntfy-topic` to existing `backend/src/routes/users.routes.ts` (follows pattern of `PUT /me/password` and `PUT /me/color`).
- **Service function:** Add `updateNtfyTopic` to `backend/src/services/users.service.ts` (follows `updateColor` pattern).
- **Parent-only section:** "Family Topics" cards only visible to users with `role: PARENT` (check `user.role` in ProfilePage component).
- **API response:** Return updated user object with `ntfyTopic` field on success.
- **Query invalidation:** After saving, invalidate `['users']` and `['auth', 'me']` queries (matches `updateColor` pattern).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` §"Notifications (ntfy.sh)" — NOTIFY-01 (12-64 char topic regex, unique across users)
- `.planning/ROADMAP.md` §"Phase 10: Profile UI + User topic route" — success criteria 1-5 (UI requirements, 409 handling, empty state)
- `.planning/PROJECT.md` §"Active (v3.1 — Notifications)" — high-level product framing

### Existing code to mirror
- `backend/src/routes/users.routes.ts` — `PUT /me/password` and `PUT /me/color` routes (pattern for `PUT /me/ntfy-topic`)
- `backend/src/services/users.service.ts` — `updateColor` function (closest analog for `updateNtfyTopic`)
- `backend/src/__tests__/services/users.service.test.ts` — test pattern for user service functions
- `frontend/src/pages/ProfilePage.tsx` — current Profile page structure (User info → Change Password → Display Color)
- `frontend/src/api/users.api.ts` — API client for user operations (add `updateNtfyTopic` function)
- `frontend/src/hooks/useUsers.tsx` — user data hook (for family topics query)

### Locked decisions from prior phases
- `.planning/phases/09-foundation/09-CONTEXT.md` — notification service surface, file layout, wrapper signatures, test mocking
- `.planning/STATE.md` §"Accumulated Context > Decisions" — native fetch, fire-and-forget, User.ntfyTopic @unique, dueNotifiedAt, topic regex, relative Click path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/src/pages/ProfilePage.tsx:8-169`** — Complete Profile page with password and color forms. Phase 10 adds a third section after Display Color.
- **`backend/src/services/users.service.ts:110-119`** — `updateColor` function validates hex and updates user. `updateNtfyTopic` follows same pattern with Zod validation.
- **`frontend/src/api/users.api.ts`** — API client with `updatePassword` and `updateColor`. Add `updateNtfyTopic` function.
- **`backend/src/routes/users.routes.ts:37-57`** — `PUT /me/password` and `PUT /me/color` routes. `PUT /me/ntfy-topic` follows same pattern.

### Established Patterns
- **Service pattern:** Flat file of named exports, throws `AppError` for expected errors, returns plain objects.
- **Route pattern:** `router.put('/me/{field}', authenticate, async (req, res, next) => { ... })` with try/catch and `next(error)`.
- **Test pattern:** Mock Prisma via `jest.mock('../../config/prisma', ...)`, test service functions directly.
- **Frontend pattern:** React Query for data fetching, `queryClient.invalidateQueries()` after mutations, toast notifications for success.

### Integration Points
- **`backend/src/routes/users.routes.ts`** — Add new route `PUT /me/ntfy-topic`.
- **`backend/src/services/users.service.ts`** — Add `updateNtfyTopic` function.
- **`frontend/src/pages/ProfilePage.tsx`** — Add "Push Notifications" section after Display Color.
- **`frontend/src/api/users.api.ts`** — Add `updateNtfyTopic` function.
- **`backend/prisma/schema.prisma`** — `User.ntfyTopic` field already exists from Phase 9.

</code_context>

<specifics>
## Specific Ideas

- **Topic is an access token** — 12-char minimum because the topic string itself is the access token for receiving notifications. Users who set weak topics (e.g., "alice") could be impersonated.
- **Parent card layout** — Each family member gets a card showing their name, current topic (or "Not set"), and Edit button. Cards are visually distinct from the user's own topic section.
- **Inline edit flow** — Click Edit → topic input appears in the card with Save/Cancel buttons. No modal overhead.
- **Toast matches existing pattern** — Green toast "Topic saved!" disappears after 3 seconds, same as color/password success messages.
- **Empty state is explicit** — "Topic required for notifications" message makes it clear this is needed for push notifications to work.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-Profile UI + User topic route*
*Context gathered: 2026-06-29*
