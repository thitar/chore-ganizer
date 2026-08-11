/**
 * Parent dashboard E2E — status strip + nudge smoke test
 *
 * Covers the spec-mandated §6 E2E case for the parent dashboard nudge
 * design: a parent on "/" sees the status strip and needs-action rows, and
 * nudging an item shows a success toast. Push delivery itself is NOT
 * asserted — ntfy delivery is external.
 *
 * Seeded-data note: alice has a DAILY "Make Bed" recurring chore, so a
 * needs-action row for today's occurrence appears on the dashboard once the
 * dashboard's /api/assignments fetch lazily generates it. Children are
 * seeded with NO ntfyTopic, so to make the Nudge button clickable we first
 * set alice's topic via the API (and reset it in cleanup so we don't leave
 * state behind for other specs).
 */

import { test, expect, Page } from '@playwright/test'
import { login } from './helpers/auth'
import { getCsrfToken } from './helpers/csrf'

const DAD = { email: 'dad@home.local', password: 'password123' }
const NUDGE_TOPIC = 'e2e-nudge-topic'

async function findAliceId(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const r = await fetch('/api/users', { credentials: 'include' })
    const users = (await r.json()).data as Array<{ id: number; name: string }>
    return users.find((x) => x.name === 'Alice')!.id
  })
}

async function setAliceTopic(page: Page, aliceId: number, ntfyTopic: string): Promise<boolean> {
  const csrfToken = await getCsrfToken(page)
  const res = await page.evaluate(
    async (args: { aliceId: number; ntfyTopic: string; csrfToken: string }) => {
      const response = await fetch(`/api/users/${args.aliceId}/ntfy-topic`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': args.csrfToken },
        body: JSON.stringify({ ntfyTopic: args.ntfyTopic }),
      })
      const body = (await response.json()) as { success?: boolean }
      return response.ok && body.success === true
    },
    { aliceId, ntfyTopic, csrfToken }
  )
  return res
}

test.describe('Parent dashboard', () => {
  test('parent on / sees the status strip and nudging shows a success toast', async ({ page }) => {
    await login(page, DAD)

    // Status strip: the four labels. Scope to the strip grid so "Overdue"
    // (also the needs-action badge text) stays unambiguous.
    const strip = page.locator('div.grid.grid-cols-2')
    await expect(strip.getByText('Overdue')).toBeVisible()
    await expect(strip.getByText('Due today')).toBeVisible()
    await expect(strip.getByText('This week')).toBeVisible()
    await expect(strip.getByText('Pts this week')).toBeVisible()

    // Give alice an ntfyTopic so her Nudge button is clickable.
    const aliceId = await findAliceId(page)
    expect(await setAliceTopic(page, aliceId, NUDGE_TOPIC), 'setting alice ntfyTopic should succeed').toBe(true)

    try {
      // Reload so the dashboard refetches assignments carrying the new topic.
      await page.reload()

      // alice's DAILY "Make Bed" needs-action row (possibly both an overdue
      // and a today occurrence) — scope to the row and click its Nudge.
      const makeBedRow = page.locator('div.rounded-2xl', { hasText: 'Make Bed' }).first()
      await expect(makeBedRow).toBeVisible()
      const nudgeButton = makeBedRow.getByRole('button', { name: 'Nudge' })
      await expect(nudgeButton).toBeEnabled()
      await nudgeButton.click()

      await expect(page.getByText('Reminder sent to Alice 👀')).toBeVisible()
    } finally {
      // Cleanup: reset alice's topic so other specs don't inherit it.
      expect(await setAliceTopic(page, aliceId, ''), 'resetting alice ntfyTopic should succeed').toBe(true)
    }
  })
})
