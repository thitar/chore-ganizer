# Phase 10: Profile UI + User topic route - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 10-Profile UI + User topic route
**Areas discussed:** Random topic format, Parent access to kids' topics, Notifications section placement, Empty state UX

---

## Random topic format

| Option | Description | Selected |
|--------|-------------|----------|
| chore-{username}-{6chars} | e.g., `chore-alice-a1b2c3`. Matches ROADMAP example. Human-readable, identifies family context. | ✓ |
| ntfy-{username}-{6chars} | e.g., `ntfy-alice-a1b2c3`. More generic, doesn't tie to chore app. | |
| {username}-{8chars} | e.g., `alice-a1b2c3d4`. Shorter, simpler, still unique. | |

**User's choice:** chore-{username}-{6chars}
**Notes:** Matches ROADMAP example exactly.

| Option | Description | Selected |
|--------|-------------|----------|
| Alphanumeric lowercase | a-z, 0-9 (36 chars). Safe for all systems, easy to read aloud. | ✓ |
| Alphanumeric mixed case | A-Z, a-z, 0-9 (62 chars). More entropy per character, but harder to read. | |
| Hex only | 0-9, a-f (16 chars). Very familiar to developers, but less unique per char. | |

**User's choice:** Alphanumeric lowercase
**Notes:** Easy to read aloud, sufficient uniqueness for 4-user family.

| Option | Description | Selected |
|--------|-------------|----------|
| Button click | User clicks 'Generate random topic' button. Explicit control, matches ROADMAP success criteria 3. | ✓ |
| Auto-generate on load | Pre-fill with random topic when section loads with empty input. Less clicks, but might surprise users. | |

**User's choice:** Button click
**Notes:** Explicit control, matches ROADMAP.

| Option | Description | Selected |
|--------|-------------|----------|
| Backend rejects on save | Generate freely, let PUT /api/users/me/ntfy-topic return 409 if taken. Simpler, no extra API call. | ✓ |
| Frontend checks uniqueness | Call a 'check topic uniqueness' endpoint before displaying. More complex, but avoids showing a topic that will fail. | |

**User's choice:** Backend rejects on save
**Notes:** Simpler, no extra API call needed.

---

## Parent access to kids' topics

| Option | Description | Selected |
|--------|-------------|----------|
| Own topic only | Profile page shows only the logged-in user's topic. Parents set kids' topics by logging in as the kid or via a separate admin page (future phase). | |
| Parents see all topics | Profile page shows a 'Family Topics' section for parents, listing all users' topics with edit ability. More convenient for parents. | ✓ |
| Parents set kids' topics inline | Profile page shows the user's own topic, plus a 'Family' section where parents can click a child's name to edit their topic. | |

**User's choice:** Parents see all topics
**Notes:** More convenient for parents.

| Option | Description | Selected |
|--------|-------------|----------|
| Table with inline edit | Table with columns: Name, Topic, Actions (Edit). Click Edit to toggle inline editing. Compact, familiar pattern. | |
| Card per user | Each family member gets a card with their topic and edit button. More visual, but takes more space. | ✓ |
| List with expand/collapse | Accordion-style list where clicking a name expands to show topic input. Compact when collapsed. | |

**User's choice:** Card per user
**Notes:** More visual layout.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline edit | Click Edit → topic input appears in the card, Save/Cancel buttons. Simple, no modal overhead. | ✓ |
| Modal dialog | Click Edit → modal with topic input, Save/Cancel. Separates edit from view, but adds click depth. | |

**User's choice:** Inline edit
**Notes:** Simple, no modal overhead.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same button | Parents can click 'Generate random topic' when editing a child's topic, same as for their own. | ✓ |
| No, parent-only | Only the user themselves can generate a random topic. Parents must type manually. | |

**User's choice:** Yes, same button
**Notes:** Consistent experience.

---

## Notifications section placement

| Option | Description | Selected |
|--------|-------------|----------|
| After Display Color | User info → Change Password → Display Color → Notifications. Keeps personal settings grouped, notifications last as optional feature. | ✓ |
| Before Change Password | User info → Notifications → Change Password → Display Color. Highlights the new feature, but breaks personal settings grouping. | |
| After User info, before Password | User info → Notifications → Change Password → Display Color. Similar to above, but more prominent placement. | |

**User's choice:** After Display Color
**Notes:** Keeps personal settings grouped, notifications last.

| Option | Description | Selected |
|--------|-------------|----------|
| Notifications | Simple, clear. 'Notifications' section with a subtitle explaining ntfy topic. | |
| Push Notifications | More specific. 'Push Notifications' section. | ✓ |
| ntfy Topic | Technical. 'ntfy Topic' section. Direct, but assumes user knows what ntfy is. | |

**User's choice:** Push Notifications
**Notes:** More specific.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, brief help text | One sentence: 'Set your ntfy topic to receive push notifications when chores are assigned or due.' Explains purpose without overwhelming. | ✓ |
| No help text | Just the input field and buttons. Assumes user knows what ntfy topics are. | |
| Detailed help text | Multiple sentences explaining ntfy, how to install the app, etc. More helpful, but takes space. | |

**User's choice:** Yes, brief help text
**Notes:** Explains purpose without overwhelming.

---

## Empty state UX

| Option | Description | Selected |
|--------|-------------|----------|
| Empty input + Generate button | Just an empty text input field and a 'Generate random topic' button. Clean, minimal. | |
| Helper message + Generate button | A message like 'No topic set yet' with a 'Generate random topic' button. More explicit. | ✓ |
| Empty input + help text + Generate button | Empty input with placeholder text like 'e.g., chore-alice-a1b2c3', plus a Generate button. Shows expected format. | |

**User's choice:** Helper message + Generate button
**Notes:** More explicit.

| Option | Description | Selected |
|--------|-------------|----------|
| No topic set yet | Simple, neutral. 'No topic set yet.' with a Generate button below. | |
| You haven't set a notification topic | More personal. 'You haven't set a notification topic yet.' with a Generate button. | |
| Topic required for notifications | Implies requirement. 'Set a topic to receive push notifications.' with a Generate button. | ✓ |

**User's choice:** Topic required for notifications
**Notes:** Implies requirement clearly.

| Option | Description | Selected |
|--------|-------------|----------|
| Toast notification | Green toast message 'Topic saved!' that disappears after 3 seconds. Matches existing color/password success pattern. | ✓ |
| Inline success text | Green text 'Topic saved!' appears below the input. Persistent until next action. | |
| Both toast and inline | Toast for immediate feedback, inline for persistence. Most visible, but redundant. | |

**User's choice:** Toast notification
**Notes:** Matches existing pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| This topic is already in use | Clear, friendly. 'This topic is already in use. Please choose another.' Matches ROADMAP success criteria 4. | ✓ |
| Topic already taken | Short, direct. 'Topic already taken.' Less friendly, but concise. | |
| That topic is taken by another user | More specific. 'That topic is taken by another user.' Explicit about why. | |

**User's choice:** This topic is already in use
**Notes:** Clear, friendly, matches ROADMAP.

---

## the agent's Discretion

- Route location: Add `PUT /me/ntfy-topic` to existing `backend/src/routes/users.routes.ts`
- Service function: Add `updateNtfyTopic` to `backend/src/services/users.service.ts`
- Parent-only section: "Family Topics" cards only visible to users with `role: PARENT`
- API response: Return updated user object with `ntfyTopic` field on success
- Query invalidation: Invalidate `['users']` and `['auth', 'me']` queries after save

## Deferred Ideas

None — discussion stayed within phase scope.
