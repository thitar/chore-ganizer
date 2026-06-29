# Phase 5: Points + Calendar - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Full-stack points tracking and family calendar. Users see their point balance and chronological log. Parents can manually add or deduct points with a reason. Calendar page shows all family assignments by date, color-coded by user.

This phase delivers: PointsPage (balance + log + parent adjust form), CalendarPage (monthly grid with user colors), backend PointsService (sum from PointLog, create manual adjustments), backend CalendarService (query assignments + occurrences by date range), frontend API + hooks for both, NavBar updates.

</domain>

<decisions>
## Implementation Decisions

### Points System
- **D-01:** Balance = `SUM(PointLog.amount WHERE userId = X)` — calculated on read, not stored. Existing PointLog model from Phase 3 already supports this.
- **D-02:** New PointLog types beyond Phase 3's EARNED + REVERSED: `BONUS` (parent reward), `DEDUCTION` (parent manual removal), `PENALTY` (parent discipline), `ADJUSTMENT` (manual correction), `PAYOUT` (cash out — out of scope Phase 5), `ADVANCE` (pre-earned — out of scope Phase 5).
- **D-03:** Parent adjust endpoint: `POST /api/points/adjust` with body `{ userId, amount, reason }`. Amount can be positive (add) or negative (deduct). Reason required (1-200 chars). Creates PointLog with type `ADJUSTMENT`.
- **D-04:** `GET /api/points/me` returns `{ user, balance, logs[] }` for the authenticated user. Logs sorted by createdAt desc, limit 100 (paginate later if needed).
- **D-05:** `GET /api/points/users/:userId` for parent to view any family member's points. Child gets 403 if accessing another user's points.
- **D-06:** Role gates: `POST /api/points/adjust` requires PARENT. `GET /api/points/me` and `/users/:userId` (with ownership check) requires authentication.

### Calendar
- **D-07:** Reuse `GET /api/assignments` (with type discriminator) for calendar data. No new calendar-specific endpoint — frontend queries /api/assignments for the current month window.
- **D-08:** CalendarPage queries assignments for the displayed month, color-codes by assignedTo.color. Recurring occurrences already merged in by Phase 4.
- **D-09:** Month navigation: prev/next chevron buttons. Each click re-fetches. Default: current month.
- **D-10:** Empty days: no pills. Empty month: "No chores scheduled for {month}." text inside grid.
- **D-11:** Today highlight: `bg-primary-light` background on the day cell.
- **D-12:** Color rendering: pill background = `assignedTo.color + '20'` (12% alpha), text = full color. Legend below grid shows color swatches per user.

### Frontend
- **D-13:** New `PointsPage` at `/points`, any authenticated user. Shows own balance + log.
- **D-14:** New `CalendarPage` at `/calendar`, any authenticated user. Shows full family calendar (parents) or all visible (children).
- **D-15:** NavBar adds "Points" (all roles) and "Calendar" (all roles) — accessible to children.
- **D-16:** Type badge colors per type (EARNED green, BONUS blue, DEDUCTION red, PENALTY red, REVERSED gray, ADJUSTMENT purple). Reuse the existing StatusBadge component pattern.
- **D-17:** Follow Phase 3 patterns: card + table layout, loading spinner, error retry, success toast.

### Seed Data
- **D-18:** Existing seed has 2 PointLog entries (EARNED). Add 1-2 more for testing: BONUS for Alice ("Great week!"), ADJUSTMENT for Bob ("Snack correction").

### Existing Code Dependencies
- **D-19:** PointLog model from Phase 3 — schema already supports EARNED + REVERSED. Phase 5 adds more types but doesn't need schema changes (type is a free string).
- **D-20:** Reuse `GET /api/assignments` response shape from Phase 4 (with `type` discriminator).
- **D-21:** Auth middleware, session, role checks from Phases 2-3.

### the agent's Discretion
- Exact log pagination size (100 default, can adjust)
- Calendar grid styling (6×7 vs 5×7 with overflow)
- Empty month copy
- "Adjust" form validation (min/max amount, reason length)
- Color rendering implementation (Tailwind arbitrary values vs inline style)
- Whether to add a Dashboard widget showing today's points earned

