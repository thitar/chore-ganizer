# Requirements — Chore-Ganizer v3.1 (Notifications)

**Defined:** 2026-06-29
**Core Value:** Any family member can open the app, see their chores for today, and complete them — without the app requiring a devops engineer to maintain.

---

## v1 Requirements (v3.1 Scope)

### Notifications (ntfy.sh)

- [ ] **NOTIFY-01**: User can set their own ntfy topic in the Profile page; topic must be 12-64 chars `[A-Za-z0-9_-]` and unique across users
- [ ] **NOTIFY-02**: Backend fires `chore-assigned` push (priority 3, 📋🔔) to the assigned user's ntfy topic when a new assignment is created
- [ ] **NOTIFY-03**: Backend fires `chore-due-soon` push (priority 4, ⚠️⏰) to the assigned user's topic when they view a due-today assignment that hasn't been notified yet today; deduped via `dueNotifiedAt` timestamp
- [ ] **NOTIFY-04**: Backend fires `chore-completed` push (priority 2, ✔️⭐) to **all parents'** ntfy topics when an assignment is completed
- [ ] **NOTIFY-05**: `NTFY_BASE_URL` env var configures the ntfy server; missing/empty value disables notifications globally (warning logged once at startup, no errors)
- [ ] **NOTIFY-06**: Notification delivery failures are caught and logged; never block the API response
- [ ] **NOTIFY-07**: "Due-soon" trigger runs lazily when fetching assignments; no cron, no background job
- [ ] **NOTIFY-08**: Notification body contains chore summary but no user name (lock-screen privacy); tap opens `/chores/{id}` in the app

---

## v2 Requirements (Deferred)

### Money / Pocket Money

- [ ] **MONEY-01**: Parent can set a global point conversion rate (e.g. 1 pt = €0.50); points page shows equivalent value
- [ ] **MONEY-02**: Parent can configure a per-child conversion rate override if needed

### Notifications (future)

- Per-event enable/disable toggles
- Per-user `ntfyBaseUrl` override (override the global env var)
- Quiet hours (configure on ntfy mobile app side for v3.1)
- In-app notification center
- Test-from-settings button
- Per-user timezone for "due today"

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Email fallback | ntfy push is the only channel — no SMTP, no email templates |
| In-app notifications (badge/banner) | ntfy push only; family checks the app when curious |
| Notification grouping / threading | ntfy app handles this; we just send individual messages |
| Web push for iOS Safari | ntfy iOS app covers this; no Service Worker / VAPID needed |
| Slack / Discord / Microsoft Teams webhook | ntfy is the single channel; homelab, no SaaS |
| Multi-family / multi-tenant notifications | Single-family design; ntfy topic isolation is the only multi-tenant concern |
| Per-user timezone for "due today" | Server TZ is sufficient for 4-user family in one house |
| Notification templates / i18n | Single language (English), 3 fixed event types, hardcoded format |
| Delivery receipts / read tracking | ntfy doesn't expose per-message read state; not needed |
| Notification history (in-app) | ntfy app keeps the history; chore page in app shows completion state |
| Cron-based "due-soon" sweep | Lazy trigger on assignment fetch is sufficient and zero-ops |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTIFY-01 | Phase 10 — Profile UI + User topic route | Pending |
| NOTIFY-02 | Phase 11 — chore-assigned trigger | Pending |
| NOTIFY-03 | Phase 12 — chore-due-soon lazy trigger | Pending |
| NOTIFY-04 | Phase 13 — chore-completed trigger | Pending |
| NOTIFY-05 | Phase 9 — Foundation | Pending |
| NOTIFY-06 | Phase 9 — Foundation | Pending |
| NOTIFY-07 | Phase 12 — chore-due-soon lazy trigger | Pending |
| NOTIFY-08 | Phase 9 — Foundation | Pending |

**Coverage:**
- v1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

> **Note on NOTIFY-01:** The schema (`User.ntfyTopic` column + Zod validation) lands in Phase 9 — Foundation, but the user-observable "User can set their own ntfy topic in the Profile page" only becomes TRUE at the end of Phase 10. NOTIFY-01 is mapped to Phase 10 because that's where the success criterion is satisfied.

---
*Requirements defined: 2026-06-29*
*Last updated: 2026-06-29 after v3.1 roadmap created*
