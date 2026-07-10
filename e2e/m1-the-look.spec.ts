/**
 * M1 The Look — dark redesign smoke test
 *
 * No e2e coverage existed for the M1 milestone (dark theme, TopNav/
 * BottomTabBar navigation, Leaderboard) before this file — see
 * docs/superpowers/plans/2026-07-09-uat-plan.md Task 1's coverage-gap
 * findings.
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

const DAD = { email: 'dad@home.local', password: 'password123' };

test.describe('M1 The Look — dark redesign smoke test', () => {
  test('dashboard loads with dark theme and desktop nav', async ({ page }) => {
    await login(page, DAD);

    // Dark-only design system: frontend/src/index.css sets
    // `html { color-scheme: dark }` — check that CSS property rather than a
    // hardcoded color value, so this doesn't rot if the palette shifts.
    const colorScheme = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme
    );
    expect(colorScheme).toBe('dark');

    // Desktop TopNav (frontend/src/components/TopNav.tsx) renders the main
    // links directly; "Dashboard" is the label for "/".
    await expect(page.locator('nav').filter({ hasText: 'Dashboard' })).toBeVisible();
  });

  test('leaderboard renders on dashboard and points page', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/');
    await expect(page.locator('h3:has-text("Leaderboard")')).toBeVisible({ timeout: 10000 });

    await page.goto('/points');
    await expect(page.locator('h3:has-text("Family Leaderboard")')).toBeVisible({ timeout: 10000 });
  });

  test('bottom tab bar navigates between all primary routes on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, DAD);

    // BottomTabBar (frontend/src/components/BottomTabBar.tsx) is mobile-only
    // (`md:hidden`) and uses its own labels distinct from TopNav's.
    const tabs: Array<{ label: string; path: string }> = [
      { label: 'Chores', path: '/my-chores' },
      { label: 'Points', path: '/points' },
      { label: 'Calendar', path: '/calendar' },
      { label: 'Profile', path: '/profile' },
      { label: 'Home', path: '/' },
    ];

    const bottomNav = page.locator('nav[aria-label="Primary"]');
    await expect(bottomNav).toBeVisible();

    for (const tab of tabs) {
      await bottomNav.getByText(tab.label, { exact: true }).click();
      await page.waitForURL(tab.path === '/' ? '**/' : `**${tab.path}`);
      await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });
    }
  });
});
