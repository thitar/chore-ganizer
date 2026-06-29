# PITFALLS: v3.1 Notifications (ntfy.sh)

**Domain:** Push notification integration into a 4-user homelab family chore app
**Researched:** 2026-06-29
**Scope:** ntfy.sh integration for chore-assigned / due-soon / completed events
**Overall confidence:** HIGH (ntfy.sh docs, Node.js fetch API, Prisma schema all verified against source)

> Concrete pitfalls for adding push notifications. Each pitfall names the warning sign,
> the prevention strategy, the phase that should address it, and a MUST / NICE / DEFER verdict.
> Optimized for a 4-user homelab — no SaaS-grade over-engineering.

---

## Scope Recap (from PROJECT.md NOTIFY-01…07)

- `User.ntfyTopic` (new field, String?)
- `NTFY_BASE_URL` env var, no default
- Fire on: assignment create → recipient's topic; assignment due-today (lazy) → recipient's topic; assignment complete → parents' topic(s)
- Lazy triggers only (no cron, no background jobs)
- Graceful degradation if config / topic missing
- Notifications must NOT block the API response

---

## CRITICAL — MUST address in v3.1

These will break the app, leak data, or fire notification storms if not designed in from the start.

### Pitfall 1: Notification blocks the API response (await inside handler)

**What goes wrong:** The assignment-create controller awaits `fetch(NTFY_BASE_URL)`. If the ntfy server is unreachable (docker container down, DNS hiccup, LAN switch reboot), the fetch hangs or stalls. Every `POST /api/assignments` hangs in turn. Parents get a spinning browser; assignments don't get created. The "non-blocking" requirement from NOTIFY-06 silently fails.

**Why it happens:** `await` is the natural shape of an Express handler. A developer wiring up a notification for the first time writes `await sendNtfy(...)` because it's the obvious pattern.

**Consequences:** API latency spikes. Worst case: the entire app appears broken when only the ntfy container is down — a single dependency failure cascades into a total outage of an unrelated feature.

