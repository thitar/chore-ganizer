/**
 * Phase 5 E2E — Happy path for CHORE-07 + PTS-01
 *
 * Verifies the complete data flow: parent creates a chore assignment for
 * a child, child marks it complete, and the child's point balance
 * increases by the template's point value. This test fills the gap
 * flagged in the v1-rewrite milestone audit: there was no E2E that
 * walked the full "complete a chore → points awarded" loop end-to-end
 * through the browser.
 */

import { test, expect, Page } from '@playwright/test'
import { login } from './helpers/auth'
import { getCsrfToken } from './helpers/csrf'

const SCREENSHOTS_DIR = require('path').join(__dirname, 'screenshots', 'phase-05-points')
const fs = require('fs')
const path = require('path')
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const DAD = { email: 'dad@home.local', password: 'password123' }
const ALICE = { email: 'alice@home.local', password: 'password123' }
const PARENT_POINTS = 5
const ASSIGNMENT_POINTS = 7

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true })
}

test.describe('Phase 5 E2E — CHORE-07 + PTS-01 happy path', () => {
  test('Completing a chore assignment awards the template points to the assignee', async ({ page }) => {
    // Capture Alice's current balance via API
    await login(page, DAD)
    const balanceBefore = await page.evaluate(async () => {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' })
      const me = await meRes.json()
      // Get Alice's id from the users list
      const usersRes = await fetch('/api/users', { credentials: 'include' })
      const users = (await usersRes.json()).data as Array<{ id: number; name: string }>
      const alice = users.find((u) => u.name === 'Alice')
      const balanceRes = await fetch(`/api/points/users/${alice!.id}`, { credentials: 'include' })
      const balance = (await balanceRes.json()).data as { balance: number; logs: Array<{ amount: number; type: string; reason: string }> }
      return balance
    })
    const aliceBalanceBefore = balanceBefore.balance
    const aliceEarnedLogsBefore = balanceBefore.logs.filter((l) => l.type === 'EARNED' && l.reason.includes('Phase05')).length

    // Create a template with a unique title and the points value
    const uniqueTitle = `Phase05 E2E Chore ${Date.now()}`
    const csrfToken1 = await getCsrfToken(page)
    const createTpl = await page.evaluate(async (args: { title: string; points: number; csrfToken: string }) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': args.csrfToken },
        body: JSON.stringify({ title: args.title, points: args.points, category: 'e2e-phase05' }),
      })
      return res.json()
    }, { title: uniqueTitle, points: ASSIGNMENT_POINTS, csrfToken: csrfToken1 })
    expect(createTpl.data?.id, 'Template should be created').toBeDefined()
    const templateId = createTpl.data.id

    // Get Alice's id
    const alice = await page.evaluate(async () => {
      const r = await fetch('/api/users', { credentials: 'include' })
      const u = (await r.json()).data as Array<{ id: number; name: string }>
      return u.find((x) => x.name === 'Alice')!
    })

    // Create an assignment for Alice due 1 month in the future
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 1)
    const dueDateStr = dueDate.toISOString().slice(0, 10)
    const csrfToken2 = await getCsrfToken(page)
    const createAssign = await page.evaluate(async (args: { templateId: number; userId: number; dueDate: string; csrfToken: string }) => {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': args.csrfToken },
        body: JSON.stringify({
          choreTemplateId: args.templateId,
          assignedToId: args.userId,
          dueDate: args.dueDate,
        }),
      })
      return res.json()
    }, { templateId, userId: alice.id, dueDate: dueDateStr, csrfToken: csrfToken2 })
    expect(createAssign.data?.id, 'Assignment should be created').toBeDefined()
    const assignmentId = createAssign.data.id
    await shot(page, '01-assignment-created')

    // Switch to Alice. No need to log out first — login() replaces the
    // session cookie directly rather than driving the login form, and an
    // explicit logout here would destroy DAD's session server-side. Since
    // every spec file replays the same setup-time session per user (see
    // e2e/helpers/auth.ts), destroying it here would break every later test
    // in the suite that logs in as DAD or Alice afterward.
    await login(page, ALICE)

    // Navigate to MyChoresPage
    await page.click('a:has-text("My Chores")')
    await page.waitForURL('**/my-chores')
    await page.waitForSelector('h2', { timeout: 10000 })
    await page.waitForTimeout(1500)
    await shot(page, '02-my-chores-list')

    // Complete the assignment via the API (UI button click is brittle across
    // styles; the API call exercises the same CHORE-07 + PTS-01 path)
    const csrfToken3 = await getCsrfToken(page)
    const complete = await page.evaluate(async (args: { id: number; csrfToken: string }) => {
      const res = await fetch(`/api/assignments/${args.id}/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-xsrf-token': args.csrfToken },
      })
      return res.json()
    }, { id: assignmentId, csrfToken: csrfToken3 })
    expect(complete.data?.status, 'Assignment should be marked COMPLETED').toBe('COMPLETED')
    expect(complete.data?.pointsAwarded, `pointsAwarded should equal template points (${ASSIGNMENT_POINTS})`).toBe(ASSIGNMENT_POINTS)
    await shot(page, '03-assignment-completed')

    // Re-fetch Alice's balance and assert it increased by at least
    // ASSIGNMENT_POINTS. Not an exact-equality check: other spec files run
    // concurrently against the same shared DB and may legitimately award
    // Alice points of their own in the same window (e.g. phase-04-uat's
    // recurring-occurrence completion) — the precise per-chore EARNED log
    // check right below is the real correctness assertion for this test.
    const balanceAfter = await page.evaluate(async (userId: number) => {
      const r = await fetch(`/api/points/users/${userId}`, { credentials: 'include' })
      const d = (await r.json()).data as { balance: number; logs: Array<{ amount: number; type: string; reason: string }> }
      return d
    }, alice.id)
    expect(balanceAfter.balance, `Balance should have increased by at least ${ASSIGNMENT_POINTS} (was ${aliceBalanceBefore}, now ${balanceAfter.balance})`).toBeGreaterThanOrEqual(aliceBalanceBefore + ASSIGNMENT_POINTS)

    // Verify a new EARNED log was created for this chore
    const newEarnsForThisChore = balanceAfter.logs.filter(
      (l) => l.type === 'EARNED' && l.reason === uniqueTitle
    )
    expect(newEarnsForThisChore.length, `Should have exactly 1 EARNED log for "${uniqueTitle}"`).toBe(1)
    expect(newEarnsForThisChore[0].amount).toBe(ASSIGNMENT_POINTS)
    await shot(page, '04-balance-increased')

    // No cleanup logout — see the comment above; it's both unnecessary (each
    // test gets a fresh browser context) and would destroy Alice's shared
    // session for every later test in the suite.
  })
})
