# Frontend Redesign — Dark + Gamified

**Date:** 2026-07-04
**Status:** Approved direction (Approach A: visual redesign first, gamification backend second)

## Problem

The current frontend is a generic admin-dashboard look (gray background, white cards, indigo buttons, table layouts). The target users — two teenagers (15 and 18) — find it bland and are unlikely to use it voluntarily.

## Decisions Made (brainstorming with user)

| Question | Decision |
|---|---|
| Vibe | Dark, mature aesthetic (Spotify/Discord-like) + gamification layer |
| Gamification depth | Full: frontend celebrations/progress AND backend streaks, levels, badges |
| Page scope | All pages (kid-facing and parent admin) |
| Devices | Mixed phone/desktop — responsive, bottom tabs on mobile |
| Theme | Dark-only, no light theme |
| Structure | **Two milestones**: M1 "The Look", M2 "The Game" |

## Non-Goals

- Light theme / theme toggle
- Sound effects
- Avatar image uploads (initials + user color only)
- PWA / offline support
- Round-robin, pocket-money payout scheduling (out of rewrite scope per project decisions)

---

## Design System (Milestone 1)

### Palette (Tailwind theme tokens)

- **Background:** `#09090B` (zinc-950); page gradient accents allowed on hero areas
- **Surface (cards):** `#18181B` (zinc-900) with `1px` border `#27272A` (zinc-800)
- **Surface raised (modals, popovers):** `#27272A`
- **Text:** primary `zinc-100`, secondary `zinc-400`, disabled `zinc-600`
- **Accent:** violet→indigo gradient (`#8B5CF6` → `#6366F1`); solid accent `#8B5CF6`; subtle glow shadow on primary buttons and the balance card
- **Semantic:** success `emerald-400`, danger `rose-400`, warning `amber-400`, info `sky-400` (with `-500/10` backgrounds for badges on dark)
- **Per-user color:** existing `user.color` field drives avatars, leaderboard rows, calendar dots

All tokens defined in `tailwind.config.js` under `theme.extend.colors` with semantic names (`bg`, `surface`, `accent`, etc.) so pages never hardcode zinc values.

### Typography

- Body: **Inter** (already used) — self-hosted via `@fontsource/inter` (private network; no CDN fonts)
- Display (headings, big numbers): **Space Grotesk** via `@fontsource/space-grotesk`, exposed as `font-display`

### Shape & Motion

- Cards `rounded-2xl`, buttons/inputs `rounded-xl`
- Transitions 150–200ms ease-out on hover/press; buttons scale `active:scale-[0.98]`
- Number count-up animation for points balances
- Confetti burst on chore completion (`canvas-confetti`)
- **`prefers-reduced-motion` disables confetti and count-up** (instant values)
- Loading states: skeleton shimmer blocks instead of spinners

### New Dependencies (frontend)

- `canvas-confetti` (+ `@types/canvas-confetti`)
- `@fontsource/inter`, `@fontsource/space-grotesk`

No framer-motion — CSS keyframes/transitions suffice; keeps the bundle small.

---

## Navigation (Milestone 1)

**Desktop (md+):** top nav bar, translucent dark with backdrop blur. Links: Dashboard, My Chores, Points, Calendar. Parent-only links (Templates, Recurring, Assignments, Users) collapse into a **"Manage" dropdown** to cut clutter (currently 8 flat links). Right side: avatar chip (initials on user color) linking to Profile, logout icon-button.

**Mobile (below md):** fixed **bottom tab bar** with 5 tabs: Home, Chores, Points, Calendar, Profile. For parents, a 6th "Manage" tab opens a sheet listing the four admin pages. Hamburger menu is removed. Pages get bottom padding so content clears the tab bar.

---

## Shared Components (Milestone 1)

New in `frontend/src/components/`:

