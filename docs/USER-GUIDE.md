# User Guide

How to use Chore-Ganizer. Reflects the actual pages in `frontend/src/pages/` as of v3.2.0 — see [ARCHITECTURE.md](./ARCHITECTURE.md) for how these map to the backend.

## Logging in

1. Navigate to the app URL, enter your email and password, sign in.
2. Accounts are created by a parent (there's no self-service signup or password reset UI — see "Current limitations" below).

## Dashboard

Shows your personal chore activity: pending chores, completed chores, current points, and recent activity. Each family member sees only their own data here. Parents also see a family leaderboard.

## Chores

- **My Chores** — chores assigned to you. Click **Complete** to mark one done; points are added automatically.
- **Assignments** (parents) — create a chore assignment by picking a template, an assignee, and a due date. Parents can also record a **partial completion** with custom (reduced) points and a note.
- **Templates** (parents) — create/edit reusable chore definitions: title, description, point value, optional icon/color.

## Recurring Chores

Parents can set up a recurring chore with a schedule (`frequency` + `dayOfWeek`/`dayOfMonth`). Occurrences are generated lazily when needed, not by a cron job. **Only fixed-user assignment is implemented** — the same person is assigned every occurrence; round-robin/mixed rotation is not built (see [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md)). Editing a recurring chore in place isn't supported yet — delete and recreate it instead.

## Calendar

Shows chore assignments across the family in a monthly view. Each family member has an assigned color, applied consistently across the calendar and member lists.

## Points & Gamification

- **Points** page shows your point log (`EARNED` from completed chores, `BONUS`/`DEDUCTION` from parent adjustments) and your lifetime total.
- **Levels** are computed from lifetime `EARNED`+`BONUS` points across 10 thresholds.
- **Weekly streaks** are tracked and shown on your profile/dashboard.
- **Badges** are awarded automatically from an 8-badge catalog on qualifying chore completions, with a toast + confetti moment.
- **Leaderboard** ranks all family members by points, visible to everyone (not parent-only).

There is no pocket-money/currency conversion, no rewards catalog, and no point-redemption flow — points are for the leaderboard/levels/badges only.

## Push Notifications (ntfy)

On your **Profile** page you can set (or generate) a personal ntfy topic. Once set, you'll get a push notification when a chore is assigned to you (and parents get one when a chore is completed), via the ntfy server the deployment points at. See [NTFY-SETUP-GUIDE.md](./NTFY-SETUP-GUIDE.md) to actually receive them on a device. There's no email channel, no in-app notification center, and no per-event toggle — it's on or off per user, all-or-nothing.

## Family Members (parents only)

Lists all users with role, points, color, and account status. Click through to view an individual profile.

## Signing out

Click **Logout** in the nav. This destroys your session server-side — don't do this if you're sharing a browser session with a test/automation flow still relying on it (see AGENTS.md's e2e testing note).

## Current limitations

Documented in the API/schema but with no UI yet:

- Creating or editing users, and resetting passwords, requires direct database/API access — there's no signup or admin user-management UI.
- Points can only be adjusted by parents through the Points page's bonus/deduction action, or by completing a chore.

## Not implemented

The following do not exist in the current app, despite older docs describing them: pocket money, chore categories, a statistics dashboard, family groups, audit logs, PWA/offline support, email notifications, and quiet hours for notifications. See [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) for what's actually deferred vs. permanently cut.
