# Manual UAT Checklist

Click-through verification for a running Chore-Ganizer instance. Each item is a concrete action and its expected result — check items off as you go.

> **Automated:** every item is covered by the Playwright suite `e2e/uat-checklist.spec.ts` (Section 7 as real ntfy push tests). Last full run **2026-07-12: 54/54 PASS**. See [UAT-RESULTS.md](./UAT-RESULTS.md) for the per-item log and the infra steps needed for a clean re-run.

**Before you start:** bring the app up via `docker compose up --build -d` (see [OPERATIONS.md](./OPERATIONS.md#starting-the-app)) against a throwaway/dev database, never production data. The `--build` flag matters here — plain `docker compose up -d` only builds an image if one doesn't already exist for that service; if you've built before, it silently reuses the old image instead of picking up the code you're actually trying to verify. Seeded accounts (verify against `backend/prisma/seed.ts` if these have changed):

| Role | Email | Password |
|---|---|---|
| Parent | dad@home.local | password123 |
| Parent | mom@home.local | password123 |
| Child | alice@home.local | password123 |
| Child | bob@home.local | password123 |

---

## 1. Auth

- [x] Log in as a parent (dad@home.local) → lands on the dashboard, shows "Hey Dad 👋"
- [x] Log out → redirected to `/login`
- [x] Log in as a child (alice@home.local) → lands on the dashboard
- [x] Refresh the page while logged in → session persists, still logged in (no redirect to login)
- [x] While logged in as Alice (child), manually navigate to `/users` → see an explicit **403 Forbidden** page, not a silent redirect to the dashboard
- [x] Same check for `/templates`, `/recurring-chores`, `/assignments` as a child

## 2. Chores (child)

- [x] Log in as Alice → `/my-chores` shows her assigned chores
- [x] Click **Mark Complete** on a pending chore → row updates to show **Completed**, and her points balance (visible on `/points`) increases by that chore's point value

## 3. Chores (parent)

- [x] Log in as Dad → Manage → **Templates** → create a new chore template (title, points, category)
- [x] Manage → **Assignments** → assign the new template to a child for a specific date
- [x] Edit an existing assignment (change assignee or due date) → change is reflected on refresh
- [x] Delete a non-completed assignment → removed from the list
- [x] Attempt to delete a **completed** assignment → blocked with a clear message (uncomplete it first)
- [x] As a parent, complete a chore on behalf of a child, then uncomplete it → status and points reverse correctly

## 4. Recurring chores

- [x] Manage → **Recurring** → create a daily recurring chore assigned to a child
- [x] Create a weekly recurring chore (specific day of week)
- [x] Create a monthly recurring chore (specific day of month)
- [x] Verify occurrences appear on `/my-chores` for the assigned child and on `/calendar`
- [x] Complete an occurrence → points awarded, occurrence shows Completed
- [x] Delete the recurring chore → future pending occurrences disappear, but **already-completed occurrences remain visible** (history preserved)

## 5. Points

- [x] `/points` as a child shows current balance and a log of past entries (EARNED/BONUS/ADJUSTMENT/etc.)
- [x] As a parent, use **Adjust Points** to give a child a positive amount with a reason → balance increases, new log entry appears
- [x] Adjust with a negative amount → balance decreases, shown in red; positive entries shown in green
- [x] As a child, confirm the **Adjust Points** form is **not** visible (parent-only)
- [x] Leaderboard (visible on Dashboard and Points page) updates to reflect the new balances
- [x] Log in as Alice (child) and confirm she can also see the leaderboard with everyone's balances — this is deliberate (family-visible, not parent-only), not a bug to report

## 6. Gamification

- [x] Complete enough chores/occurrences to cross a badge threshold (e.g. first chore, 10 chores, 100 lifetime points) → a celebration toast (with confetti) fires
- [x] Profile page's badge grid shows the newly earned badge in its "earned" state, others remain "locked" (grayed out)
- [x] Complete chores across consecutive weeks → the streak stat on the dashboard increments (weekly, lazily computed — check after a completion, not necessarily instantly)
- [x] Level bar on `/points` progresses as lifetime points increase, and shows "Max level" once the highest threshold is reached

## 7. Notifications

**Skip this section entirely if `NTFY_BASE_URL` isn't configured in your `.env`.**

- [x] Set an ntfy topic on your profile (Push Notifications section)
- [x] Have a parent assign you a new chore → a push notification arrives on the subscribed ntfy topic
- [x] Earn a badge → a badge-earned push notification arrives
- [x] A chore due today, not yet completed → a due-soon push notification arrives (may take a page load to trigger, since due-soon checks are lazy, not cron-scheduled)

## 8. Profile / family management (parent)

- [x] Manage → **Users** → see all family members listed
- [x] Create a new family member (name, email, password, role)
- [x] Set/change a family member's ntfy topic from their card
- [x] Try to set two family members to the **same** ntfy topic → the second save is rejected with a clear "already in use" conflict message
- [x] Delete a family member with no chore history → removed cleanly
- [x] Attempt to delete a family member **with** chore assignment history → rejected with a clear message (not a generic server error)

## 9. Mobile viewport

Resize the browser (or use device emulation) to ~390px width.

- [x] Dashboard renders without horizontal overflow or clipped content
- [x] Points page renders correctly at mobile width
- [x] Profile page renders correctly at mobile width
- [x] Bottom tab bar (Home/Chores/Points/Calendar/Profile) is visible and each tab navigates correctly
- [x] As a parent, the bottom tab bar's **Manage** button opens a sheet with Templates/Recurring/Assignments/Users links

## 10. Calendar

- [x] `/calendar` shows the current month with day-of-week labels
- [x] Click **Next month** / **Previous month** → the displayed month changes and the assignments shown update to match (not the same data repeated)
- [x] Click **Today** → returns to the current month
- [x] Legend shows each family member's name with their assigned color
- [x] Days with scheduled chores show colored pills with the chore's title
- [x] Change a family member's profile color, then return to the calendar via in-app navigation (not a hard refresh) → the legend and pills reflect the new color without needing a manual reload
