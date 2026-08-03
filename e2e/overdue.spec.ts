import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'
import { goToManageLink } from './helpers/nav'

const DAD = { email: 'dad@home.local', password: 'password123' }

function yesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

test.describe('Overdue chore management', () => {
  test('parent can cancel an overdue chore with a penalty', async ({ page }) => {
    await login(page, DAD)

    await goToManageLink(page, 'Assignments')
    await page.getByText('Assign Chore').click()
    // Templates are returned in title order ("Clean Room", "Make Bed", "Take
    // Out Trash", "Wash Dishes"), so index 1 is "Clean Room". index 1 of the
    // assignee select is Alice (children sorted by name).
    await page.locator('#template').selectOption({ index: 1 })
    await page.locator('#assignTo').selectOption({ index: 1 })
    await page.locator('#dueDate').fill(yesterday())
    await page.getByText('Save Assignment').click()
    await expect(page.getByText('Assignment created!')).toBeVisible()

    await goToManageLink(page, 'Overdue')
    // The seeded DAILY "Make Bed" recurring chore also yields overdue rows, so
    // scope the Cancel button to the row we just created to stay unambiguous.
    const overdueRow = page.locator('div.rounded-2xl', { hasText: 'Clean Room' })
    await expect(overdueRow).toBeVisible()
    await overdueRow.getByText('Cancel', { exact: true }).click()
    await page.getByLabel('Penalty points').fill('5')
    await page.getByText('Cancel Chore').click()
    await expect(page.getByText('Chore canceled, 5 pts penalty applied.')).toBeVisible()
  })
})
