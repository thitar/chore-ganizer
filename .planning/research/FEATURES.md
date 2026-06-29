# Feature Landscape — ntfy.sh Push Notifications (v3.1)

**Domain:** Family chore management (Express/Prisma/React/SQLite homelab)
**Researched:** 2026-06-29
**Confidence:** HIGH (all findings verified against official ntfy.sh docs and existing v1-archive reference implementation)
**Downstream consumer:** Phase planning for v3.1 — feeds SUMMARY.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

ntfy.sh is a simple HTTP-based pub/sub notification service. A client POSTs to `<server>/<topic>` with optional headers (`Title`, `Priority`, `Tags`, `Click`, `X-Sequence-ID`); subscribed devices receive a push. Self-hosting is a single `binwiederhier/ntfy` container. For a 4-user family chore app, the ntfy surface area is small — **4 table-stakes features, 0 essential differentiators, 5 anti-features for the homelab scope**.

The v1-archive codebase (pre-rewrite) shipped a complete notification system with per-user settings, email, quiet hours, and 6 event types. v3.1 is intentionally narrower: **3 events, per-user topic only, no preferences, no email, no in-app, self-hosted only, lazy "due soon" trigger**. This research treats those constraints as load-bearing.

The core technical decision is **where to store the topic** (on `User` table vs separate `UserNotificationSettings` table). The v3.1 spec explicitly chooses the former — keep it simple, fewer migrations, fewer tables.

---

## Domain Context

- **App:** Chore-ganizer v3.0.0 rewrite, single-family homelab, 4-6 users
- **Existing validated features** (do not re-research): auth, chore templates/assignments, recurring chores, points, calendar, profile self-service (password + color), Docker compose
- **Stack:** Express + Prisma + SQLite backend, React + Vite + Tailwind frontend
- **Existing chore lifecycle hooks** (where notifications will fire):
  - `assignment.service.ts:create` — chore assigned (line 5)
  - `assignment.service.ts:complete` — chore completed (line 125, inside `$transaction`)
  - `assignment.service.ts:getAll` — fetches upcoming chores, **natural place for lazy "due soon" trigger** (line 42 calls `generateOccurrences`)
- **Schema:** `User` table has `id, email, name, password, role, color, createdAt, updatedAt` — no ntfy columns yet
- **v1-archive reference:** `backend-v1-archive/src/services/ntfy.service.ts` (205 lines) and `notification-settings.service.ts` (314 lines) — full prior art, including the `validateNtfyServerUrl` SSRF guard, `NotificationPriorities` map, and `NotificationTags` map. **Reuse the priorities/tags/SSRF guard verbatim**; drop the per-event settings model.

---

## Table Stakes

Features that users expect from a chore app with push notifications. Missing = product feels incomplete. **All 4 are in-scope for v3.1.**

### TS-1: Per-user ntfy topic stored on `User` table

**Why expected:** The v3.1 spec mandates this. Each user gets their own topic so they subscribe on their own device(s). Topics are passwords — per-user isolation prevents one family member's topic from leaking notifications to another.

**Complexity:** Low. Two new columns on `User`:
- `ntfyTopic` (String, nullable, unique) — e.g., `"alice-chores-7f3a"`
- `ntfyBaseUrl` (String, nullable) — optional per-user override; typically inherited from `NTFY_BASE_URL` env

**Schema migration impact:** Add 2 columns + a unique index on `ntfyTopic`. Existing users get NULL → no notifications until they configure it.

**Source:** PROJECT.md v3.1 spec; v1-archive `UserNotificationSettings.ntfyTopic`.

---

### TS-2: HTTP publish to ntfy server with Title / Priority / Tags / Click headers

**Why expected:** Without these, the push is just `"<message text>"` on a generic title. Title and tags are what make the notification glanceable on a phone. Priority controls vibration/sound. Click opens the right page.

**Recommended headers (per event):**

| Event | Title | Body | Priority | Tags | Click |
|-------|-------|------|----------|------|-------|
| Chore assigned | `"New chore: {title}"` | `"{title} — due {dueDate}"` | `3` (default) | `clipboard,bell` | `<app-url>/chores/{id}` |
| Chore due soon (same day) | `"Due today: {title}"` | `"{title} — {points} pts, due {dueDate}"` | `4` (high) | `warning,alarm_clock` | `<app-url>/chores/{id}` |
| Chore completed | `"{userName} completed: {title}"` | `"+{points} points earned"` | `2` (low) | `white_check_mark,star` | `<app-url>/chores/{id}` |

