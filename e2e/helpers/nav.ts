import { Page } from '@playwright/test'

// The M1 redesign moved parent-only routes (Templates, Recurring, Assignments,
// Users) behind a "Manage" dropdown in the desktop nav — see MANAGE_LINKS in
// frontend/src/components/TopNav.tsx. Open it before clicking one of those
// links; a bare `a:has-text(...)` click no longer works since the link isn't
// rendered until the dropdown is open.
export async function goToManageLink(page: Page, label: string): Promise<void> {
  await page.click('button:has-text("Manage")')
  await page.click(`a:has-text("${label}")`)
}

// TopNav's logout button is icon-only (aria-label="Logout", no visible text).
export async function logout(page: Page): Promise<void> {
  await page.click('button[aria-label="Logout"]')
  await page.waitForURL('/login', { timeout: 5000 })
}
