# Phase 10: Profile UI + User topic route - Research

**Researched:** 2026-06-29
**Domain:** React frontend + Express.js backend for user profile ntfy topic management
**Confidence:** HIGH

## Summary

This phase adds a "Push Notifications" section to the Profile page where users can set, change, or clear their ntfy topic. The backend needs a new `PUT /me/ntfy-topic` route following existing patterns (`updateColor`, `updatePassword`). The frontend needs inline edit forms for the user's own topic and family member cards for parents. All patterns are well-established in the codebase — no new libraries needed.

**Primary recommendation:** Follow existing `updateColor` pattern exactly — service validates format with Zod, checks uniqueness, throws AppError 409 if taken. Frontend uses React Query cache invalidation after mutation success.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Generated topic format: `chore-{username}-{6chars}` (e.g., `chore-alice-a1b2c3`). Matches ROADMAP example.
- **D-02:** Random suffix uses alphanumeric lowercase (a-z, 0-9) — 36 chars, easy to read aloud.
- **D-03:** Generation triggered by button click ("Generate random topic"), not auto-generated on page load.
- **D-04:** No frontend uniqueness check — generate freely, let backend return 409 Conflict if topic is already taken.
- **D-05:** Parents see all family members' topics on the Profile page (not just their own).
- **D-06:** Family topics displayed as cards — one card per user with topic display and Edit button.
- **D-07:** Edit flow is inline — clicking Edit reveals topic input in the card with Save/Cancel buttons.
- **D-08:** "Generate random topic" button available when editing a child's topic (same as for own topic).
- **D-09:** Notifications section placed after Display Color (User info → Change Password → Display Color → Push Notifications).
- **D-10:** Section title: "Push Notifications" with brief help text: "Set your ntfy topic to receive push notifications when chores are assigned or due."
- **D-11:** Empty state shows helper message "Topic required for notifications" with a "Generate random topic" button.
- **D-12:** Success feedback: green toast notification "Topic saved!" that disappears after 3 seconds (matches existing color/password pattern).
- **D-13:** 409 Conflict error message: "This topic is already in use. Please choose another."

### the agent's Discretion
- **Route location:** Add `PUT /me/ntfy-topic` to existing `backend/src/routes/users.routes.ts` (follows pattern of `PUT /me/password` and `PUT /me/color`).
- **Service function:** Add `updateNtfyTopic` to `backend/src/services/users.service.ts` (follows `updateColor` pattern).
- **Parent-only section:** "Family Topics" cards only visible to users with `role: PARENT` (check `user.role` in ProfilePage component).
- **API response:** Return updated user object with `ntfyTopic` field on success.
- **Query invalidation:** After saving, invalidate `['users']` and `['auth', 'me']` queries (matches `updateColor` pattern).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIFY-01 | User can set their own ntfy topic in the Profile page; topic must be 12-64 chars `[A-Za-z0-9_-]` and unique across users | Backend: Zod validation regex + uniqueness check in service. Frontend: inline edit form with topic input, "Generate random" button, save/cancel flow. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Topic format validation | API/Backend | — | Zod schema validates 12-64 char regex before DB write |
| Topic uniqueness check | API/Backend | Database | Service checks via Prisma query, DB has @unique constraint |
| Topic persistence | Database | API/Backend | User.ntfyTopic column stores the value |
| Profile UI (own topic) | Browser/Client | — | React component with inline edit form |
| Family topics cards | Browser/Client | — | Parent-only section renders cards per family member |
| Random topic generation | Browser/Client | — | Client-side string generation, no API call needed |
| Cache invalidation | Browser/Client | API/Backend | React Query invalidates ['users'] and ['auth', 'me'] after mutation |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Query | 5.x | Data fetching, cache invalidation | Already in use, established pattern |
| Zod | 3.x | Request body validation | Already in use for schemas |
| Express.js | 4.x | HTTP routing | Already in use |
| Prisma | 5.x | ORM, database queries | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | Styling | Already in use for all UI |
| Axios | 1.x | HTTP client | Already in use for API calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Query invalidation | Optimistic updates with setQueryData | More complex, risk of divergence; invalidation is simpler and matches existing pattern |
| Inline edit form | Modal dialog | Heavier UX, more state management; inline matches CONTEXT.md decisions |
| Client-side random generation | API endpoint | Unnecessary network call; generation is trivial string operation |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Package Legitimacy Audit

