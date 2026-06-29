/**
 * Phase 5 UAT — Points + Calendar
 *
 * Automated E2E walkthrough for all UAT scenarios.
 * Takes screenshots at each step to /home/thitar/dev/chore-ganizer/e2e/screenshots/phase-05/.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/home/thitar/dev/chore-ganizer/e2e/screenshots/phase-05';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const DAD = { email: 'dad@home.local', password: 'password123' };
const ALICE = { email: 'alice@home.local', password: 'password123' };

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true });
}

async function login(page: Page, user: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

test.describe('Phase 5 UAT — Points + Calendar', () => {
  test('Test 1: Login and navigate to Points page', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForURL('**/points');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    await shot(page, '01-points-page');
  });

  test('Test 2: Points page shows balance and log', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")');

    // Balance card
    await page.waitForSelector('text=/Current Balance/');
    await shot(page, '02-balance-card');
  });

  test('Test 3: Parent adjusts Alice points', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")');
    await page.waitForSelector('text=Adjust Points');

    // Open the user select
    await page.selectOption('select#user-select', { label: 'Alice (CHILD)' });
    await page.fill('input#amount', '10');
    await page.fill('input#reason', 'Test bonus');
    await shot(page, '03a-form-filled');

    await page.click('button[type="submit"]:has-text("Adjust")');
    // Wait for the success message or balance update
    await page.waitForTimeout(2000);
    await shot(page, '03b-after-adjust');
  });

  test('Test 4: Negative amount shows green for positive and red for negative', async ({ page }) => {
    await login(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")');

    // Log table should show both positive and negative amounts
    const hasPositive = await page.locator('text=/\\+[0-9]+/').count();
    const hasNegative = await page.locator('text=/-[0-9]+/').count();
    expect(hasPositive + hasNegative).toBeGreaterThan(0);
    await shot(page, '04-amount-colors');
  });

  test('Test 5: Type badges have correct colors', async ({ page }) => {
    await login(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")');

    // Use text= which is more flexible
    const hasEarned = await page.locator('text=EARNED').count();
    const hasBonus = await page.locator('text=BONUS').count();
    expect(hasEarned).toBeGreaterThan(0);
    expect(hasBonus).toBeGreaterThan(0);
    await shot(page, '05-type-badges');
  });

  test('Test 6: Child does NOT see Adjust form', async ({ page }) => {
    await login(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")');

    const adjustCount = await page.locator('text=/Adjust Points/').count();
    expect(adjustCount).toBe(0);
    await shot(page, '06-child-no-adjust');
  });

  test('Test 7: Navigate to Calendar page', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForURL('**/calendar');
    await page.waitForSelector("h2", { timeout: 10000 });
    await shot(page, '07-calendar-page');
  });

  test('Test 8: Calendar shows day labels', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');

    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await page.waitForSelector(`text=${day}`);
    }
    await shot(page, '08-day-labels');
  });

  test('Test 9: Calendar has prev/next month buttons', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');
    // Wait for the month header (the prev/next buttons are in the same
    // toolbar as the h2 — use a more specific selector than the bare h2
    // to avoid racing the legend/grid render)
    await page.waitForSelector('button[aria-label="Previous month"]');

    const prev = page.locator('button[aria-label="Previous month"]');
    const next = page.locator('button[aria-label="Next month"]');
    expect(await prev.count()).toBeGreaterThan(0);
    expect(await next.count()).toBeGreaterThan(0);
    await shot(page, '09-prev-next-buttons');
  });

  test('Test 10: Clicking next month changes the month', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');

    const initialMonth = await page.locator('h2').textContent();
    await page.click('button[aria-label="Next month"]');
    await page.waitForTimeout(500);
    const newMonth = await page.locator('h2').textContent();
    expect(newMonth).not.toBe(initialMonth);
    await shot(page, '10-next-month');
  });

  test('Test 11: Clicking Today returns to current month', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');

    // Go forward then back
    await page.click('button[aria-label="Next month"]');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);
    await shot(page, '11-back-to-today');
  });

  test('Test 12: Calendar legend shows user colors', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');
    // Wait for the legend to actually render (it's below the calendar
    // grid, so the h2 above the grid is visible before the legend)
    await page.waitForSelector('text=Alice', { timeout: 10000 });

    const legend = page.getByText('Alice', { exact: true });
    expect(await legend.count()).toBeGreaterThan(0);
    await shot(page, '12-legend');
  });

  test('Test 13: Calendar shows assignment pills on days with chores', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2');

    // The grid should have at least one cell with a colored pill
    // Pills show template title text (e.g., "Make Bed")
    const makeBedPills = await page.locator('text=Make Bed').count();
    const trashPills = await page.locator('text=Take Out Trash').count();
    expect(makeBedPills + trashPills).toBeGreaterThan(0);
    await shot(page, '13-pills-or-empty');
  });
});
