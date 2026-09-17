# ntfy Direct Chore Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ntfy push notifications open the relevant chore (or profile page) when tapped, by turning the already-built relative `click` paths into absolute URLs using `FRONTEND_URL`.

**Architecture:** `backend/src/services/notification.formatters.ts` already returns a `click: '/chores/${id}'` (or `/profile`) field on every formatted notification, and `sendNtfy()` in `backend/src/services/notification.service.ts` already forwards `opts.click` into the ntfy `Click` header — but it sends the raw relative path, which ntfy's Click header requires to be an absolute URL to be useful from a push notification. This plan adds one pure helper that prefixes the existing relative path with `process.env.FRONTEND_URL` (the same env var already used for password-reset links in `auth.service.ts`), and adds a startup warning mirroring the existing SMTP+FRONTEND_URL check in `app.ts`.

**Tech Stack:** Node/Express backend, Jest tests, no frontend changes, no schema changes.

## Global Constraints

- Bump `APP_VERSION` to `3.8.0` in `backend/package.json`, `frontend/package.json`, `.env`, `.env.example` per `docs/VERSION_MAP.md` — see Task 3.
- Do not change the relative `click` values already returned by `notification.formatters.ts` — only how `sendNtfy` turns them into a header.
- Do not spam warnings per-notification; the missing-`FRONTEND_URL` case must warn once at startup, matching the existing SMTP pattern in `backend/src/app.ts:62-68`.
- Run backend tests with cwd `backend/` only (see root `AGENTS.md` — running Jest from repo root collects frontend/Playwright specs too).

---

### Task 1: Absolute Click URL Helper in `notification.service.ts`

**Files:**
- Modify: `backend/src/services/notification.service.ts`
- Test: `backend/src/__tests__/services/notification.service.test.ts`

**Interfaces:**
- Consumes: nothing new — reads `process.env.FRONTEND_URL` directly, same convention as `backend/src/services/auth.service.ts:51`.
- Produces: `sendNtfy()`'s existing signature and behavior are unchanged except the `Click` header value/presence. No new exports.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/__tests__/services/notification.service.test.ts`, inside the existing `describe('sendNtfy', ...)` block (after the existing tests, before its closing `})`):

```ts
    it('sends an absolute Click header when FRONTEND_URL is set', async () => {
      const original = process.env.FRONTEND_URL
      process.env.FRONTEND_URL = 'https://chore.example.com'
      try {
        await sendNtfy('topic', 'Title', 'body', { click: '/chores/42' })
        const callArgs = (global.fetch as jest.Mock).mock.calls[0]
        expect(callArgs[1].headers.Click).toBe('https://chore.example.com/chores/42')
      } finally {
        process.env.FRONTEND_URL = original
      }
    })

    it('strips a trailing slash from FRONTEND_URL before joining the path', async () => {
      const original = process.env.FRONTEND_URL
      process.env.FRONTEND_URL = 'https://chore.example.com/'
      try {
        await sendNtfy('topic', 'Title', 'body', { click: '/profile' })
        const callArgs = (global.fetch as jest.Mock).mock.calls[0]
        expect(callArgs[1].headers.Click).toBe('https://chore.example.com/profile')
      } finally {
        process.env.FRONTEND_URL = original
      }
    })

    it('omits the Click header when FRONTEND_URL is not set', async () => {
      const original = process.env.FRONTEND_URL
      delete process.env.FRONTEND_URL
      try {
        await sendNtfy('topic', 'Title', 'body', { click: '/chores/42' })
        const callArgs = (global.fetch as jest.Mock).mock.calls[0]
        expect(callArgs[1].headers.Click).toBeUndefined()
      } finally {
        process.env.FRONTEND_URL = original
      }
    })

    it('omits the Click header when no click path was given', async () => {
      const original = process.env.FRONTEND_URL
      process.env.FRONTEND_URL = 'https://chore.example.com'
      try {
        await sendNtfy('topic', 'Title', 'body')
        const callArgs = (global.fetch as jest.Mock).mock.calls[0]
        expect(callArgs[1].headers.Click).toBeUndefined()
      } finally {
        process.env.FRONTEND_URL = original
      }
    })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `npx jest src/__tests__/services/notification.service.test.ts -t "Click header" -t "click path"`
Expected: the four new tests FAIL — today `Click` is always set to the raw relative path (e.g. `/chores/42`) whenever `opts.click` is given, regardless of `FRONTEND_URL`.

- [ ] **Step 3: Implement the helper and wire it into `sendNtfy`**

In `backend/src/services/notification.service.ts`, add a helper above `sendNtfy` and use it when building `headers`:

```ts
function absoluteClickUrl(path: string): string | null {
  const frontendUrl = (process.env.FRONTEND_URL ?? '').trim()
  if (!frontendUrl) return null
  return `${frontendUrl.replace(/\/+$/, '')}${path}`
}
```

Replace this existing line:

```ts
  if (opts.click) headers['Click'] = opts.click
