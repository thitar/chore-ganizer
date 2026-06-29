/**
 * Phase 6 UAT — User Management + Profile
 *
 * Automated E2E walkthrough.
 * Screenshots to /home/thitar/dev/chore-ganizer/e2e/screenshots/phase-06/.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/home/thitar/dev/chore-ganizer/e2e/screenshots/phase-06';
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

test.describe('Phase 6 UAT — User Management + Profile', () => {
  test('Test 1: Navigate to Profile page', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Profile")');
    await page.waitForURL('**/profile');
    await page.waitForSelector('h2:has-text("My Profile")');
    await shot(page, '01-profile-page');
  });

  test('Test 2: Profile shows user info and password form', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Profile")');
    await page.waitForSelector('h2:has-text("My Profile")');
    await page.waitForSelector('h3:has-text("Change Password")');
    await page.waitForSelector('h3:has-text("Display Color")');
    await shot(page, '02-profile-sections');
  });

  test('Test 3: Profile password validation', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Profile")');
    await page.waitForSelector('h2:has-text("My Profile")');
    // Click update with empty fields
    await page.click('button:has-text("Update Password")');
    await page.waitForSelector('text=All fields are required.');
    await shot(page, '03-password-validation');
  });

  test('Test 4: Navigate to Users page (parent only)', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForURL('**/users');
    await page.waitForSelector('h2:has-text("Family Members")');
    await shot(page, '04-users-page');
  });

  test('Test 5: Users page shows all family members', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")');
    for (const name of ['Dad', 'Mom', 'Alice', 'Bob']) {
      expect(await page.getByText(name, { exact: true }).count()).toBeGreaterThan(0);
    }
    await shot(page, '05-user-list');
  });

  test('Test 6: Current user shows "You" indicator', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")');
    const youCount = await page.getByText('You', { exact: true }).count();
    expect(youCount).toBeGreaterThan(0);
    await shot(page, '06-you-indicator');
  });

  test('Test 7: Show create user form', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")');
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('h3:has-text("New Family Member")');
    await shot(page, '07-create-form');
  });

  test('Test 8: Create user with valid data', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")');
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('h3:has-text("New Family Member")');

    const uniqueEmail = `test-${Date.now()}@home.local`;
    await page.fill('input#name', 'Test User');
    await page.fill('input#email', uniqueEmail);
    await page.fill('input#password', 'password123');
    await shot(page, '08a-form-filled');

    await page.click('button[type="submit"]:has-text("Create")');
    // Wait for success
    await page.waitForTimeout(2000);
    await shot(page, '08b-after-create');
  });

  test('Test 9: Child cannot access /users', async ({ page }) => {
    await login(page, ALICE);
    await page.goto('/users');
    await page.waitForSelector('text=403 Forbidden', { timeout: 5000 });
    await shot(page, '09-child-403');
  });

  test('Test 10: Child does NOT see Users link in nav', async ({ page }) => {
    await login(page, ALICE);
    const usersCount = await page.locator('a:has-text("Users")').count();
    expect(usersCount).toBe(0);
    await shot(page, '10-child-nav');
  });

  test('Test 11: Delete user with confirmation', async ({ page }) => {
    await login(page, DAD);
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")');

    // Find any delete button (not for self)
    const deleteBtns = page.locator('button[aria-label="Delete user"]');
    const count = await deleteBtns.count();
    if (count > 0) {
      await deleteBtns.first().click();
      await page.waitForSelector('text=Delete this family member');
      await shot(page, '11a-delete-confirm');

      const confirmBtn = page.locator('div.bg-red-50 button:has-text("Delete")').first();
      await confirmBtn.click();
      await page.waitForTimeout(2000);
      await shot(page, '11b-after-delete');
    } else {
      await shot(page, '11-no-deletable');
    }
  });
});