</decisions>

<canonical_refs>
## Canonical References

### Design Contracts
- `05-UI-SPEC.md` — UI design contract for PointsPage and CalendarPage

### Project References
- `.planning/ROADMAP.md` §Phase 5 — Points + Calendar goal, success criteria, requirements
- `.planning/REQUIREMENTS.md` — PTS-01..04, CAL-01..03 requirements
- `.planning/PROJECT.md` — Key Decisions table

### Codebase
- `backend-v2/prisma/schema.prisma` — PointLog model (existing)
- `backend-v2/src/services/assignment.service.ts` — Reference service (merged in Phase 4)
- `backend-v2/src/services/recurring.service.ts` — Reference for transaction patterns
- `backend-v2/src/services/template.service.ts` — Reference service patterns
- `frontend-v2/src/api/recurring.api.ts` — Reference API layer
- `frontend-v2/src/hooks/useRecurringChores.tsx` — Reference hook
- `frontend-v2/src/pages/RecurringChoresPage.tsx` — Reference page

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **StatusBadge** — Phase 3 component, can be extended with new type→color mappings
- **PointLog** — Phase 3 model, no schema changes needed
- **AppError class** — Phase 2 error handling with statusCode
- **ProtectedRoute** — Phase 2 role-based routing
- **Auth middleware** — Phase 2 with `authenticate` and `authorize` helpers
- **Frontend API pattern** — Axios instance + named exports per resource
- **React Query hooks** — Established `useQuery` + `useMutation` pattern with cache invalidation

### Established Patterns
- Backend: `router → controller → service → Prisma` with Zod validation
- Frontend: `api/*.api.ts → hooks/*.tsx → pages/*.tsx`
- 401 auto-logout via `auth:unauthorized` event
- AppError: `{ statusCode, code, message }` shape
- Response envelope: `{ success: true, data, error: null }`

### Integration Points
- **NavBar.tsx** — Add 2 new links (Points, Calendar)
- **App.tsx** — Add 2 new routes
- **routes/index.ts** — Mount 2 new routers (points, calendar — or reuse assignments)
- **prisma/seed.ts** — Add 1-2 seed PointLog entries
- **schema.prisma** — No changes (PointLog.type is free string)

</code_context>

<specifics>
## Specific Ideas

- PointLog `type` field is a free string, not enum — Phase 5 adds more types without migration
- Calendar's "today" highlight uses `bg-primary-light` per Phase 3 conventions
- Adjust form requires positive integer for amount, reason text 1-200 chars
- Balance format: "{n} pts" — no currency, no decimals
- Calendar grid: 7 columns (Sun-Sat) × 6 rows max (handles month boundary weeks)
- Date format in log: "Jun 28, 2026" (matches Phase 3 MyChoresPage format)
- Calendar fetches assignments for first-of-month to last-of-month range
- "Today" indicator: same color as the day cell's primary-light, with a small "Today" label

</specifics>

<deferred>
## Deferred Ideas

- **Pagination** for points log (>100 entries) — out of scope, use "load more" later
- **PAYOUT type** (cash out) — Phase 5 mentions in copy but not implemented
- **ADVANCE type** (pre-earned) — out of scope Phase 5
- **Point goals/targets** (e.g., "Alice needs 100 more pts for X") — out of scope
- **Leaderboard** (ranking family members) — out of scope, calendar shows everyone's chores
- **Notifications when balance changes** — out of scope
- **Adjustments history audit** (who made this adjustment) — defer to Phase 5+ or admin phase
- **Bulk adjustments** (apply to all children) — out of scope
- **Point decay / expiration** — out of scope
- **Calendar export to iCal/Google** — out of scope
- **Week view / day view** of calendar — month view only in Phase 5
- **Recurring chore visualization on calendar** — occurrences appear as pills, same as regular assignments

</deferred>

---

*Phase: 05-points-calendar*
*Context gathered: 2026-06-28*