**Prevention:** Use fire-and-forget with a guarded swallow. Call the notifier from inside the controller but do NOT `await` it. The function must:
1. Catch all rejections inside itself.
2. Run on the same tick (don't `await` in the caller).
3. Log the failure to stdout (for `docker logs`).

```typescript
// services/notifications.service.ts
export function notifyAssignmentAssigned(assignment: ChoreAssignment): void {
  if (!isNtfyConfigured()) return  // graceful degradation
  // void + catch — fire and forget, no caller await
  void sendNtfy(assignment.assignedTo.ntfyTopic, payload)
    .catch((err) => console.error('[ntfy] chore-assigned failed:', err.message))
}
```

**Detection:** `SLOW_REQUEST_THRESHOLD_MS` warnings on `POST /api/assignments` after ntfy goes down. If you see this, the await crept back in.

**Phase:** Phase 1 (foundation) — establishes the pattern. Every later trigger reuses it.

**Verdict:** **MUST**

---

### Pitfall 2: Unhandled promise rejection terminates the Node process

**What goes wrong:** A `void sendNtfy(...)` without `.catch()` creates a floating promise. If ntfy is down and the underlying `fetch` throws, Node logs "UnhandledPromiseRejection" and (since Node 15) **terminates the process by default** (`--unhandled-rejections=throw` is the default). One unreachable ntfy server = full app crash loop.

**Why it happens:** Easy to forget `.catch()` on a void promise. ESLint's `no-floating-promises` would catch it but the project doesn't have that rule.

**Consequences:** Backend restarts repeatedly while ntfy is down. Docker Compose's `restart: unless-stopped` masks the symptom but not the cause — `docker logs backend` is full of crashes.

**Prevention:** The notifier module's only public exports are synchronous functions that handle their own promise lifecycle internally. Never let a raw fetch escape the notifier module. Test: a unit test that calls `notifyAssignmentAssigned()` with a deliberately broken NTFY_BASE_URL must not throw or log a process-level error.

**Detection:** `docker logs backend | grep UnhandledPromiseRejection`

**Phase:** Phase 1 (foundation)

**Verdict:** **MUST**

---

### Pitfall 3: No fetch timeout → hang forever

**What goes wrong:** Native `fetch()` has no default timeout. A SYN packet to a half-up ntfy container (TCP open but no response) can hang for the OS default (~75 seconds on Linux). During that time, even fire-and-forget fetches accumulate in memory and the event loop is fine, BUT the ntfy server's request queue fills up and eventually Docker's connection limit is hit.

**Why it happens:** Native fetch inherits the browser's "no timeout" behavior. Developers accustomed to `axios` (which has `timeout` config) forget.

**Consequences:** Memory growth during outages. ntfy server gets DOSed by our own queued requests.

**Prevention:** Use `AbortSignal.timeout(3000)` on every fetch. 3 seconds is generous for LAN-local ntfy but short enough to fail fast on a real outage.

```typescript
const res = await fetch(url, {
  method: 'POST',
  body: ...,
  signal: AbortSignal.timeout(3000),
})
```

**Detection:** Test by pointing `NTFY_BASE_URL` at a sinkhole IP (e.g., `10.255.255.1`) and confirming a request returns within ~3.5s, not ~75s.

**Phase:** Phase 1 (foundation) — this is inside the notifier module.

**Verdict:** **MUST**

---

### Pitfall 4: Notification storm from lazy due-soon trigger

**What goes wrong:** NOTIFY-07 says "due-soon trigger runs on app load + on demand when viewing calendar/chore list." The chore list endpoint is called every page load. A user has 4 chores due today. They open the app at 8:00, 8:03, 8:11, 8:24, and 9:00. **Each page load re-evaluates "what's due today" and fires notifications for all 4 chores — every time.** Result: 20 push notifications in 90 minutes. The phone buzzes so much the user disables notifications for the app.

**Why it happens:** Lazy triggers are easy to wire ("just check on every list view!") but without dedup state, the same event is re-evaluated as a new event.

**Consequences:** Notification fatigue → user disables ntfy entirely → the whole feature is dead. Worse than not having the feature at all.

**Prevention:** Add a `dueNotifiedAt DateTime?` column to `ChoreAssignment` (and `RecurringOccurrence`). The due-soon trigger sets it once per assignment per day. Re-evaluation is a no-op when the flag is set to today's date.

```typescript
// Only fire if not already notified today
if (isToday(assignment.dueNotifiedAt)) return
// ... fire notification ...
await prisma.choreAssignment.update({
  where: { id: assignment.id },
  data: { dueNotifiedAt: new Date() }
})
```

**Phase:** Phase 2 (assignment triggers) — `dueNotifiedAt` is part of the Prisma migration that adds `ntfyTopic`.

**Verdict:** **MUST**

---

### Pitfall 5: Concurrent due-soon checks double-fire on the same assignment

**What goes wrong:** Dad opens the app on his phone AND his laptop at 8:01am. Both clients hit `GET /api/assignments?due=today`. The backend runs the due-soon check for both requests concurrently. Both checks see the same 4 un-notified assignments, both call `sendNtfy()`. **8 notifications fire, 4 of them duplicates.** Same storm as Pitfall 4 but via concurrency.

**Why it happens:** Two GET requests execute in parallel; both observe the same "not yet notified" state and both fire.

**Consequences:** Same as Pitfall 4, plus a sneaky second failure mode that is hard to repro.

**Prevention:** Two layers, in order:
1. **Application layer:** Wrap the due-soon trigger in a `prisma.$transaction` that does a conditional update — `WHERE dueNotifiedAt IS NULL` with a `RETURNING` check. Only the request that actually flips the flag from null to a value fires the notification. This is the Postgres-style `UPDATE ... RETURNING` pattern; in Prisma + SQLite, implement it as: read the row, check if null, in a transaction re-read + update + only proceed if still null.
2. **Server-side dedup at the ntfy layer is not available** (the public ntfy API has no idempotency key). Don't rely on it.

**Phase:** Phase 2 (assignment triggers)

**Verdict:** **MUST**

---

### Pitfall 6: Topic name = access token; "alice" is guessable

**What goes wrong:** ntfy.sh's design (https://docs.ntfy.sh/publish/#picking-a-topic) is explicit: **"the topic is essentially a password."** Anyone who knows or guesses a topic can subscribe to all future messages on it. A user who picks `alice` as their topic is broadcasting "Alice's chore list" to anyone scanning the ntfy server (or scraping the topic namespace).

**Why it happens:** ntfy's on-the-fly topic creation means there's no review of the topic name. The user picks whatever is easy to type on their phone during ntfy app setup.

**Consequences:** If the ntfy server is exposed to anything beyond the LAN (port-forwarded by mistake, or someone on the LAN is curious), chore assignments leak. For a family chore app, the leak includes children's names and chore patterns.

**Prevention:** Two layers:
1. **Topic format validation at the API boundary.** Reject topics that don't match the documented ntfy rules: `[-_A-Za-z0-9]{12,64}`. Minimum 12 chars (e.g., `chore-ganizer-alice-x8f2kd9`). The suffix is what makes it unguessable — without it, the topic space is tiny. The user enters a friendly name + the system suggests/auto-generates a random suffix; user can override but a warning shows.
2. **Self-hosted ntfy config:** `auth-default-access: deny-all` + per-user ACL so the user can only subscribe to their own topic. This is the only safe config for a homelab. Document this in `.env.example` and the README.

**Detection:** E2E test: try to subscribe to a topic that belongs to another user without the right ACL → must return 403.

**Phase:** Phase 1 (schema + ntfy config) — the format validation lives in the `PATCH /api/users/me` route's Zod schema.

**Verdict:** **MUST**

---

### Pitfall 7: PII in notification body (kid's name + chore details on a locked phone)

**What goes wrong:** A push notification body like `"Alice: please take out the trash (worth 10 pts)"` is visible on the lock screen of every iPhone and Android phone. If Alice's phone is lost or left on a coffee table, anyone can see what chores she's assigned.

**Why it happens:** Helpful-sounding notification copy is the natural first draft.

**Consequences:** Children's chore patterns, names, and point values are visible to anyone with physical access to the device. For a private family app, this is a privacy regression.

**Prevention:** Two layers:
1. **Notification body is generic.** Use the format: `"Chore-Ganizer: 1 new chore assigned"` or `"Chore-Ganizer: chore due today"`. Chore details open in the app when the notification is tapped (via `Click` header → deep link to the app).
2. **Per-event priority:** `chore-assigned` and `chore-due-soon` are `default` (priority 3) or `high` (priority 4) — both visible on lock screen. `chore-completed` is `low` (priority 2) — hidden behind the notification tray. The phone owner can change this in their ntfy app, but the default is privacy-preserving.

```typescript
const payload = {
  title: 'Chore-Ganizer',
  message: '1 new chore assigned',
  priority: assignment.dueDate ? 'high' : 'default',
  click: `${APP_URL}/chores/${assignment.id}`,
  tags: 'memo',  // no kid emoji / no chore title in the body
}
```

**Phase:** Phase 2 (assignment triggers) — the message format is part of the notifier service.

**Verdict:** **MUST**

---

### Pitfall 8: User changes their own topic → message goes to old owner

**What goes wrong:** Alice's phone breaks; she resets the ntfy app and gets a new random topic. She updates her `ntfyTopic` to the new one via the Profile page. An assignment created in the millisecond between her save and the cache invalidation could fire to her OLD topic. If someone (or an old ntfy subscription that's still active) was subscribed to her old topic, they receive that message.

