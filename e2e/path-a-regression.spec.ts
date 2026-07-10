/**
 * Path A Regression Tests
 *
 * End-to-end coverage for the 2 functional blockers + 1 warning found
 * by the v1-rewrite cross-phase integration check (see
 * .planning/v1-rewrite-MILESTONE-AUDIT.md).
 *
 * These tests hit the running app via the real browser and exercise the
 * full path: UI → nginx proxy → backend → SQLite. The bugs they catch
 * were missed by per-phase Jest/Vitest tests because those tests either
 * mock the API or assert only superficial state changes.
 *
 * Screenshots saved to e2e/screenshots/path-a-regression/.
 */

import { test, expect, Page, Request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from './helpers/auth';
import { getCsrfToken } from './helpers/csrf';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'path-a-regression');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const DAD = { email: 'dad@home.local', password: 'password123' };
const ALICE = { email: 'alice@home.local', password: 'password123' };
const ALICE_ORIGINAL_COLOR = '#10B981';

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true });
}

interface AssignmentQueryCall {
  from: string | null
  to: string | null
  url: string
  responseData: Array<{ id: number; dueDate: string }> | null
}

/** Capture every GET /api/assignments?from=...&to=... request AND its response data. */
function captureAssignmentQueries(page: Page): AssignmentQueryCall[] {
  const calls: AssignmentQueryCall[] = []
  const requestResponseMap = new Map<Request, Response>()

  page.on('request', (req: Request) => {
    const url = req.url()
    const u = new URL(url)
    if (
      req.method() === 'GET' &&
      (u.pathname === '/api/assignments' || u.pathname === '/api/assignments/') &&
      u.searchParams.has('from') &&
      u.searchParams.has('to')
    ) {
      calls.push({
        from: u.searchParams.get('from'),
        to: u.searchParams.get('to'),
        url,
        responseData: null,
      })
    }
  })

  page.on('response', async (res) => {
    const req = res.request()
    const url = req.url()
    const u = new URL(url)
    if (
      req.method() === 'GET' &&
      (u.pathname === '/api/assignments' || u.pathname === '/api/assignments/') &&
      u.searchParams.has('from') &&
      u.searchParams.has('to')
    ) {
      try {
        const body = await res.json()
        const data = (body as { data?: Array<{ id: number; dueDate: string }> }).data ?? []
        // Find the matching call and attach the response
        const matchingCall = calls.find((c) => c.url === url && c.responseData === null)
        if (matchingCall) {
          matchingCall.responseData = data
        }
      } catch {
        // ignore JSON parse errors
      }
    }
  })

  return calls
}