- `Button` — variants: `primary` (gradient), `secondary` (outlined ghost), `danger`; sizes; loading state
- `Card` — surface + border + padding wrapper
- `Avatar` — initials on `user.color` disc, sizes sm/md/lg
- `ProgressRing` — SVG ring, animated stroke, used for weekly progress
- `CountUp` — animates a number from previous→new value; instant under reduced motion
- `Celebration` — fires confetti + floating "+N pts" text; called after completion
- `Toast` — restyled dark success/error toasts (existing fixed-position pattern, unified)
- `EmptyState` — icon + headline + hint, consistent across pages
- `BottomTabBar`, `TopNav` (replace current `NavBar`), `PageHeader`
- `StatCard` — labeled big-number card (dashboard, points hero)

Restyled: `StatusBadge`, `FilterBar`, `ConfirmDelete`.

**Convention:** pages compose these components; no page defines its own button/card styles inline anymore.

---

## Pages (Milestone 1)

- **Login:** centered card on dark backdrop with subtle radial accent glow; wordmark; large friendly inputs.
- **Dashboard:** greeting with avatar ("Hey Alice 👋"); row of stat cards — points balance (CountUp), **weekly progress ring** ("4 of 6 done this week", computed client-side from assignments due this week), chores due today; upcoming chores as cards; **mini leaderboard** (top 3, from new endpoint).
- **My Chores:** mobile = stacked cards (title, category chip, due chip, points, big Complete button); desktop = comfortable rows. Completing fires `Celebration` + toast. Overdue = rose accent border/chip. Completed items get a subdued/checked style.
- **Points:** hero balance card (gradient, glow, CountUp); **family leaderboard** with rank, avatar, name, balance (per-user colors); history list restyled with type chips; parent adjust form in a `Card` (function unchanged).
- **Calendar:** dark restyle; occurrence dots/chips use assignee `user.color`; today highlighted with accent ring.
- **Profile:** avatar preview, color picker, password change, ntfy topic section — all in dark cards.
- **Parent pages (Templates, Recurring, Assignments, Users):** restyle with shared components, denser layouts acceptable; no functional changes.

---

## Backend Change in Milestone 1 (the only one)

`GET /api/points/leaderboard` — authenticated (any role) → `[{ user: {id, name, color, role}, balance }]` sorted desc. Children currently may only read their own balance via `/users/:id`; the leaderboard is intentionally family-visible. Implemented in `points.service` + route + Zod-free (no input); unit tests.

---

## Milestone 2 — "The Game" (outline, planned in detail after M1 ships)

**Prerequisite:** fix duplicate `dueNotifiedAt` field declarations in `ChoreAssignment` and `RecurringOccurrence` (schema currently fails `prisma validate`; flagged as separate task).

- **Weekly streaks:** streak = consecutive weeks in which the user completed **all** chores due that week (on-time completion). Computed **lazily on read** (fits the "no cron" project decision) from assignment/occurrence history; cached on `User` (`streakCount`, `streakComputedAt`) to avoid rescanning.
- **Levels:** derived from lifetime positive `EARNED`+`BONUS` points — pure computation over `PointLog`, thresholds defined in code (no schema change). Level shown as bar on Points/Profile; level-up modal.
- **Badges:** catalog defined in code; new `UserBadge` table (`userId`, `badgeId`, `earnedAt`). Awarded lazily on completion and on streak evaluation. Starter set: First Chore, 10 Chores, 50 Chores, 100 Points, 500 Points, 4-Week Streak, Early Bird, Weekend Warrior. Badge grid on Profile; ntfy notification on award (reuses `notification.service`).
- **UI:** streak flame on Dashboard, level progress bar, badge showcase, level-up/badge-earned moments.

---

## Testing & Accessibility

- Existing page tests updated alongside restyles — keep accessible names/roles stable (buttons keep their labels) so most assertions survive; NavBar test replaced by TopNav/BottomTabBar tests.
- New unit tests: ProgressRing, CountUp (reduced-motion path), leaderboard endpoint (backend), leaderboard component.
- Contrast: all text/surface combos meet WCAG AA on dark; semantic colors use `-400` variants for text on dark.
- Touch targets stay ≥44px (existing convention).
- E2E: existing Playwright specs re-run; selectors reviewed after nav change.

## Rollout

- M1 on a feature branch, verified with `npm test` (frontend+backend), E2E, and manual pass on phone-sized viewport; then version bump + Docker build per project version-management workflow.
- M2 planned via its own spec/plan after M1 feedback from the kids.
