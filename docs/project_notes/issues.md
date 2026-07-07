# Work Log

Date-ordered log of completed work and in-progress tickets.

## Tips

- Keep descriptions brief (1-2 lines max)
- Always include ticket URL for easy reference
- Update status if work gets blocked or resumed
- Don't duplicate ticket details — link to source of truth
- Clean out very old entries periodically (3+ months)

---

### 2026-07-07 — M1 The Look shipped: PR #142 merged as v2.2.0

- **Status**: Completed
- **Description**: PR #142 squash-merged to main (a4f5b49) after multi-round review. Final review round migrated pages to shared dateFormat util, added aria-expanded/haspopup to BottomTabBar Manage button. Phase 13 complete; Phase 14 (M2 The Game) awaits kid feedback before detailed planning.
- **URL**: https://github.com/thitar/chore-ganizer/pull/142

### 2026-07-05 — M1 The Look — dark redesign + frontend gamification, all pages

- **Status**: Completed
- **Description**: Task 15 cleanup: removed legacy NavBar.tsx and its test, migrated ProtectedRoute.tsx from primary to accent colors, removed legacy primary alias from tailwind.config.js. All frontend (98) and backend (213) tests pass. Build clean.

### 2026-07-04 - v3.1.0 Notifications Milestone: Merge & Verify

- **Status**: Completed
- **Description**: Merged all 4 notification phases (9-12) into main. Resolved 9 merge-conflict files across notification.service, assignment.service, config, tests, and planning docs. Fixed test pollution bug from jest.resetModules.

### 2026-07-03 — Phase 12: Due-Soon Lazy Trigger

- **Status**: Completed
- **Description**: Implemented notifyDueSoon sweep that piggybacks on GET /api/assignments. Conditional prisma.$transaction update prevents concurrent double-fire. sendNtfy returns Promise<boolean>.

### 2026-07-02 — Phase 11: Chore-Assigned Trigger

- **Status**: Completed
- **Description**: Wired notifyChoreAssigned into assignment.service.create. Recipient receives push when chore is assigned to them. Fire-and-forget via void.

### 2026-07-01 — Phase 10: Profile UI + User Topic Route

- **Status**: Completed
- **Description**: Added PUT /api/users/me/ntfy-topic route with Zod validation. Profile page "Notifications" section with topic input and "Generate random topic" helper. Gap closure for navbar link and empty state.

### 2026-06-29 — Phase 9: Notification Foundation

- **Status**: Completed
- **Description**: notification.service.ts, config/notifications.ts, Prisma migration (User.ntfyTopic, dueNotifiedAt fields). Formatters with body/Click helpers. Graceful noop when NTFY_BASE_URL unset.