**Why it happens:** This is a tiny window but it exists. The real risk is the orphan old topic: Alice's old phone is still subscribed and receives one stray notification.

**Consequences:** A single stale notification on a device Alice doesn't use anymore. Low risk, low severity.

**Prevention:** This is a known limitation of topic-based systems. Acceptable for v3.1. The window is microseconds and the impact is "Alice sees one notification on her old phone." Document in the Profile page UI: "Changing your topic does not stop messages to your old topic — unsubscribe manually in the ntfy app."

**Phase:** Phase 1 (Profile page UI) — document in the help text.

**Verdict:** **DEFER** (acceptable risk for 4 users; revisit if complaints arise)

---

### Pitfall 9: Missing/empty NTFY_BASE_URL logs on every request

**What goes wrong:** A developer leaves `NTFY_BASE_URL` blank during dev. Every assignment create logs `[ntfy] NTFY_BASE_URL not set, skipping notification`. With ~50 chore creates per day in a 4-user family, that's 50 logs per day. Worse, the log noise makes it hard to spot REAL notification failures.

**Why it happens:** `isNtfyConfigured()` returns false but the check is per-request.

**Consequences:** Log spam drowns out real signal.

**Prevention:** Log the warning **once at startup** when the env var is missing. The notifier module has a module-level `isConfigured` flag set at import time. Per-request checks just read the flag, no logging.

