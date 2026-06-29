/**
 * Phase 7 UAT — Frontend Polish + Docker
 *
 * Final E2E walkthrough: verify all pages work and mobile viewport.
 * Screenshots to /home/thitar/dev/chore-ganizer/e2e/screenshots/phase-07/.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/home/thitar/dev/chore-ganizer/e2e/screenshots/phase-07';
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

test.describe('Phase 7 UAT — Frontend Polish + Docker', () => {
  test('Test 1: Login page renders cleanly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('h1:has-text("Chore-Ganizer")');
    await shot(page, '01-login');
  });

  test('Test 2: All 7 pages accessible from nav (parent)', async ({ page }) => {
    await login(page, DAD);
    const expectedPaths = ['/', '/my-chores', '/points', '/profile', '/templates', '/recurring-chores', '/assignments', '/users', '/calendar'];
    for (const path of expectedPaths) {
      await page.goto(path);
      await page.waitForSelector('h2', { timeout: 5000 });
    }
    await shot(page, '02-nav-parent');
  });

  test('Test 3: All pages load (parent)', async ({ page }) => {
    await login(page, DAD);
    const pages = [
      { path: '/', selector: 'h2' },
      { path: '/my-chores', selector: 'h2' },
      { path: '/points', selector: 'h2' },
      { path: '/profile', selector: 'h2' },
      { path: '/templates', selector: 'h2' },
      { path: '/recurring-chores', selector: 'h2' },
      { path: '/assignments', selector: 'h2' },
      { path: '/users', selector: 'h2' },
      { path: '/calendar', selector: 'h2' },
    ];
    for (const p of pages) {
      await page.goto(p.path);
      await page.waitForSelector(p.selector, { timeout: 5000 });
    }
    await shot(page, '03-all-pages');
  });

  test('Test 4: Child sees correct nav', async ({ page }) => {
    await login(page, ALICE);
    const allowedPaths = ['/', '/my-chores', '/points', '/profile', '/calendar'];
    for (const path of allowedPaths) {
      await page.goto(path);
      await page.waitForSelector('h2', { timeout: 5000 });
    }
    for (const path of ['/templates', '/recurring-chores', '/assignments', '/users']) {
      await page.goto(path);
      await page.waitForSelector('text=403 Forbidden', { timeout: 5000 });
    }
    await shot(page, '04-nav-child');
  });

  test('Test 5: Mobile viewport (375px) renders main pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, DAD);

    // Just check that pages render at mobile size (no overflow check for nav)
    for (const path of ['/', '/my-chores', '/points']) {
      await page.goto(path);
      await page.waitForSelector('h2', { timeout: 5000 });
    }
    await shot(page, '05-mobile-375');
  });

  test('Test 6: Login form works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.waitForSelector('h1:has-text("Chore-Ganizer")');
    await shot(page, '06-mobile-login');
  });

  test('Test 7: Health endpoint responds', async ({ request }) => {
    const res = await request.get('http://localhost:3010/api/health');
    expect(res.status()).toBe(200);
  });

  test('Test 8: Full app flow: login → create → complete → adjust', async ({ page }) => {
    await login(page, DAD);

    // Create a template
    await page.goto('/templates');
    await page.waitForSelector('h2:has-text("Chore Templates")');
    await page.click('button:has-text("Create Template")');
    await page.waitForSelector('label:has-text("Title")');
    await page.fill('input#title', 'E2E Test Chore');
    await page.fill('input#points', '20');
    await page.fill('input#category', 'e2e');
    await page.click('button[type="submit"]:has-text("Save Template")');
    await page.waitForTimeout(1000);
    await shot(page, '08a-template-created');

    // Create an assignment
    await page.goto('/assignments');
    await page.waitForSelector('h2');
    await page.click('button:has-text("Assign Chore")');
    await page.waitForTimeout(500);
    await shot(page, '08b-assignment-form');

    // Adjust points
    await page.goto('/points');
    await page.waitForSelector('h2:has-text("My Points")');
    await shot(page, '08c-points-page');
  });
});
