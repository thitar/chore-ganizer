/**
 * M2 The Game — gamification + CSRF-protected mutations
 *
 * This is the only place that would have caught the CSRF interceptor bug
 * (PR #146) via a real browser + real axios instance: backend unit tests
 * bypass CSRF entirely under NODE_ENV=test (see backend/src/middleware/
 * csrf.ts), and frontend unit tests mock axios entirely. Must be run with
 * NODE_ENV != test (e.g. development) — see this plan's Global Constraints.
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

const DAD = { email: 'dad@home.local', password: 'password123' };
const ALICE = { email: 'alice@home.local', password: 'password123' };

test.describe('M2 The Game — gamification + CSRF-protected mutations', () => {
  test('login succeeds (exercises CSRF on a mutating request)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(DAD.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(DAD.password);
    const loginResponse = page.waitForResponse('**/api/auth/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    expect((await loginResponse).status()).toBe(200);
  });

  test('completing a chore succeeds and updates the row status', async ({ page }) => {
    await login(page, ALICE);
    await page.goto('/my-chores');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });

    const markCompleteBtn = page.locator('button:has-text("Mark Complete")').first();
    await expect(markCompleteBtn).toBeVisible({ timeout: 10000 });

    const completeResponse = page.waitForResponse((res) => res.url().includes('/complete') && res.request().method() === 'POST');
    await markCompleteBtn.click();
    const res = await completeResponse;
    // A 403 here means the CSRF interceptor regressed — the whole point of this spec.
    expect(res.status(), 'Completing a chore must not be rejected by CSRF').toBe(200);
  });

  test('parent points adjustment succeeds (CSRF + Zod validation)', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/points');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    await page.waitForSelector('text=Adjust Points');

    await page.selectOption('select#user-select', { label: 'Alice (CHILD)' });
    await page.fill('input#amount', '10');
    await page.fill('input#reason', 'M2 e2e bonus');

    const adjustResponse = page.waitForResponse(
      (res) => res.url().includes('/api/points/adjust') && res.request().method() === 'POST'
    );
    await page.click('button[type="submit"]:has-text("Adjust")');
    const res = await adjustResponse;
    expect(res.status(), 'Points adjustment must not be rejected by CSRF').toBe(201);
  });

  test('streak stat card and level bar render with real data', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/');
    await expect(page.locator('text=Streak')).toBeVisible({ timeout: 10000 });

    await page.goto('/points');
    await expect(page.locator('[role="progressbar"][aria-label*="Level"]')).toBeVisible({ timeout: 10000 });
  });

  test('badge grid renders locked and earned states on profile', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });

    // BadgeGrid (frontend/src/components/BadgeGrid.tsx) marks each badge's
    // state via aria-label="{name} — earned|locked", making state assertable
    // without relying on CSS class names.
    const badges = page.locator('[aria-label$="— locked"], [aria-label$="— earned"]');
    await expect(badges).toHaveCount(8, { timeout: 10000 });

    const lockedBadges = page.locator('[aria-label$="— locked"]');
    expect(await lockedBadges.count(), 'At least one badge should be locked for a fresh seeded account').toBeGreaterThan(0);
  });
});