```typescript
// services/notifications.service.ts (module top)
const NTFY_BASE_URL = process.env.NTFY_BASE_URL
if (!NTFY_BASE_URL) {
  console.warn('[ntfy] NTFY_BASE_URL not set — notifications disabled')
}

export function isNtfyConfigured(): boolean {
  return Boolean(NTFY_BASE_URL)
}
```

**Detection:** `docker logs backend | grep -c "NTFY_BASE_URL"` should return `1` on a misconfigured server, not `1` per request.

**Phase:** Phase 1 (foundation)

**Verdict:** **MUST**

---

### Pitfall 10: Completing an assignment on the phone doesn't notify the parents in time

**What goes wrong:** NOTIFY-04 says "completed → parents' topic(s)." The child completes a chore from the phone. The notification fires to the parent's topic. But if `chore-completed` priority is set to `default` or `high`, and the parent's phone is on silent, the parent never knows. Worse: if there are 2 parents and the app fires to BOTH topics with `default` priority, both phones buzz at 8pm during dinner. Annoying.

**Why it happens:** Default priority feels like a safe choice but it's wrong for completion events.

**Consequences:** Either the parent misses the notification (priority too low) or the parent is annoyed by it (priority too high, fires during meals).

**Prevention:**
- Set `chore-completed` priority to `low` (priority 2). It shows up in the notification tray but doesn't buzz or vibrate. Parents can check the app when convenient.
- If the kid is competing for a point goal or there's a special bonus, the parent can see the streak in the app.
- Document the priority choice in the code with a comment.

**Phase:** Phase 2 (assignment triggers)

**Verdict:** **MUST** (low priority default, not "no notification")

---

### Pitfall 11: Lazy "due today" — what does "today" mean in timezones?

**What goes wrong:** Dad travels to a different timezone. He's still on his homelab's ntfy topic. At 11pm his local time, he opens the app. Server's local time is 2am next day in the family's home timezone. The "due today" check on the server uses server time, sees tomorrow's assignments as "due today," and fires notifications for them. Dad gets 5 notifications at 11pm for things his kids can't actually do until tomorrow.