**Priority rationale:**
- Assigned = default (`3`) — informational, normal sound
- Due soon = high (`4`) — important, longer vibration, deserves attention today
- Completed = low (`2`) — confirmation only, no sound/vibration; parents get many of these

**Tags rationale (from ntfy emoji short codes):**
- `clipboard` → 📋
- `bell` → 🔔
- `warning` → ⚠️
- `alarm_clock` → ⏰
- `white_check_mark` → ✔️
- `star` → ⭐
- For Android: emoji tags prepend to the title; for iOS: appear in subtitle.

**Source:** ntfy.sh publish docs (https://docs.ntfy.sh/publish/#message-title, /#message-priority, /#tags-emojis); v1-archive `NotificationPriorities` + `NotificationTags` constants.

---

### TS-3: Graceful degradation when ntfy not configured

**Why expected:** The v3.1 spec mandates this. A family member who hasn't set up ntfy yet should NOT cause errors when the backend tries to fire a notification. Nor should the app crash if `NTFY_BASE_URL` is unset.

**Behavior:**
- If `user.ntfyTopic` is NULL → **skip the notification silently** (no log error, no API failure)
- If `NTFY_BASE_URL` env is unset → **skip ALL notifications silently** (no global crash)
- If ntfy server is unreachable (timeout, 5xx) → **log warning, return success** to the caller (notification is best-effort, never blocks chore business logic)

**Implementation note:** The notification fire must happen **after** the database commit, not inside the `$transaction`. If ntfy is down, the chore should still be saved. A try/catch around the axios call with a `logger.warn` is the standard pattern. v1-archive `sendNtfyNotification` already does this (returns `false` on error, never throws).

**Complexity:** Low. ~5 lines of guard logic in the publish function.

**Source:** PROJECT.md v3.1 spec ("missing config gracefully degrades"); v1-archive `ntfy.service.ts:143-151`.

---

### TS-4: SSRF guard on user-supplied ntfy server URL

**Why expected:** The v1-archive already has this. If `ntfyBaseUrl` is per-user-configurable (even if most users use the env default), a malicious user could enter `http://169.254.169.254/...` (AWS metadata) or `http://localhost:6379/...` (Redis) and have the backend POST sensitive data there.

**Implementation:** Reuse the `validateNtfyServerUrl` function from `backend-v1-archive/src/services/ntfy.service.ts:41-85` verbatim. Rejects:
- Non-HTTP(S) protocols (`file:`, `gopher:`, etc.)
- Loopback (`localhost`, `127.0.0.1`, `::1`)
- Private RFC1918 ranges (`10/8`, `172.16/12`, `192.168/16`)
- Link-local (`169.254/16`)
- IPv6 ULA (`fc00::/7`, `fd00::/8`)

**Why this is table stakes for the homelab:** Even though "developer is the user," the `ntfyBaseUrl` field on `User` is part of the API surface. The v1-archive shipped it, the security test in v1-archive covers it, removing it for v3.1 would be a regression.

**Complexity:** Low (copy 45 lines of code, no new logic).

**Source:** v1-archive `ntfy.service.ts:41-85`; the v3.0.0 rewrite explicitly preserved this concern (it appears in the v1-archive retained as reference).

---

## Differentiators

Features that set the app apart. Not expected by users, but valued. **All explicitly out-of-scope for v3.1 per spec; documented here so future milestones know what was considered.**

| Feature | Value | Why Deferred for v3.1 |
|---------|-------|----------------------|
| Per-event toggle (`notifyChoreAssigned` etc.) | Lets kids mute chore-assigned but keep due-soon | Spec says "no per-user preferences" — uniform behavior is the design intent |
| Quiet hours (don't notify 9pm-7am) | Avoids waking kids at night | Spec excludes it; 4-user family can self-moderate; "due soon" fires during waking hours anyway |
| Custom per-user `ntfyBaseUrl` (vs env default) | Family member uses a different ntfy instance | Overkill for homelab; env var covers the common case |
| Email fallback (SMTP) | Reliability if ntfy is down | Spec excludes email entirely |
| In-app notification bell (notification center) | See missed notifications in the app | Spec excludes in-app entirely; ntfy *is* the notification UI |
| Phone-call escalation for overdue chores | Wake-the-parent safety net | Out of scope; v1-archive had it but no one used it |
| Scheduled delivery (`X-Delay` header) | "Notify at 7am" instead of "now" | Out of scope; "due soon" is the substitute |
| Attach chore photo to completion notification | Visual confirmation | Out of scope; increases payload size, rarely useful |
| Notification grouping (per-chore, collapse) | Phone groups 3 chores into one notification | ntfy doesn't support per-publisher grouping; client-side dedup via `X-Sequence-ID` is the workaround (see Anti-Features) |
| Web push (browser tab notification) without ntfy | No ntfy install required | ntfy web app IS this (https://ntfy.sh/<topic>); user can subscribe in browser |

**Recommendation:** **Build 0 of these for v3.1.** The spec is intentionally narrow. Adding per-user preferences or quiet hours would require a `UserNotificationSettings` table (rejected by spec), a settings UI (more frontend work), and testing for every preference combination (exponential). Defer all of these to a future "notification preferences" milestone if the family asks.

---

## Anti-Features

Features to **explicitly NOT build** in v3.1. Each one would either (a) be wasted effort for 4 users, (b) conflict with the spec's "no preferences" rule, or (c) reintroduce complexity the v3.0.0 rewrite removed.

### AF-1: Separate `UserNotificationSettings` table

**Why avoid:** v1-archive had this (a 27-column model: ntfyTopic, ntfyServerUrl, ntfyUsername, ntfyPassword, emailNotifications, notificationEmail, 5 per-event booleans, reminderHoursBefore, quietHoursStart, quietHoursEnd, overduePenaltyEnabled, etc.). Most of those columns were never used. v3.1 spec puts the topic directly on `User` (2 columns) and intentionally drops the rest.

**What to do instead:** Two new columns on `User`: `ntfyTopic` (String?, unique) and `ntfyBaseUrl` (String?, nullable override). Read `NTFY_BASE_URL` env as default. No join, no separate fetch, no migration of the legacy table.

**Effort saved:** ~250 lines (entire `notification-settings.service.ts` and `notification-settings.controller.ts` from v1-archive).

---

### AF-2: Per-event enable/disable toggles

**Why avoid:** Spec says "All events fire when applicable — no per-user preferences." A child can't disable chore-assigned notifications. A parent can't disable chore-completed. This is intentional: a 4-user family doesn't need 4×3=12 preference switches.

**What to do instead:** Uniform behavior. If the user has a topic set, they get all 3 event types. If they want to mute, they unsubscribe from the topic in their ntfy app.

**Effort saved:** 5 boolean columns + a settings UI tab + tests for every combination.

---

### AF-3: Quiet hours

**Why avoid:** Spec excludes it. Adds `quietHoursStart` / `quietHoursEnd` columns, a clock comparison in the publisher, and a "did this notification get suppressed?" log to debug. The homelab "due soon" window is already during waking hours (a chore due "today" fires when the user opens the app, which is when they're awake).

**What to do instead:** None needed. If a family member wants quiet hours, they configure them in the ntfy Android app's per-topic settings — that app already has native support for this. Don't reinvent.

**Effort saved:** 2 columns + per-message clock check + settings UI.

---

### AF-4: Email fallback / SMTP

**Why avoid:** Spec says "No email." The v1-archive had nodemailer integration; v3.0.0 removed it. Re-adding it would mean a separate `emailService.ts`, SMTP env vars, app-password docs, and testing for spam folders.

**What to do instead:** ntfy supports email forwarding (`X-Email: phil@example.com` header) IF a family member really wants it. They can configure it on the ntfy server side. The chore-ganizer backend doesn't need to know.

**Effort saved:** ~150 lines of SMTP integration + a 2nd transport layer.

---

### AF-5: Test-from-settings button (and "Test notification" endpoint)

**Why expected?** A reasonable user might want to verify their topic works. But: **the ntfy mobile app already has this**. Subscribing to a topic, sending a test from the ntfy app or `curl`, and confirming the push lands on the phone is faster and more reliable than building a "Send Test" button inside chore-ganizer. The `notify-tester` skill in `.claude/skills/notify-tester/SKILL.md` already documents the curl pattern for the developer.

**Why avoid (for v3.1):** Adds a settings page section, a `POST /api/users/:id/test-ntfy` endpoint, error UI ("ntfy returned 401 — check your topic name"), and async feedback. For 4 users who set up once, the cost > benefit.

**What to do instead:** The ntfy app's "Send test message" button (built into every ntfy client). Or `curl -d "test" $NTFY_BASE_URL/$user_topic` from the server.

**Effort saved:** Settings UI section + endpoint + error states.

**Reconsider for:** A "Family Setup Guide" README page that says "to test, open ntfy app → Subscribe to `<topic>` → Send a test."

---

## Event Specifications

Concrete wire format for each of the 3 events. Use these as the implementation contract.

### Event 1: Chore Assigned

**Trigger:** `POST /api/assignments` succeeds (after DB commit)
**Audience:** The assigned user (the child, typically)
**Lookup:** `prisma.user.findUnique({ where: { id: assignment.assignedToId }, select: { ntfyTopic: true } })`
**Skip if:** `user.ntfyTopic` is null

**HTTP request:**
```
POST {NTFY_BASE_URL}/{user.ntfyTopic} HTTP/1.1
Title: New chore: {template.title}
Priority: 3
Tags: clipboard,bell
Click: {APP_URL}/chores/{assignment.id}
X-Sequence-ID: chore-{assignment.id}-assigned

{title} — due {dueDate}
```

**Example:**
```
POST https://ntfy.home.local/alice-chores-7f3a HTTP/1.1
Title: New chore: Take out trash
Priority: 3
Tags: clipboard,bell
Click: http://localhost:3002/chores/42
X-Sequence-ID: chore-42-assigned

Take out trash — due 2026-06-30
```

**Rationale:**
- `X-Sequence-ID: chore-{id}-assigned` means if the chore gets reassigned, a new sequence ID is used (so the new push is a new notification, not an update of the old one)
- Priority 3 (default) — normal sound, not alarming
- Tags `clipboard` (📋) + `bell` (🔔) — glanceable on lock screen

---

### Event 2: Chore Due Soon (same day)

**Trigger:** Lazy — fires when `GET /api/assignments` returns an assignment whose `dueDate` is today and notification hasn't been sent yet for this assignment
**Audience:** The assigned user
**Lookup:** Same as Event 1
**Skip if:** `user.ntfyTopic` is null OR the notification was already sent (dedup below)

**Dedup mechanism:** Store a `dueNotifiedAt` timestamp column on `ChoreAssignment` (nullable). On trigger, check if `dueNotifiedAt` is null. If null, send and set it. This is a one-line schema change and avoids the cron pattern.

**Alternative dedup:** Use ntfy's `X-Sequence-ID: chore-{id}-due` — if the same sequence ID is sent twice, ntfy treats it as an update and the client doesn't re-notify. But this only works if the ntfy server is reachable AND if the previous send was successful. A `dueNotifiedAt` column is more reliable.

**HTTP request:**
```
POST {NTFY_BASE_URL}/{user.ntfyTopic} HTTP/1.1
Title: Due today: {template.title}
Priority: 4
Tags: warning,alarm_clock
Click: {APP_URL}/chores/{assignment.id}
X-Sequence-ID: chore-{assignment.id}-due

{title} — {points} pts, due today
```

**Example:**
```
POST https://ntfy.home.local/alice-chores-7f3a HTTP/1.1
Title: Due today: Take out trash
Priority: 4
Tags: warning,alarm_clock
Click: http://localhost:3002/chores/42
X-Sequence-ID: chore-42-due

Take out trash — 10 pts, due today
```

**Rationale:**
- Priority 4 (high) — deserves attention; same-day deadline
- Tags `warning` (⚠️) + `alarm_clock` (⏰) — visual urgency
- Body includes points — "earn 10 pts" is a positive nudge

**Where it fires in the code:** At the top of `assignment.service.ts:getAll` (line 42) — same place that calls `generateOccurrences`. Pseudocode:
```typescript
// After generateOccurrences
const dueToday = await prisma.choreAssignment.findMany({
  where: {
    dueDate: { gte: startOfToday, lte: endOfToday },
    status: 'PENDING',
    dueNotifiedAt: null,
    assignedTo: { ntfyTopic: { not: null } },
  },
  include: { template: true, assignedTo: true },
})
for (const a of dueToday) {
  await sendNtfy(a.assignedTo, { ... })
  await prisma.choreAssignment.update({
    where: { id: a.id },
    data: { dueNotifiedAt: new Date() },
  })
}
```

**Source:** v3.1 spec "Lazy 'due soon' trigger (no cron)".

---

### Event 3: Chore Completed

**Trigger:** `POST /api/assignments/:id/complete` succeeds (after DB commit)
**Audience:** The parent(s) — all users with `role: 'PARENT'`
**Lookup:** `prisma.user.findMany({ where: { role: 'PARENT', ntfyTopic: { not: null } } })`
**Skip if:** No parents have ntfy configured

**HTTP request (sent to EACH parent's topic):**
```
POST {NTFY_BASE_URL}/{parent.ntfyTopic} HTTP/1.1
Title: {userName} completed: {template.title}
Priority: 2
Tags: white_check_mark,star
Click: {APP_URL}/chores/{assignment.id}
X-Sequence-ID: chore-{assignment.id}-completed

+{points} points earned
```

**Example:**
```
POST https://ntfy.home.local/dad-chores-a9c1 HTTP/1.1
Title: Alice completed: Take out trash
Priority: 2
Tags: white_check_mark,star
Click: http://localhost:3002/chores/42
X-Sequence-ID: chore-42-completed

+10 points earned
```

**Rationale:**
- Priority 2 (low) — confirmation only, no sound/vibration; parents get many of these
- Tags `white_check_mark` (✔️) + `star` (⭐) — positive visual
- Body is terse — "see the app" for details
- The chore completer does NOT get notified about their own completion (no need)

---

## Feature Dependencies

```
TS-1 (per-user topic on User table)
   └── enables──> TS-2 (publish with headers)
   └── enables──> TS-3 (graceful degradation)
   └── enables──> TS-4 (SSRF guard — applies to user-supplied baseUrl override)

Event 1 (chore assigned)
   └── requires──> TS-1 (recipient must have ntfyTopic)
   └── requires──> TS-2
   └── requires──> TS-3
   └── requires──> TS-4 (when user.ntfyBaseUrl is set)

Event 2 (chore due soon)
   └── requires──> Event 1 dependencies
   └── requires──> dueNotifiedAt column for dedup
   └── requires──> lazy trigger point in getAll()

Event 3 (chore completed)
   └── requires──> Event 1 dependencies
   └── requires──> parent role lookup
```

---

## MVP Recommendation

**Build these 4 features for v3.1. Skip everything else.**

1. **Schema migration** — add `User.ntfyTopic` (String?, unique), `User.ntfyBaseUrl` (String?, nullable), `ChoreAssignment.dueNotifiedAt` (DateTime?, nullable)
2. **Profile page UI** — add a "Notifications" section to the existing profile page: input for topic (auto-generate suggestion like `chore-{username}-{6chars}`), input for baseUrl override, "Save" button
3. **Backend publish function** — `services/ntfy.service.ts` with: `validateNtfyServerUrl` (from v1-archive), `sendNtfyNotification` (axios POST, returns boolean, never throws), priority/tag maps as constants
4. **Wire up 3 triggers** — call the publish function at the right points in `assignment.service.ts:create`, `:complete`, and `:getAll` (the lazy due-soon trigger)

**Plus config:**
- `NTFY_BASE_URL` env var, **no default** (missing = no notifications, no error) — spec mandate
- One-line setup: parents set this once in `.env`; kids just enter their topic in the app

**Defer to future milestones** (not in v3.1):
- Per-event toggles
- Quiet hours
- Email fallback
- "Test notification" button
- Per-user `ntfyBaseUrl` (use env default for v3.1)
- Notification history (in-app)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| ntfy.sh API surface (headers, priority, tags, click) | HIGH | Verified against official docs at docs.ntfy.sh/publish/ |
| Priority + tag recommendations | HIGH | Adapted from v1-archive's shipped `NotificationPriorities` and `NotificationTags` constants, which were user-tested in production |
| SSRF guard requirements | HIGH | v1-archive's `validateNtfyServerUrl` was security-reviewed and shipped |
| Lazy "due soon" trigger location | MEDIUM | Recommendation to fire in `getAll()` is opinionated; alternative is a per-user endpoint. The `getAll` location piggybacks on existing read traffic (no cron, no new endpoint) |
| Dedup with `dueNotifiedAt` column vs `X-Sequence-ID` | MEDIUM | Both work; the column is more explicit and queryable. Trade-off is +1 column vs +0 columns. The column is recommended for explicitness |
| Audience for "chore completed" = all parents | MEDIUM | Spec is silent; "all parents" is the simplest interpretation. Alternative: only the original creator. For homelab, "all parents" is fine (typically 2 parents) |
| Event 2 trigger timing (when does `getAll` fire?) | MEDIUM | The spec says "lazy" but doesn't specify what counts as a "view." Recommendation: any GET on `/api/assignments` by the assigned user counts. So the kid's own app-open triggers their reminder. Parents viewing the family calendar also re-evaluate, but parents don't get the "due today" notification (they're not the assignedTo) |

---

## Gaps to Address

- **No official "ntfy node SDK for TypeScript"** — axios to a URL is the standard. No new dependency needed (axios is already a transitive dep via existing services).
- **No testing for ntfy side-effects in unit tests** — the publish function will be mocked. Integration tests need a running ntfy server (or the v1-archive test fixture pattern of mocking at the axios boundary).
- **iOS subscription UX** — ntfy iOS app is newer; the tag rendering and click handling may differ. Worth a 5-minute manual test on iOS before declaring done.
- **`NTFY_BASE_URL` must NOT default to `https://ntfy.sh`** — spec says self-hosted only, no public fallback. If the env is unset, `sendNtfyNotification` returns false silently. Document this in `.env.example`.

---

## Sources

- **ntfy.sh publish API:** https://docs.ntfy.sh/publish/ (verified 2026-06-29)
  - Title, priority, tags, click, actions, attachments, X-Sequence-ID, message caching, authentication
- **ntfy.sh message priority reference:** https://docs.ntfy.sh/publish/#message-priority
  - 1=min, 2=low, 3=default, 4=high, 5=max/urgent
- **ntfy.sh emoji short codes:** https://docs.ntfy.sh/emojis/
  - `clipboard` 📋, `bell` 🔔, `warning` ⚠️, `alarm_clock` ⏰, `white_check_mark` ✔️, `star` ⭐
- **ntfy.sh limitations:** https://docs.ntfy.sh/publish/#limitations
  - 4,096 byte message max; 60 concurrent requests/visitor; 250 daily messages on ntfy.sh (self-hosted: configurable)
- **PROJECT.md v3.1 spec:** per-user topic on User table, 3 events, self-hosted only, lazy due-soon
- **backend-v1-archive/src/services/ntfy.service.ts** (205 lines): reference implementation
  - `validateNtfyServerUrl` (SSRF guard)
  - `sendNtfyNotification` (axios POST, graceful error handling)
  - `NotificationPriorities` map: ASSIGNED=3, DUE_SOON=4, COMPLETED=2, OVERDUE=5, POINTS_EARNED=2, PENALTY=4
  - `NotificationTags` map: ASSIGNED=[clipboard,new], DUE_SOON=[warning,clock], COMPLETED=[white_check_mark,star]
- **backend-v1-archive/src/services/notification-settings.service.ts:240-272** (75 lines): title/body templates per event type — pattern to follow, simplified for v3.1
- **backend-v1-archive/prisma/schema.prisma** (UserNotificationSettings model): data model that v3.1 explicitly rejects in favor of 2 columns on User
- **.claude/skills/notify-tester/SKILL.md** (176 lines): existing test/curl patterns for ntfy
- **Existing chore lifecycle hooks** (where notifications fire):
  - `backend/src/services/assignment.service.ts:5` (`create` — assigned)
  - `backend/src/services/assignment.service.ts:125` (`complete` — completed)
  - `backend/src/services/assignment.service.ts:42` (`getAll` — calls `generateOccurrences`; natural place for lazy due-soon trigger)