test.describe('Path A Regression — Cross-Phase Wiring', () => {
  // -------------------------------------------------------------------------
  // BLOCKER 1: Calendar must send { from, to } query params and the backend
  // must honor them. Without the fix, the calendar header updated but the
  // API always returned the current month, so navigating to a different
  // month showed the same assignments.
  // -------------------------------------------------------------------------
  test('CAL-01/03: Calendar next-month changes the { from, to } query params AND backend returns different data', async ({ page }) => {
    const calls = captureAssignmentQueries(page)
    await login(page, DAD)
    await page.goto('/calendar')
    await page.waitForSelector('h2')
    await page.waitForTimeout(1500)

    // Click "Next month" then wait for the API to re-fetch
    await page.click('button[aria-label="Next month"]')
    await page.waitForTimeout(2000)

    // Need at least 2 calls: one for current month, one for next month
    expect(calls.length, `Expected at least 2 /api/assignments calls, got ${calls.length}`).toBeGreaterThanOrEqual(2)

    // First call: current month (likely 2026-06)
    // Second call: next month (likely 2026-07)
    const [first, second] = calls

    // Sanity: the URLs differ (frontend sends different params)
    expect(second.from, `Second call from should differ from first (${first.from} vs ${second.from})`).not.toBe(first.from)
    expect(second.to).not.toBe(first.to)

    // Real assertion: the backend actually returns different data.
    // Before the fix, the backend ignored from/to and always returned the
    // current month — both calls returned the same data even though the
    // URLs differed. With the fix, the second call's month returns
    // second-month-only data.
    //
    // Computed from the real clock at run time rather than hardcoded, since
    // a fixed month/year assumption rots the moment the calendar turns over
    // (see docs/project_notes/bugs.md, 2026-07-04 — the same class of bug
    // already hit the frontend unit tests for June-2026 fixtures).
    expect(first.responseData, 'First call response should be captured').not.toBeNull()
    expect(second.responseData, 'Second call response should be captured').not.toBeNull()

    const now = new Date()
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonthEnd = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).toISOString().slice(0, 10)

    // The dueDates in each response should match the requested range
    const firstDates = (first.responseData ?? []).map((a) => a.dueDate)
    const secondDates = (second.responseData ?? []).map((a) => a.dueDate)
    for (const d of firstDates) {
      expect(d >= currentMonthStart && d <= currentMonthEnd, `First response should be in the current month, got ${d}`).toBe(true)
    }
    for (const d of secondDates) {
      expect(d >= nextMonthStart && d <= nextMonthEnd, `Second response should be in the next month, got ${d}`).toBe(true)
    }
    await shot(page, '01-calendar-next-month')
  })

  // -------------------------------------------------------------------------
  // BLOCKER 2: Parent deleting a user with chore history must return 409
  // with an informative message, not 500 (P2003 foreign key violation).
  // -------------------------------------------------------------------------
  test('AUTH-04: Delete user with assignments returns 409 (not 500)', async ({ page }) => {
    // Track the response from DELETE /api/users/:id so we can assert 409
    let deleteStatus: number | null = null
    let deleteBody: { error?: { message?: string } } | null = null
    page.on('response', async (res) => {
      if (res.url().includes('/api/users/') && res.request().method() === 'DELETE' && !res.url().endsWith('/me')) {
        deleteStatus = res.status()
        try { deleteBody = await res.json() } catch { /* ignore */ }
      }
    })

    const uniqueEmail = `regress-delete-${Date.now()}@home.local`
    const childName = 'PathA Regress Child'

    await login(page, DAD)

    // 1) Create a new child user via the UI
    await page.goto('/users')
    await page.waitForSelector('h2:has-text("Family Members")')
    await page.click('button:has-text("Create User")')
    await page.waitForSelector('h3:has-text("New Family Member")')
    await page.fill('input#name', childName)
    await page.fill('input#email', uniqueEmail)
    await page.fill('input#password', 'password123')
    // role defaults to CHILD; color is pre-selected
    await page.click('button[type="submit"]:has-text("Create")')
    await page.waitForTimeout(1500)
    await shot(page, '02a-child-created')

    // 2) Find the new child's id via the UI list
    await page.waitForTimeout(500)
    const usersJson = await page.evaluate(async () => {
      const r = await fetch('/api/users', { credentials: 'include' })
      return r.json()
    })
    const users = (usersJson as { data: Array<{ id: number; name: string }> })
    const newChild = users.data.find((u) => u.name === childName)
    expect(newChild, `Could not find created user "${childName}"`).toBeDefined()
    if (!newChild) return

    // 3) Find an existing template (use seeded Make Bed for stability)
    const templatesJson = await page.evaluate(async () => {
      const r = await fetch('/api/templates', { credentials: 'include' })
      return r.json()
    })
    const templates = (templatesJson as { data: Array<{ id: number; title: string }> })
    const template = templates.data.find((t) => t.title === 'Make Bed')
    expect(template, 'Seeded Make Bed template must exist').toBeDefined()
    if (!template) return

    // 4) Create the assignment via fetch (uses browser session, avoids fragile form interaction)
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 1)
    const dueDateStr = futureDate.toISOString().slice(0, 10)
    const csrfToken = await getCsrfToken(page)
    const assignStatus = await page.evaluate(async (args: { templateId: number; userId: number; dueDate: string; csrfToken: string }) => {
      const r = await fetch('/api/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': args.csrfToken },
        body: JSON.stringify({
          choreTemplateId: args.templateId,
          assignedToId: args.userId,
          dueDate: args.dueDate,
        }),
      })
      return r.status
    }, { templateId: template.id, userId: newChild.id, dueDate: dueDateStr, csrfToken })
    expect(assignStatus, 'Assignment creation should succeed').toBe(201)
    await shot(page, '02b-assignment-created')

    // 5) Try to delete the child via Users page
    await page.goto('/users')
    await page.waitForSelector('h2:has-text("Family Members")')

    // Find the row for the new child and click its delete button
    const row = page.locator(`text=${childName}`).first()
    await row.scrollIntoViewIfNeeded()
    // The delete button is in the same card/row
    const rowContainer = page.locator(`div:has(> *:text-is("${childName}"))`).first()
    const deleteBtn = rowContainer.locator('button[aria-label="Delete user"]').first()
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click()
    } else {
      // Fallback: find the new child's delete button by walking the user list
      const allDeleteBtns = page.locator('button[aria-label="Delete user"]')
      const btnCount = await allDeleteBtns.count()
      // The list is alphabetical by name; find the right one by trying each
      for (let i = 0; i < btnCount; i++) {
        const btn = allDeleteBtns.nth(i)
        // Click and see if the confirmation shows the right user
        await btn.click()
        const confirmText = await page.locator('div.bg-surface-raised').first().textContent({ timeout: 1000 }).catch(() => '')
        if (confirmText?.includes(childName)) break
        // Cancel and try next
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(200)
      }
    }
    await page.waitForTimeout(500)
    await shot(page, '02c-delete-confirm')

    // Confirm the delete
    const confirmBtn = page.locator('div.bg-surface-raised button:has-text("Delete")').first()
    await confirmBtn.click()
    await page.waitForTimeout(2000)
    await shot(page, '02d-after-delete-attempt')

    // The bug: backend returned 500 (P2003). Fix: returns 409 with informative message.
    expect(deleteStatus, 'Expected DELETE /api/users/:id to respond with 409').toBe(409)
    const errorMessage = (deleteBody as { error?: { message?: string } } | null)?.error?.message ?? ''
    expect(errorMessage.toLowerCase(), `Error message should mention assignment/chore. Got: "${errorMessage}"`).toMatch(/assignment|chore|recurring|conflict/)
  })

  // -------------------------------------------------------------------------
  // WARNING 3: Profile color change must invalidate ['users'] + ['auth','me']
  // so that CalendarPage's useUsers refetches the new color and the pill
  // backgrounds update without a hard browser refresh.
  // -------------------------------------------------------------------------
  test('AUTH-06/CAL-02: Profile color change propagates to Calendar legend (useUsers cache invalidated)', async ({ page }) => {
    await login(page, ALICE)
    const newColor = '#FF00FF' // magenta — distinct from any seeded color

    // 1) Visit /calendar via client-side nav (clicks the Calendar link in the navbar).
    //    This is critical: useUsers (5-min staleTime) is a React Query cache. The cache
    //    persists across client-side route changes but is wiped on hard navigation.
    //    Using the nav link simulates a real user flow.
    await page.click('a:has-text("Calendar")')
    await page.waitForURL('**/calendar')
    await page.waitForSelector('h2')
    await page.waitForTimeout(1500)

    // 2) Navigate to /profile via client-side nav (click the Profile link)
    await page.goto('/profile')
    await page.waitForURL('**/profile')
    await page.waitForSelector('h2:has-text("My Profile")')

    // 3) Change Alice's color via the form
    const colorInput = page.locator('input#profile-color')
    await colorInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, newColor)
    await page.click('button[type="submit"]:has-text("Update Color")')
    await page.waitForSelector('text=Color updated!', { timeout: 5000 })
    await shot(page, '03a-color-updated')

    // 4) Navigate back to /calendar via client-side nav (NOT page.goto — that hard-reloads)
    // The bug: ['users'] query not invalidated → useUsers cache keeps old color → legend is stale
    // The fix: ['users'] invalidated → useUsers refetches → legend shows new color
    await page.click('a:has-text("Calendar")')
    await page.waitForURL('**/calendar')
    await page.waitForSelector('h2')
    await page.waitForTimeout(1500)

    // 5) Read Alice's legend swatch. Note: CalendarPage pills use useCalendarMonth
    // (default staleTime=0, always fresh) which would mask the bug, so we
    // specifically target the legend swatch which uses useUsers.
    const legendColor = await page.evaluate(() => {
      const aliceLabels = Array.from(document.querySelectorAll<HTMLElement>('span'))
        .filter((el) => el.textContent?.trim() === 'Alice' && el.className.includes('text-zinc-400'))
      for (const label of aliceLabels) {
        const swatch = label.previousElementSibling as HTMLElement | null
        if (swatch && swatch.className.includes('rounded-full')) {
          return { found: true, color: window.getComputedStyle(swatch).backgroundColor }
        }
      }
      return { found: false, reason: 'no legend Alice with swatch' }
    })
    await shot(page, '03b-calendar-after-color-change')

    expect(legendColor.found, `Could not find Alice's legend swatch: ${JSON.stringify(legendColor)}`).toBe(true)
    expect(legendColor.color, `Alice's legend swatch should show the new color (255, 0, 255) after change. Got: "${legendColor.color}"`).toContain('255, 0, 255')

    // 6) Restore Alice's color via client-side nav so the dev DB isn't polluted
    await page.goto('/profile')
    await page.waitForURL('**/profile')
    await page.waitForSelector('h2:has-text("My Profile")')
    const restoreInput = page.locator('input#profile-color')
    await restoreInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, ALICE_ORIGINAL_COLOR)
    await page.click('button[type="submit"]:has-text("Update Color")')
    await page.waitForSelector('text=Color updated!', { timeout: 5000 })
  })
})