**Why it happens:** Lazy trigger runs on the backend. The backend's clock is the server's clock (Docker container's TZ, often UTC). A single user in a different timezone from the server gets wrong-day notifications.

**Consequences:** Annoying premature notifications. Low severity for the typical case (homelab family in one timezone, server TZ = family TZ because Docker host runs in the family's TZ).

**Prevention:** Two options:
- **Server-TZ (default for v3.1):** Use the server's local time. Document: "Notifications fire in the server's timezone. Set your homelab server's TZ to your family's local timezone." This is the right-sized answer for a 4-user homelab where everyone is in one TZ.
- **Per-user TZ (defer):** Add `User.timezone String?` and use it in due-today computation. Multi-week effort, requires migration, and the family isn't traveling.

**Decision:** Server-TZ for v3.1. Document in the README: "Set `TZ` in your `.env` file (e.g., `TZ=Europe/Berlin`) and restart." Reference: the existing `recurring.service.ts` already uses `new Date(d)` without TZ awareness, so we're consistent with the existing pattern.

**Phase:** Phase 2 (assignment triggers) — comment in the due-soon function.

**Verdict:** **MUST (server-TZ is the answer); DEFER (per-user TZ is over-engineering for v3.1)**

---

### Pitfall 12: Kid changes their own topic to something parent can see (privilege boundary)

**What goes wrong:** NOTIFY-01 says kids can set their own topic. But what if the kid types the parent's topic into their own field? Now assignments assigned TO the kid go to the parent's topic. The parent gets notifications about their own kids' chores that they would have seen anyway, but ALSO assignments made to other kids (e.g., dad assigns Bob a chore; if Bob's topic equals dad's topic, dad gets a notification about Bob's chore that he already created). Confusing at best, PII-leak at worst if "other parent" ex-spouse is on the ntfy server.

**Why it happens:** No uniqueness check on `User.ntfyTopic`. The Zod schema is a free string.

**Consequences:** Cross-talk between users. Minor data leak.

**Prevention:** Add a uniqueness check at the Zod level: when updating `User.ntfyTopic`, ensure no other active user has the same topic. The DB schema gets a `@unique` constraint on `User.ntfyTopic`. The kid gets a clear error: "That topic is already in use by another family member."

```prisma
model User {
  // ...
  ntfyTopic String? @unique
}
```

**Detection:** Integration test — `PATCH /api/users/me` with another user's topic → 409 Conflict.

**Phase:** Phase 1 (Prisma migration + Zod schema)

**Verdict:** **MUST**

---

## MODERATE — NICE to have in v3.1

These improve the experience but the v3.1 milestone is shippable without them. Decide per phase whether to include.

### Pitfall 13: Tests hit the real ntfy server (or skip ntfy tests entirely)

**What goes wrong:** Unit tests for the notifier either:
- Hit the real ntfy server (flaky, slow, requires ntfy running in CI)
- Skip ntfy tests with `vi.mock()` and never actually test the URL construction / header serialization / dedup logic

**Why it happens:** Mocking fetch is awkward in Node 20+.

**Prevention:** Use `vi.spyOn(globalThis, 'fetch').mockResolvedValue(...)` in unit tests. The test asserts: (a) correct URL, (b) correct headers (Title, Priority, Tags, Click), (c) `.catch` swallowed on rejection. Integration tests use a local `http.createServer` to act as a fake ntfy — no Docker dependency, no network.

**Phase:** Phase 1 (test harness for notifier) + Phase 2/3 (trigger tests)

**Verdict:** **NICE** (without it, tests are either flaky or inadequate)

---

### Pitfall 14: Topic format validation is too lax

**What goes wrong:** ntfy topic rules: `[-_A-Za-z0-9]`, max 64 chars. The Zod schema accepts anything. A kid enters `"alice's topic"` with an apostrophe. ntfy returns 400 with no helpful message. Parent opens a bug ticket.

**Prevention:** Zod schema enforces the exact regex from ntfy docs.

```typescript
const ntfyTopicSchema = z.string().regex(/^[-_A-Za-z0-9]{12,64}$/, {
  message: 'ntfy topic must be 12-64 chars, letters/digits/dashes/underscores only'
})
```

**Phase:** Phase 1 (Zod schemas)

**Verdict:** **NICE** (without it, the user experience is poor but the app works)

---

### Pitfall 15: `Click` header exposes internal app URL to lock screen

**What goes wrong:** Setting `Click: https://home.example.com/chores/123` means the URL is visible in the notification's expanded view on some Android launchers. For a homelab this is fine (it's a private domain), but for a forward-deployed instance it could leak the internal hostname.

**Prevention:** Use the path-only format that ntfy supports: `Click: /chores/123`. ntfy resolves this against `base-url` server-side. The lock screen shows a relative path.

**Phase:** Phase 2 (assignment triggers)

**Verdict:** **NICE** (cosmetic / homelab-specific)

---

## MINOR — DEFER to v3.2+

These are real concerns but explicitly out of scope for v3.1. Document them in code comments so they're not forgotten.

### Pitfall 16: Notification preferences per user / per event type
**What:** "Don't notify me about completed chores" toggle.
**Why defer:** NOTIFY-01 says "no preferences — all events fire." Adding preferences requires a new table, a new UI, and complicates the notifier interface. Defer to v3.2 once the basic feature is proven.
**Verdict:** **DEFER**

### Pitfall 17: Quiet hours (no notifications 9pm-7am)
**What:** Suppress notifications during sleep hours.
**Why defer:** Requires per-user config, TZ awareness (already a v3.1 pitfall), and a cron-like check (we said no cron). Workaround: ntfy phone app has its own quiet hours. Use that.
**Verdict:** **DEFER**

