/**
 * P-311: Configure Overdue Penalty Settings
 * Verifies that penalty multiplier persists after page refresh.
 */

import { test, expect } from '@playwright/test';
import { loginViaUI } from './utils/test-helpers';

test.describe('P-311: Overdue Penalty Configuration Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, 'dad@home.local', 'password123');
  });

  test('penalty multiplier persists after page refresh', async ({ page }) => {
    // Step 1: Navigate to Profile page
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Step 2: Verify "Overdue Penalty Settings" section is visible
    await expect(page.locator('text=Overdue Penalty Settings')).toBeVisible();

    // Step 3: Verify "Enable overdue penalties" checkbox is checked
    const enabledLabel = page.locator('label', { hasText: 'Enable overdue penalties' });
    const enabledCheckbox = enabledLabel.locator('input[type="checkbox"]');
    await expect(enabledCheckbox).toBeChecked();

    // Step 4: Change Penalty Multiplier to 5x
    const multiplierSelect = page.locator('select', { has: page.locator('option', { hasText: /chore points/ }) });
    await multiplierSelect.selectOption('5');
    await expect(multiplierSelect).toHaveValue('5');

    // Step 5: Click "Save Settings"
    await page.locator('button', { hasText: /Save Settings/i }).click();

    // Step 6: Verify success message
    await expect(page.locator('text=Notification settings saved successfully!')).toBeVisible({ timeout: 5000 });

    // Step 7: Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Step 8: Verify penalty multiplier persists as 5x
    const multiplierAfterRefresh = page.locator('select', { has: page.locator('option', { hasText: /chore points/ }) });
    await expect(multiplierAfterRefresh).toHaveValue('5', { timeout: 5000 });
  });

  test.afterEach(async ({ page }) => {
    // Reset multiplier back to 2x to avoid test pollution
    try {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      const multiplierSelect = page.locator('select', { has: page.locator('option', { hasText: /chore points/ }) });
      await multiplierSelect.selectOption('2');
      await page.locator('button', { hasText: /Save Settings/i }).click();
      await page.waitForSelector('text=Notification settings saved successfully!', { timeout: 3000 });
    } catch {
      // Best effort cleanup
    }
  });
});