```

with:

```ts
  if (opts.click) {
    const clickUrl = absoluteClickUrl(opts.click)
    if (clickUrl) headers['Click'] = clickUrl
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `backend/`): `npx jest src/__tests__/services/notification.service.test.ts`
Expected: PASS, including all pre-existing tests in the file (the earlier tests in the file don't set `opts.click`, so they're unaffected).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/notification.service.ts backend/src/__tests__/services/notification.service.test.ts
git commit -m "feat: absolute ntfy Click links via FRONTEND_URL"
```

---

### Task 2: Startup Warning When ntfy Is Configured Without `FRONTEND_URL`

**Files:**
- Modify: `backend/src/app.ts:10,62-69`

**Interfaces:**
- Consumes: `isNtfyConfigured` — already exported from `backend/src/config/notifications.ts` (re-exported by `notification.service.ts`, but `app.ts` should import it directly from `../config/notifications` to avoid pulling in the whole notification service).
- Produces: nothing new — this is a startup-time `console.warn`/`console.log`, not testable behavior (mirrors the existing untested SMTP+`FRONTEND_URL` branches directly above it).

- [ ] **Step 1: Add the import**

In `backend/src/app.ts`, next to the existing `import { isSmtpConfigured } from './config/smtp'` (line 10), add:

```ts
import { isNtfyConfigured } from './config/notifications'
```

- [ ] **Step 2: Extend the existing `FRONTEND_URL` check block**

In `backend/src/app.ts`, the existing block (lines 62-69) reads:

```ts
const frontendUrl = process.env.FRONTEND_URL ?? ''
if (isSmtpConfigured && !frontendUrl) {
  console.warn('[config] SMTP is configured but FRONTEND_URL is not set — password reset links in emails will be broken')
} else if (isSmtpConfigured && frontendUrl) {
  console.log(`[smtp] Password recovery enabled — reset links will point to ${frontendUrl}`)
} else if (!frontendUrl) {
  console.warn('[config] FRONTEND_URL not set — password reset links will be broken if SMTP is enabled')
}
```

Add a second, independent check right after it (ntfy and SMTP are unrelated features, so this must not be an `else if` off the SMTP branches):

```ts
if (isNtfyConfigured && !frontendUrl) {
  console.warn('[config] ntfy is configured but FRONTEND_URL is not set — push notifications will not link directly to chores')
} else if (isNtfyConfigured && frontendUrl) {
  console.log(`[ntfy] Notification click-through enabled — links will point to ${frontendUrl}`)
}
```

- [ ] **Step 3: Verify the app still boots cleanly**

Run (from `backend/`): `npx jest src/__tests__/app.test.ts`
Expected: PASS — this file only asserts on `SESSION_SECRET`/`SAMESITE_POLICY` throw behavior, unaffected by the new `console.warn`/`console.log` calls.

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat: warn at startup when ntfy is enabled without FRONTEND_URL"
```

---

### Task 3: Version Bump, Env Docs, Changelog

**Files:**
- Modify: `backend/package.json`, `frontend/package.json`, `.env`, `.env.example`, `CHANGELOG.md`
- Modify: `backend/package-lock.json`, `frontend/package-lock.json` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks — this task is self-contained per the Global Constraints version-bump rule.

- [ ] **Step 1: Bump versions**

Edit `"version": "3.7.0"` to `"version": "3.8.0"` in both `backend/package.json` and `frontend/package.json`.

- [ ] **Step 2: Update env files**

In `.env.example`, change `APP_VERSION=3.7.0` to `APP_VERSION=3.8.0`. Also extend the existing `FRONTEND_URL` comment block (around line 144) to mention its new use:

```
# Frontend URL used in password reset email links and ntfy notification
# Click-through links (tapping a push notification opens the chore directly)
# FRONTEND_URL=https://chore.thitar.ovh
```

Apply the same `APP_VERSION` change to `.env` if it exists locally and contains an `APP_VERSION=` line (it's gitignored, so this step is a no-op in a fresh clone/CI — only relevant if a local `.env` is present).

- [ ] **Step 3: Regenerate lockfiles**

```bash
rm -f backend/package-lock.json && cd backend && npm install && cd ..
rm -f frontend/package-lock.json && cd frontend && npm install && cd ..
```

Do not hand-edit the lockfiles with `sed` — per `docs/VERSION_MAP.md`, that corrupts transitive dependency versions.

- [ ] **Step 4: Add CHANGELOG entry**

In `CHANGELOG.md`, insert above the existing `## [3.7.0] - 2026-08-31` heading:

```markdown
## [3.8.0] - 2026-09-17

### Added
- ntfy push notifications now include an absolute `Click` URL (`FRONTEND_URL` + the existing relative path from `notification.formatters.ts`, e.g. `/chores/42`), so tapping a notification opens the chore directly instead of just opening the app. Startup now warns once (`backend/src/app.ts`) if ntfy is configured but `FRONTEND_URL` is unset, mirroring the existing SMTP+`FRONTEND_URL` warning. When `FRONTEND_URL` is unset, the `Click` header is omitted entirely rather than sending a broken relative URL.
```

- [ ] **Step 5: Run the full backend suite**

Run (from `backend/`, after the DB bootstrap in root `AGENTS.md` if not already done this session):

```bash
npm test
```

Expected: PASS, same count as before plus the 4 new `notification.service.test.ts` cases.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json frontend/package.json backend/package-lock.json frontend/package-lock.json .env.example CHANGELOG.md
git commit -m "chore: bump APP_VERSION to 3.8.0 for ntfy click links"
```

If a local `.env` was also updated in Step 2, `git status` will show it as untracked/ignored — do not add it (it's gitignored by design).

---

## Self-Review Notes

- **Spec coverage:** the backlog item was "ntfy notifications should have direct links to the chores (Click URL per notification)" — Task 1 delivers exactly this for all five formatters (`assignedBody`, `dueSoonBody`, `badgeEarnedBody`, `completedBody`, `overdueBody`, `nudgeBody` — all already emit `click`), Task 2 makes the missing-config case observable, Task 3 satisfies the mandatory version bump.
- **No frontend changes needed:** `click` was already threaded end-to-end; only the backend's header-building step was incomplete.
- **Type consistency:** `absoluteClickUrl` returns `string | null`, matching the `if (clickUrl) headers['Click'] = clickUrl` guard in Task 1 Step 3.