### Pitfall 18: Notification history / log
**What:** "Show me what notifications I missed yesterday."
**Why defer:** Adds a `NotificationLog` table, a query API, a UI page. ntfy phone app has its own history. Don't duplicate.
**Verdict:** **DEFER**

### Pitfall 19: Email fallback
**What:** If ntfy server is down, also send an email.
**Why defer:** NOTIFY-05 says missing config degrades gracefully. Adding email fallback means an SMTP path too. The homelab will have ntfy up; email is a separate concern.
**Verdict:** **DEFER**

### Pitfall 20: Multi-family / tenant topics
**What:** Two families share the same ntfy server but with isolated topic namespaces.
**Why defer:** PROJECT.md explicitly says "Single-family / 4-user scale." No multi-tenancy by design.
**Verdict:** **DEFER (out of scope permanently)**

### Pitfall 21: Rate limiting ntfy server-side
**What:** Limit a single user to N notifications per hour to prevent storms.
**Why defer:** ntfy has its own rate limiting (`visitor-message-*` config options). For 4 users generating maybe 50 notifications/day total, the built-in limits are overkill. Trust the app-level dedup.
**Verdict:** **DEFER**

### Pitfall 22: Batching multiple assignments into one notification
**What:** "You have 3 new chores" instead of 3 separate notifications.
**Why defer:** Adds complexity (group by user + time window, decide when to flush), reduces urgency, and the dedup mechanism (Pitfall 4) already prevents storms. Each assignment is a separate event in the domain model.
**Verdict:** **DEFER**

### Pitfall 23: Delivery confirmation / read receipts
**What:** "Did the parent actually see the chore-completed notification?"
**Why defer:** Requires bidirectional ntfy (publish + subscribe), state tracking, and a UI. Not in NOTIFY-01..07.
**Verdict:** **DEFER**

### Pitfall 24: Web Push (iOS Safari)
**What:** Support iOS without the ntfy app, via Web Push in the browser.
**Why defer:** Requires VAPID keys, `web-push-file` config, service worker in the frontend. Significant effort. ntfy app works fine for the family on Android.
**Verdict:** **DEFER**

### Pitfall 25: Per-user timezone for "today"
**What covered:** See Pitfall 11. Server-TZ is the v3.1 answer.
**Verdict:** **DEFER** (server-TZ is correct for 4 users in 1 TZ)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| **Phase 1: Foundation** (schema, notifier module, Profile topic field) | Pitfalls 1, 2, 3, 9, 12, 14 | Establish fire-and-forget pattern, timeout, graceful degradation, unique constraint, regex validation. All foundation decisions. |
| **Phase 2: Assignment triggers** (assignment create / complete / due-soon) | Pitfalls 4, 5, 7, 10, 11, 15 | Add `dueNotifiedAt` to assignment; transactional dedup; generic notification body; low priority for completed; server-TZ for today; relative Click URL. |
| **Phase 3: Recurring occurrence triggers** | Pitfalls 4, 5, 7 (apply to RecurringOccurrence too) | Add `dueNotifiedAt` to RecurringOccurrence; reuse notifier service. |
| **Phase 4: UI** (Profile page field) | Pitfall 8 (document stale topic) | Help text: "Old topic won't be unsubscribed automatically." |
| **Phase 5: E2E tests** | Pitfall 13 (no real ntfy in CI) | Local `http.createServer` as fake ntfy. |

---

## Cross-Cutting Risks

These apply to all of v3.1.

### Risk A: ntfy server is a new dependency
**What:** The app has zero new dependencies since v3.0. ntfy adds a network hop and a deployment step. If the homelab owner doesn't deploy ntfy, the feature is silently off (graceful degradation works) but they think it's broken.
**Mitigation:** Clear startup log: `[ntfy] NTFY_BASE_URL not set — notifications disabled`. README section "Optional: enable push notifications" with the docker-compose snippet for ntfy.

