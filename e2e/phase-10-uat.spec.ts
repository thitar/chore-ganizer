/**
 * Phase 10 UAT — Profile UI + User Topic Route
 *
 * E2E tests for ntfy topic management on Profile page.
 * Screenshots to /home/thitar/dev/chore-ganizer/e2e/screenshots/phase-10/.
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = '/home/thitar/dev/chore-ganizer/e2e/screenshots/phase-10';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const DAD = { email: 'dad@home.local', password: 'password123' };
const MOM = { email: 'mom@home.local', password: 'password123' };
const ALICE = { email: 'alice@home.local', password: 'password123' };
const BOB = { email: 'bob@home.local', password: 'password123' };

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

async function enterTopicEditMode(page: Page): Promise<void> {
  await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
  await page.waitForTimeout(500);
  const changeButton = page.locator('button:has-text("Change")');
  const generateButton = page.locator('button:has-text("Generate random topic")');
  if (await changeButton.isVisible()) {
    await changeButton.click();
  } else if (await generateButton.isVisible()) {
    await generateButton.click();
  }
  await page.waitForTimeout(300);
}

test.describe('Phase 10 UAT — Profile UI + User Topic Route', () => {
  test('Test 1: Push Notifications section renders on Profile page', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    
    // Wait for Profile page to load
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    
    // Wait a bit for React to render
    await page.waitForTimeout(1000);
    
    // Take screenshot to see what's on the page
    await shot(page, '01-profile-page-loaded');
    
    // Check for Push Notifications section - use more specific selector
    const pushNotificationsSection = page.locator('h3:has-text("Push Notifications")');
    await expect(pushNotificationsSection).toBeVisible({ timeout: 10000 });
    
    // Check for topic-related elements
    const topicRelated = page.locator('text=topic, text=ntfy, text=notifications');
    const topicCount = await topicRelated.count();
    console.log(`Found ${topicCount} topic-related elements`);
    
    await shot(page, '01-push-notifications-section');
  });

  test('Test 2: Generate random topic and save flow', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await enterTopicEditMode(page);
    
    const generateButton = page.locator('button:has-text("Generate random topic")');
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();
    
    // Verify input is filled with a topic
    const topicInput = page.locator('#topic-input');
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    const topicValue = await topicInput.inputValue();
    expect(topicValue.length).toBeGreaterThanOrEqual(12);
    expect(topicValue).toMatch(/^chore-/);
    
    await shot(page, '02-random-topic-generated');
    
    // Click Save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for success toast
    const toast = page.locator('text=Topic saved!');
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    await shot(page, '03-topic-saved');
  });

  test('Test 3: 409 Conflict for duplicate topic', async ({ page }) => {
    // First, set a topic for Dad
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await enterTopicEditMode(page);
    
    const generateButton = page.locator('button:has-text("Generate random topic")');
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();
    
    const topicInput = page.locator('#topic-input');
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    const dadTopic = await topicInput.inputValue();
    
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for success toast
    const toast = page.locator('text=Topic saved!');
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    // Now try to set the same topic for Mom
    await login(page, MOM);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await enterTopicEditMode(page);
    
    const topicInputMom = page.locator('#topic-input');
    
    // Try to enter the same topic Dad has
    await expect(topicInputMom).toBeVisible({ timeout: 5000 });
    await topicInputMom.fill(dadTopic);
    
    // Click Save
    const saveButtonMom = page.locator('button:has-text("Save")');
    await expect(saveButtonMom).toBeVisible({ timeout: 5000 });
    await saveButtonMom.click();
    
    // Wait for 409 error message
    const errorMessage = page.locator('text=This topic is already in use');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    await shot(page, '04-409-conflict');
  });

  test('Test 4: Clear topic (empty value)', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await enterTopicEditMode(page);
    
    const topicInput = page.locator('#topic-input');
    
    // Clear the topic input
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    await topicInput.clear();
    
    // Click Save
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for success toast
    const toast = page.locator('text=Topic saved!');
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    // After save, edit mode closes — verify view mode shows empty state
    const emptyState = page.locator('text=Topic required for notifications');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
    
    await shot(page, '05-topic-cleared');
  });

  test('Test 5: Parent-only Family Topics cards', async ({ page }) => {
    // Login as Dad (parent)
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check for Family Topics section
    const familyTopicsSection = page.locator('h3:has-text("Family Topics")');
    await expect(familyTopicsSection).toBeVisible({ timeout: 5000 });
    
    // Check for child cards (Alice and Bob should be visible by name)
    const aliceCard = page.locator('text=Alice').first();
    const bobCard = page.locator('text=Bob').first();
    
    await expect(aliceCard).toBeVisible({ timeout: 5000 });
    await expect(bobCard).toBeVisible({ timeout: 5000 });
    
    // Check for Edit buttons on child cards
    const editButtons = page.locator('button:has-text("Edit")');
    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBeGreaterThanOrEqual(2);
    
    await shot(page, '06-family-topics-cards');
  });

  test('Test 6: Edit child topic flow', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Find and click Edit button for Alice
    const editButtons = page.locator('button:has-text("Edit")');
    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBeGreaterThanOrEqual(1);
    
    await editButtons.first().click();
    
    // Verify inline edit mode appears
    const saveButton = page.locator('button:has-text("Save")');
    const cancelButton = page.locator('button:has-text("Cancel")');
    
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    
    await shot(page, '07-inline-edit-mode');
    
    // Click Cancel
    await cancelButton.click();
    
    // Verify edit mode closes
    await expect(saveButton).not.toBeVisible({ timeout: 5000 });
  });

  test('Test 7: Child cannot see Family Topics section', async ({ page }) => {
    // Login as Alice (child)
    await login(page, ALICE);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Check that Family Topics section is NOT visible
    const familyTopicsSection = page.locator('h3:has-text("Family Topics")');
    await expect(familyTopicsSection).not.toBeVisible({ timeout: 5000 });
    
    await shot(page, '08-child-no-family-topics');
  });

  test('Test 8: Topic input validation (too short)', async ({ page }) => {
    await login(page, DAD);
    await page.goto('/profile');
    
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    await enterTopicEditMode(page);
    
    const topicInput = page.locator('#topic-input');
    
    // Enter a topic that's too short
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    await topicInput.fill('short');
    
    // Click Save
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();
    
    // Wait for error message
    const errorMessage = page.locator('text=Topic must be 12-64 characters');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    await shot(page, '09-topic-validation-error');
  });
});