> No external packages are installed in this phase. All dependencies (React Query, Zod, Express, Prisma, Tailwind, Axios) are already in use.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| N/A | — | — | — | — | — | No new packages |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Profile Page                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  User Info    │  │   Password   │  │  Display Color       │  │
│  │  (read-only)  │  │   (form)     │  │  (color picker)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Push Notifications (NEW)                                │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Own Topic Section                                 │  │  │
│  │  │  - View: topic display or empty state              │  │  │
│  │  │  - Edit: input + Generate Random + Save/Cancel     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Family Topics (PARENT only)                       │  │  │
│  │  │  - Card per family member                          │  │  │
│  │  │  - Each card: name, topic, Edit button             │  │  │
│  │  │  - Edit mode: inline input + Save/Cancel           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ PUT /api/users/me/ntfy-topic
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Express.js Backend                          │
│  users.routes.ts: PUT /me/ntfy-topic                           │
│       │                                                         │
│       ▼                                                         │
│  users.service.ts: updateNtfyTopic(userId, topic)               │
│       │                                                         │
│       ├─ Zod validation: 12-64 chars [A-Za-z0-9_-]             │
│       ├─ Uniqueness check: prisma.user.findFirst()              │
│       └─ Update: prisma.user.update()                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SQLite Database                             │
│  User.ntfyTopic String? @unique                                │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
backend/src/
├── routes/users.routes.ts          # Add PUT /me/ntfy-topic
├── services/users.service.ts       # Add updateNtfyTopic function
├── schemas/user.schema.ts          # Add ntfyTopicSchema (Zod)
└── __tests__/services/users.service.test.ts  # Add updateNtfyTopic tests