### Risk B: Per-household TLS / auth setup
**What:** NOTIFY-05 says self-hosted. Self-hosted means the ntfy server needs:
- TLS cert (Caddy / Let's Encrypt / homelab CA)
- `auth-default-access: deny-all`
- Per-user ACL: `alice:chore-ganizer-alice-*:rw`, etc.
- An admin token for the backend to publish with (`auth-tokens: chore-ganizer:tk_xxx:admin`)

If any of these is wrong, either notifications don't deliver or anyone on the LAN can subscribe to anyone's topics.
**Mitigation:** Provide a complete `docker-compose.yml` snippet in the README with the ntfy service, the auth config, and the ACL provisioning. Make the topic-name format obvious in the docs.

### Risk C: "What topic should I pick?" UX
**What:** User opens the Profile page, sees a field labeled "ntfy topic," has no idea what to type. They type `"alice"`. Pitfall 6 happens.
**Mitigation:** Show a "Generate random topic" button that produces `chore-ganizer-alice-x8f2kd9`. The field also shows the required format inline. The field is opt-in: it's not part of the required Profile data, and notifications only fire if a topic is set (Pitfall 9 graceful degradation).

### Risk D: User is offline / phone is off when notification fires
**What:** ntfy's pub-sub model: when the kid's phone is off, in flight mode, or has no ntfy app installed, the message is **lost**. ntfy has no offline queue for end users; the ntfy server has a 12-hour message cache (Pitfall 25 deferral covers Web Push for iOS), but if the phone never reconnects to ntfy in that window, the notification is gone.
**Why it matters:** A chore-due-soon notification that never arrives means the kid forgets the chore. The chore is still visible in the app when they next open it — but "push notification" implies the user shouldn't have to remember to open the app.
**Mitigation for v3.1:** Document in the README: "Notifications are best-effort. If the ntfy app is not running, the chore is still visible in the app." The in-app chore list is the authoritative view; push is a convenience. Don't build a fallback (email, SMS) in v3.1.
**Verdict:** **ACCEPT** as a known limitation; document in README.

### Risk E: Parent overrides kid's ntfy topic
**What:** Per NOTIFY-01, parents can set the topic for kids. The question is: should the kid see that the parent changed their topic, and should the parent's override be a `PUT` (replace) or a `PATCH` (preserve if kid set it)?
**Why it matters:** Trust boundary between parent and child within the family. If a parent silently overrides a kid's topic, the kid misses notifications on their phone (subscribed to old topic, new topic goes to the new device).
**Mitigation for v3.1:** Simple model — both parent and kid can edit any user's `ntfyTopic` via the existing user management route (parent) or self-service (kid, via v3.0 AUTH-06 pattern). The `User.ntfyTopic` is owned by the user; parent override is the same route, same field. The kid sees the new value on their next profile load. This is acceptable for a family where parents are trusted admins — same trust model as v3.0 parent-deletes-user (AUTH-04). Document the behavior; do not add a "kid must approve" workflow (over-engineering for 4 users).
**Verdict:** **ACCEPT** — covered by existing parent-admin trust model.

---

## Sources

- [ntfy publishing docs](https://docs.ntfy.sh/publish/) — header names (Title, Priority, Tags, Click), topic name rules (`[-_A-Za-z0-9]`, 64 chars), "topic is essentially a password" (Confidence: HIGH, official)
- [ntfy configuration docs](https://docs.ntfy.sh/config/) — `auth-default-access: deny-all`, per-user ACL, access tokens, behind-proxy requirement (Confidence: HIGH, official)
- [ntfy installation docs](https://docs.ntfy.sh/install/) — Docker image, single-instance recommendation (SQLite single-writer) (Confidence: HIGH, official)
- [Node.js globals: `fetch`, `AbortController`, `AbortSignal.timeout`](https://nodejs.org/api/globals.html#fetch) — timeout via `AbortSignal.timeout(3000)`, fetch since v17.5 stable v21 (Confidence: HIGH, official)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) — `signal` flow, `abort()` semantics (Confidence: HIGH, official)
- `backend/prisma/schema.prisma` — current User/Assignment/RecurringOccurrence models (Confidence: HIGH, project source)
- `backend/src/services/recurring.service.ts` — existing TZ-naive date pattern (line 13) to match (Confidence: HIGH, project source)
- `.planning/PROJECT.md` — NOTIFY-01..07 requirements (Confidence: HIGH, project source)