frontend/src/
├── pages/ProfilePage.tsx           # Add Push Notifications section
├── api/users.api.ts                # Add updateNtfyTopic function
└── hooks/useUsers.tsx              # No changes needed (already fetches user data)
```

### Pattern 1: Backend Route + Service Pattern
**What:** Add new route following existing `PUT /me/color` pattern
**When to use:** For any new user profile field update
**Example:**
```typescript
// Source: backend/src/routes/users.routes.ts:47-55 (existing pattern)
router.put('/me/color', authenticate, async (req, res, next) => {
  try {
    const { color } = req.body
    const user = await usersService.updateColor(req.session.userId!, color)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})

// NEW: PUT /me/ntfy-topic follows same pattern
router.put('/me/ntfy-topic', authenticate, async (req, res, next) => {
  try {
    const { ntfyTopic } = req.body
    const user = await usersService.updateNtfyTopic(req.session.userId!, ntfyTopic)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})
```

### Pattern 2: Service Validation + Uniqueness Check
**What:** Validate format with Zod, check uniqueness in service layer
**When to use:** For any field with unique constraint
**Example:**
```typescript
// Source: backend/src/services/users.service.ts:110-119 (updateColor pattern)
export async function updateColor(userId: number, color: string) {
  if (!HEX_REGEX.test(color)) {
    throw new AppError('Color must be a valid hex code (#RRGGBB)', 400)
  }
  return prisma.user.update({
    where: { id: userId },
    data: { color },
    select: { id: true, name: true, email: true, role: true, color: true },
  })
}

// NEW: updateNtfyTopic follows same pattern with uniqueness check
const NTFY_TOPIC_REGEX = /^[-_A-Za-z0-9]{12,64}$/

export async function updateNtfyTopic(userId: number, ntfyTopic: string | null) {
  // Allow clearing topic
  if (ntfyTopic === null || ntfyTopic === '') {
    return prisma.user.update({
      where: { id: userId },
      data: { ntfyTopic: null },
      select: { id: true, name: true, email: true, role: true, color: true, ntfyTopic: true },
    })
  }
  
  // Validate format
  if (!NTFY_TOPIC_REGEX.test(ntfyTopic)) {
    throw new AppError('Topic must be 12-64 characters (letters, numbers, hyphens, underscores)', 400)
  }
  
  // Check uniqueness (exclude current user)
  const existing = await prisma.user.findFirst({
    where: { ntfyTopic, id: { not: userId } },
  })
  if (existing) {
    throw new AppError('This topic is already in use. Please choose another.', 409)
  }
  
  return prisma.user.update({
    where: { id: userId },
    data: { ntfyTopic },
    select: { id: true, name: true, email: true, role: true, color: true, ntfyTopic: true },
  })
}
```

### Pattern 3: Frontend Inline Edit with React Query
**What:** Toggle between view/edit mode, invalidate cache after save
**When to use:** For any profile field with inline editing
**Example:**
```typescript
// Source: frontend/src/pages/ProfilePage.tsx:74-88 (handleColorChange pattern)
async function handleColorChange(e: React.FormEvent) {
  e.preventDefault()
  setColorError(null)
  setIsUpdatingColor(true)
  try {
    await usersApi.updateColor(color)
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    setColorSuccess('Color updated!')
  } catch (err: any) {
    setColorError(err?.response?.data?.error?.message ?? 'Failed to update color.')
  } finally {
    setIsUpdatingColor(false)
  }
}

// NEW: handleNtfyTopicSave follows same pattern
async function handleNtfyTopicSave(userId: number, topic: string | null) {
  setTopicError(null)
  setIsUpdatingTopic(true)
  try {
    await usersApi.updateNtfyTopic(topic)
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    setTopicSuccess('Topic saved!')
  } catch (err: any) {
    setTopicError(err?.response?.data?.error?.message ?? 'Failed to update topic.')
  } finally {
    setIsUpdatingTopic(false)
  }
}
```

### Pattern 4: Random Topic Generation
**What:** Generate `chore-{username}-{6chars}` format
**When to use:** When user clicks "Generate random topic" button
**Example:**
```typescript
// Source: CONTEXT.md D-01, D-02
function generateRandomTopic(username: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `chore-${username.toLowerCase()}-${suffix}`
}
```

### Anti-Patterns to Avoid
- **Global cache invalidation:** Don't call `queryClient.invalidateQueries()` without query key — causes unnecessary refetches of unrelated data
- **Missing error handling:** Always catch 409 Conflict and display friendly message per D-13
- **Skipping uniqueness check:** Don't rely solely on DB @unique — check in service layer for better error messages
- **Modal dialogs for inline edit:** Per D-07, use inline edit flow, not modals
- **Auto-generating topic on page load:** Per D-03, only generate on button click

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request validation | Custom validation logic | Zod schema | Handles regex, min/max, type safety |
| Cache invalidation | Manual state updates | React Query invalidateQueries | Automatic refetching, stale management |
| HTTP client | fetch() wrapper | Axios | Already in use, interceptors for CSRF |
| Unique field checking | Raw SQL queries | Prisma findFirst | Type-safe, handles SQL injection |
| Toast notifications | Custom alert system | Existing toast pattern (green box, 3s timeout) | Matches color/password success pattern |

**Key insight:** This phase adds zero new patterns — it extends existing `updateColor` pattern to a new field. The complexity is in the UI (inline edit, family cards), not the backend.

## Common Pitfalls

### Pitfall 1: Forgetting to invalidate both query keys
**What goes wrong:** User saves topic but Profile page shows old value, or other pages show stale user data
**Why it happens:** Only invalidating `['users']` or only `['auth', 'me']`
**How to avoid:** Always invalidate both `['users']` AND `['auth', 'me']` after ntfyTopic update (matches `updateColor` pattern)
**Warning signs:** Topic saves but UI doesn't update until page refresh

### Pitfall 2: Not handling empty string vs null
**What goes wrong:** User clears topic but backend stores empty string instead of null
**Why it happens:** Frontend sends `''` but backend expects `null` for "no topic"
**How to avoid:** Frontend converts empty string to `null` before API call; backend accepts both `null` and `''` and normalizes to `null`
**Warning signs:** Notifications still fire for users who "cleared" their topic

### Pitfall 3: Race condition on uniqueness check
**What goes wrong:** Two users save same topic simultaneously, one gets DB error instead of friendly 409
**Why it happens:** Uniqueness check passes but DB @unique constraint fails before service returns
**How to avoid:** Catch Prisma `UniqueConstraintError` and throw AppError 409 (belt and suspenders)
**Warning signs:** Unhandled Prisma error in logs, generic 500 response to user

### Pitfall 4: Parent seeing own topic in family cards
**What goes wrong:** Parent's own topic appears twice — once in "Push Notifications" section, once in "Family Topics" cards
**Why it happens:** Family cards loop includes current user
**How to avoid:** Filter out current user from family cards array: `users.filter(u => u.id !== user.id)`
**Warning signs:** Duplicate topic display for parent users

### Pitfall 5: Missing ntfyTopic in user select queries
**What goes wrong:** User data fetched without ntfyTopic field, topic input always empty
**Why it happens:** Existing `getAll()` select doesn't include ntfyTopic
**How to avoid:** Add `ntfyTopic` to select in `getAll()` and `updateNtfyTopic` return
**Warning signs:** Topic input never shows saved value

## Code Examples

Verified patterns from existing codebase:

### Backend Route Pattern
```typescript
// Source: backend/src/routes/users.routes.ts:47-55
router.put('/me/color', authenticate, async (req, res, next) => {
  try {
    const { color } = req.body
    const user = await usersService.updateColor(req.session.userId!, color)
    res.json({ success: true, data: user, error: null })
  } catch (err) {
    next(err)
  }
})
```

### Backend Service Pattern
```typescript
// Source: backend/src/services/users.service.ts:110-119
export async function updateColor(userId: number, color: string) {
  if (!HEX_REGEX.test(color)) {
    throw new AppError('Color must be a valid hex code (#RRGGBB)', 400)
  }
  return prisma.user.update({
    where: { id: userId },
    data: { color },
    select: { id: true, name: true, email: true, role: true, color: true },
  })
}
```

### Frontend API Client Pattern
```typescript
// Source: frontend/src/api/users.api.ts:45-48
export async function updateColor(color: string): Promise<UserWithEmail> {
  const response = await api.put('/me/color', { color })
  return response.data.data
}
```

### Frontend Cache Invalidation Pattern
```typescript
// Source: frontend/src/pages/ProfilePage.tsx:74-88
await usersApi.updateColor(color)
queryClient.invalidateQueries({ queryKey: ['users'] })
queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
setColorSuccess('Color updated!')
```

### Test Pattern
```typescript
// Source: backend/src/__tests__/services/users.service.test.ts:183-199
describe('usersService.updateColor', () => {
  it('updates color', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, color: '#FF0000' })
    const result = await usersService.updateColor(1, '#FF0000')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { color: '#FF0000' },
      select: { id: true, name: true, email: true, role: true, color: true },
    })
    expect(result.color).toBe('#FF0000')
  })

  it('throws 400 on invalid hex', async () => {
    await expect(usersService.updateColor(1, 'red')).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | N/A | N/A | N/A |

**Deprecated/outdated:**
- None — this phase extends existing patterns

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this
> section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | User.ntfyTopic field already exists in schema from Phase 9 | Architecture Patterns | LOW — verified in schema.prisma line 17 |
| A2 | Existing toast pattern uses green box with 3s timeout | Common Pitfalls | LOW — verified in ProfilePage.tsx lines 157-166 |
| A3 | `getAll()` needs ntfyTopic added to select | Common Pitfalls | MEDIUM — if not added, topic input always empty |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should we add ntfyTopic to the UserSummary interface in users.api.ts?**
   - What we know: Current `UserSummary` doesn't include ntfyTopic
   - What's unclear: Whether family cards need ntfyTopic in the users list or fetch separately
   - Recommendation: Add ntfyTopic to `UserSummary` since `getAll()` will return it — minimal change, enables family cards

2. **Should the "Generate random topic" button be disabled while saving?**
   - What we know: Button triggers topic generation, not save
   - What's unclear: UX preference — generate while save is in progress
   - Recommendation: Keep enabled — generation is instant, no network call; disable only the Save button during mutation

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend dev server | ✓ | 20.20.0 | — |
| npm | Package management | ✓ | 11.13.0 | — |
| Python | Not required | ✓ | 3.13.5 | — |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (backend) + Vitest (frontend) |
| Config file | `backend/jest.config.ts`, `frontend/vitest.config.ts` |
| Quick run command | `npm test` (in backend or frontend directory) |
| Full suite command | `npm test` (in both directories) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIFY-01 | Topic format validation (12-64 chars regex) | unit | `npm test -- --testNamePattern="updateNtfyTopic"` | ❌ Wave 0 |
| NOTIFY-01 | Topic uniqueness check (409 Conflict) | unit | `npm test -- --testNamePattern="updateNtfyTopic"` | ❌ Wave 0 |
| NOTIFY-01 | Topic clear (null on empty string) | unit | `npm test -- --testNamePattern="updateNtfyTopic"` | ❌ Wave 0 |
| NOTIFY-01 | Frontend inline edit form | manual | Visual verification | N/A |
| NOTIFY-01 | Random topic generation | manual | Visual verification | N/A |
| NOTIFY-01 | Family topics cards (parent only) | manual | Visual verification | N/A |

### Sampling Rate
- **Per task commit:** `npm test` in backend directory
- **Per wave merge:** `npm test` in both backend and frontend directories
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/__tests__/services/users.service.test.ts` — add `updateNtfyTopic` tests
- [ ] `backend/src/schemas/user.schema.ts` — create if needed for ntfyTopic validation (or inline in service)
- [ ] Frontend tests — manual verification only (UI changes)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Express sessions (already in place) |
| V3 Session Management | yes | Session cookie (already in place) |
| V4 Access Control | yes | `authenticate` middleware on route |
| V5 Input Validation | yes | Zod schema validates 12-64 char regex |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Topic impersonation | Spoofing | 12-char minimum makes brute force impractical |
| Topic enumeration | Information Disclosure | 409 error doesn't reveal which user has the topic |
| XSS via topic input | Tampering | Zod validation rejects special chars, React escapes output |

## Sources

### Primary (HIGH confidence)
- Existing codebase: `backend/src/routes/users.routes.ts`, `backend/src/services/users.service.ts`, `frontend/src/pages/ProfilePage.tsx`
- TanStack Query v5 docs: invalidation-from-mutations pattern
- Prisma schema: `User.ntfyTopic @unique` constraint

### Secondary (MEDIUM confidence)
- WebSearch: React inline edit patterns, card-based UI with edit mode
- WebSearch: Zod validation for unique fields (service layer check pattern)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries already in use, versions confirmed in package.json
- Architecture: HIGH — follows exact `updateColor` pattern, no new patterns needed
- Pitfalls: MEDIUM — common issues identified from web search and codebase analysis

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days — stable stack, minimal external dependencies)
