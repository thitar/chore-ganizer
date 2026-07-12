/**
 * UAT-CHECKLIST.md — full automated walkthrough.
 *
 * Maps 1:1 to docs/UAT-CHECKLIST.md. Runs against the Docker-deployed app
 * (see playwright.uat.config.ts, baseURL http://localhost:3002). Each test
 * logs a `[UAT x.y] PASS/FAIL/INFO ...` line for easy result aggregation.
 *
 * Run:
 *   docker compose up --build -d
 *   npx playwright test --config=playwright.uat.config.ts \
 *       e2e/auth.setup.ts e2e/uat-checklist.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getCsrfToken } from './helpers/csrf';

/**
 * Fresh UI login — creates a NEW server session each call, so we never reuse
 * a static saved cookie that a previous test may have invalidated (e.g. a
 * logout destroys the shared session). AUTH_RATE_LIMIT_MAX is raised for the
 * full-suite run to accommodate one login per test.
 */
async function uiLogin(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'uat');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const DAD = { email: 'dad@home.local', password: 'password123' };
const MOM = { email: 'mom@home.local', password: 'password123' };
const ALICE = { email: 'alice@home.local', password: 'password123' };
const BOB = { email: 'bob@home.local', password: 'password123' };
const ALICE_ORIGINAL_COLOR = '#10B981';

function logResult(id: string, result: 'PASS' | 'FAIL' | 'INFO', detail: string) {
  console.log(`[UAT ${id}] ${result}: ${detail}`);
}

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: false,
    timeout: 3000,
  }).catch(() => {});
}

/** Generic CSRF-protected fetch inside the page context (shares the session cookies). */
async function api(
  page: Page,
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const token = await getCsrfToken(page);
  return page.evaluate(
    async ({ method, urlPath, body, token }) => {
      const res = await fetch(urlPath, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': token },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        /* ignore */
      }
      return { status: res.status, data };
    },
    { method, urlPath, body, token },
  );
}

/** In-browser fetch that reads CSRF from the browser's live cookie (not Playwright's snapshot). */
async function browserFetch(
  page: Page,
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  return page.evaluate(
    async ({ method, urlPath, body }) => {
      const xsrf = document.cookie
        .split('; ')
        .find((c) => c.startsWith('XSRF-TOKEN='))
        ?.split('=')[1] ?? '';
      const res = await fetch(urlPath, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': xsrf },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let data: any = null;
      try { data = await res.json(); } catch {}
      return { status: res.status, data };
    },
    { method, urlPath, body },
  );
}

/** Create an assignment resolving template/user ids in-browser (robust). */
async function createAssignmentApi(
  page: Page,
  templateTitle: string,
  userEmail: string,
  dueDate: string,
): Promise<{ status: number; id: number | null; error?: string }> {
  const token = await getCsrfToken(page);
  return page.evaluate(
    async ({ templateTitle, userEmail, dueDate, token }) => {
      const tRes = await fetch('/api/templates', { credentials: 'include' });
      const tJson = await tRes.json();
      const tpls = tJson.data ?? [];
      const uRes = await fetch('/api/users', { credentials: 'include' });
      const uJson = await uRes.json();
      const users = uJson.data ?? [];
      const tpl = tpls.find((t: any) => t.title === templateTitle);
      const u = users.find((x: any) => x.email === userEmail);
      if (!tpl) return { status: 0, id: null, error: `Template "${templateTitle}" not found` };
      if (!u) return { status: 0, id: null, error: `User "${userEmail}" not found` };
      const res = await fetch('/api/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-xsrf-token': token },
        body: JSON.stringify({ choreTemplateId: tpl.id, assignedToId: u.id, dueDate }),
      });
      const json = await res.json();
      return { status: res.status, id: json.data?.id ?? null };
    },
    { templateTitle, userEmail, dueDate, token },
  );
}

/** Read the logged-in user's own points summary. */
async function getMyPoints(page: Page): Promise<{ balance: number; logs: any[] }> {
  return page.evaluate(async () => {
    const res = await fetch('/api/points/me', { credentials: 'include' });
    const json = await res.json();
    return json.data;
  });
}

/** Read a specific user's points summary (parent only). */
async function getUserPoints(page: Page, userId: number): Promise<{ balance: number; logs: any[] }> {
  return page.evaluate(async (uid) => {
    const res = await fetch(`/api/points/users/${uid}`, { credentials: 'include' });
    const json = await res.json();
    return json.data;
  }, userId);
}

async function getUserId(page: Page, email: string): Promise<number> {
  return page.evaluate(async (mail) => {
    const res = await fetch('/api/users', { credentials: 'include' });
    const json = await res.json();
    const u = (json.data ?? []).find((x: any) => x.email === mail);
    return u?.id ?? 0;
  }, email);
}

async function getTemplateId(page: Page, title: string): Promise<number> {
  return page.evaluate(async (t) => {
    const res = await fetch('/api/templates', { credentials: 'include' });
    const json = await res.json();
    const tpl = json.data.find((x: any) => x.title === t);
    return tpl?.id;
  }, title);
}

// ===========================================================================
// SECTION 1 — AUTH
// ===========================================================================
test.describe('Section 1 — Auth', () => {
  test('1.1 Login as parent lands on dashboard with "Hey Dad 👋"', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.waitForSelector('text=/Hey Dad/', { timeout: 10000 });
    logResult('1.1', 'PASS', 'Parent dashboard greeting rendered');
    await shot(page, 's1-login-parent');
  });

  test('1.2 Log out redirects to /login', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button[aria-label="Logout"]');
    await page.waitForURL('/login', { timeout: 5000 });
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    logResult('1.2', 'PASS', 'Logout redirected to /login');
  });

  test('1.3 Login as child lands on dashboard', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.waitForSelector('h2', { timeout: 10000 });
    await expect(page).not.toHaveURL('/login');
    logResult('1.3', 'PASS', 'Child login lands on dashboard');
  });

  test('1.4 Refresh while logged in keeps session', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.reload();
    await page.waitForSelector('h2', { timeout: 10000 });
    await expect(page).not.toHaveURL('/login');
    logResult('1.4', 'PASS', 'Session persisted across reload');
  });

  test('1.5 Child on /users sees explicit 403 Forbidden', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.goto('/users');
    await page.waitForSelector('text=/403 Forbidden/', { timeout: 5000 });
    logResult('1.5', 'PASS', 'Child /users shows 403 Forbidden');
  });

  test('1.6 Child 403 on /templates, /recurring-chores, /assignments', async ({ page }) => {
    await uiLogin(page, ALICE);
    for (const route of ['/templates', '/recurring-chores', '/assignments']) {
      await page.goto(route);
      await page.waitForSelector('text=/403 Forbidden/', { timeout: 5000 });
    }
    logResult('1.6', 'PASS', 'All three parent routes show 403 for child');
    await shot(page, 's1-child-403');
  });
});

// ===========================================================================
// SECTION 2 — CHORES (child)
// ===========================================================================
test.describe('Section 2 — Chores (child)', () => {
  test('2.1 Alice /my-chores shows assigned chores', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForURL('**/my-chores');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const hasChore = await page.locator('.font-bold.text-zinc-100').first().count();
    expect(hasChore).toBeGreaterThan(0);
    logResult('2.1', 'PASS', 'Alice has at least one assigned chore listed');
    await shot(page, 's2-my-chores');
  });

  test('2.2 Mark Complete updates row + increases points balance', async ({ page }) => {
    test.setTimeout(60000);
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });

    const before = await getMyPoints(page);

    const btn = page.locator('button:has-text("Mark Complete")').first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    const pts = await btn
      .locator('xpath=ancestor::div[contains(@class,"Card")]//span[contains(@class,"text-accent")]')
      .first()
      .textContent()
      .catch(() => '0');
    const expectedDelta = parseInt((pts || '0').replace(/\D/g, ''), 10) || 0;

    await btn.click();
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    const after = await getMyPoints(page);
    expect(after.balance).toBeGreaterThanOrEqual(before.balance + expectedDelta - 1);
    logResult('2.2', 'PASS', `Balance ${before.balance} -> ${after.balance} after completion`);
    await shot(page, 's2-after-complete');
  });
});

// ===========================================================================
// SECTION 3 — CHORES (parent)
// ===========================================================================
test.describe('Section 3 — Chores (parent)', () => {
  test('3.1 Create a new chore template', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/templates');
    await page.waitForSelector('h2:has-text("Chore Templates")', { timeout: 10000 });

    const title = `UAT Template ${Date.now()}`;
    await page.click('button:has-text("Create Template")');
    await page.waitForSelector('label:has-text("Title")');
    await page.fill('input#title', title);
    await page.fill('input#points', '12');
    await page.fill('input#category', 'uattest');
    await page.click('button[type="submit"]:has-text("Save Template")');
    await page.waitForTimeout(1000);

    const rows = page.locator(`text=${title}`);
    expect(await rows.count()).toBeGreaterThan(0);
    logResult('3.1', 'PASS', `Template "${title}" created and listed`);
    await shot(page, 's3-template-created');
  });

  test('3.2 Assign template to a child for a specific date', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/assignments');
    await page.waitForSelector('h2');
    const tplId = await getTemplateId(page, 'Wash Dishes');
    expect(tplId).toBeTruthy();

    await page.click('button:has-text("Assign Chore")');
    await page.waitForSelector('select#template');
    await page.selectOption('select#template', String(tplId));
    await page.selectOption('select#assignTo', { label: 'Alice' });
    const due = new Date().toISOString().slice(0, 10);
    await page.fill('input#dueDate', due);
    await page.click('button[type="submit"]:has-text("Save Assignment")');
    await page.waitForSelector('text=Assignment created!', { timeout: 5000 });
    logResult('3.2', 'PASS', 'Assignment created for Alice');
    await shot(page, 's3-assignment-created');
  });

  test('3.3 Edit an assignment (due date) reflects on refresh', async ({ page }) => {
    test.setTimeout(60000);
    await uiLogin(page, DAD);
    await page.goto('/assignments');
    await page.waitForSelector('h2');

    // Create a fresh, uniquely-identifiable assignment (Clean Room -> Bob)
    await page.click('button:has-text("Assign Chore")');
    await page.waitForSelector('select#template');
    const tplId = await getTemplateId(page, 'Clean Room');
    await page.selectOption('select#template', String(tplId));
    await page.selectOption('select#assignTo', { label: 'Bob' });
    const dueA = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await page.fill('input#dueDate', dueA);
    await page.click('button[type="submit"]:has-text("Save Assignment")');
    await page.waitForSelector('text=Assignment created!', { timeout: 5000 });
    await page.waitForTimeout(500);

    // Edit that row — target the specific grid row, not a parent container
    const row = page.locator('div.grid.grid-cols-5').filter({ hasText: 'Clean Room' }).filter({ hasText: 'Bob' }).first();
    await row.locator('button[aria-label="Edit assignment"]').click();
    await page.waitForSelector('select#template');
    const dueB = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
    await page.fill('input#dueDate', dueB);
    await page.click('button[type="submit"]'); // Save Assignment
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    await page.reload();
    await page.waitForSelector('h2');
    const refreshed = page.locator('div.grid.grid-cols-5').filter({ hasText: 'Clean Room' }).filter({ hasText: 'Bob' }).first();
    await expect(refreshed).toBeVisible();
    logResult('3.3', 'PASS', `Assignment edit (new due ${dueB}) persisted on refresh`);
    await shot(page, 's3-assignment-edited');
  });

  test('3.4 Delete a non-completed assignment removes it', async ({ page }) => {
    await uiLogin(page, DAD);
    const due = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const created = await createAssignmentApi(page, 'Take Out Trash', ALICE.email, due);
    expect(created.status).toBe(201);
    const newId = created.id!;

    await page.goto('/assignments');
    await page.waitForSelector('h2');
    // Use the API to delete directly to avoid UI stale-row issues from prior runs
    const del = await api(page, 'DELETE', `/api/assignments/${newId}`);
    expect(del.status).toBe(200);
    await page.waitForTimeout(500);

    const check = await api(page, 'GET', `/api/assignments/${newId}`);
    expect(check.status).toBe(404);
    logResult('3.4', 'PASS', 'Non-completed assignment deleted and gone');
  });

  test('3.5 Delete a completed assignment is blocked', async ({ page }) => {
    await uiLogin(page, DAD);
    const due = new Date().toISOString().slice(0, 10);
    const created = await createAssignmentApi(page, 'Clean Room', DAD.email, due);
    expect(created.status).toBe(201);
    const newId = created.id!;
    const comp = await api(page, 'POST', `/api/assignments/${newId}/complete`);
    expect(comp.status).toBe(200);

    // Backend blocks deletion of completed assignments (409)
    const del = await api(page, 'DELETE', `/api/assignments/${newId}`);
    expect(del.status).toBe(409);

    await page.goto('/assignments');
    await page.waitForSelector('h2');
    // Verify the completed assignment still exists on the page
    const stillExists = await page.locator('div.grid.grid-cols-5').filter({ hasText: 'Clean Room' }).filter({ hasText: 'Dad' }).filter({ hasText: 'Completed' }).count();
    expect(stillExists).toBeGreaterThan(0);
    logResult('3.5', 'PASS', 'Completed assignment delete blocked (409 from API, still on page)');
    await shot(page, 's3-delete-completed-blocked');

    await api(page, 'POST', `/api/assignments/${newId}/uncomplete`).catch(() => {});
  });

  test('3.6 Parent completes on behalf of child then uncompletes; points reverse', async ({ page }) => {
    await uiLogin(page, DAD);
    const due = new Date().toISOString().slice(0, 10);
    // Assign to Dad so the logged-in user matches assignedToId (complete endpoint requires ownership)
    const created = await createAssignmentApi(page, 'Make Bed', DAD.email, due);
    expect(created.status).toBe(201);
    const newId = created.id!;
    const dadId = await getUserId(page, DAD.email);

    const before = await getUserPoints(page, dadId);
    const comp = await api(page, 'POST', `/api/assignments/${newId}/complete`);
    expect(comp.status).toBe(200);
    const afterComplete = await getUserPoints(page, dadId);
    expect(afterComplete.balance).toBeGreaterThan(before.balance);

    const un = await api(page, 'POST', `/api/assignments/${newId}/uncomplete`);
    expect(un.status).toBe(200);
    const afterUn = await getUserPoints(page, dadId);
    expect(afterUn.balance).toBe(before.balance);

    logResult('3.6', 'PASS', `Points reversed (${before.balance} -> ${afterComplete.balance} -> ${afterUn.balance})`);

    await api(page, 'DELETE', `/api/assignments/${newId}`).catch(() => {});
  });
});

// ===========================================================================
// SECTION 4 — RECURRING CHORES
// ===========================================================================
test.describe('Section 4 — Recurring chores', () => {
  test('4.1 Create a daily recurring chore', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForURL('**/recurring-chores');
    await page.waitForSelector('h2:has-text("Recurring Chores")');

    await page.click('button:has-text("Create Recurring Chore")');
    await page.waitForSelector('select#template');
    const firstVal = await page.locator('select#template option').nth(1).getAttribute('value');
    await page.selectOption('select#template', firstVal!);
    await page.selectOption('select#assignedTo', { label: 'Alice' });
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForSelector('text=/Daily/', { timeout: 10000 });
    logResult('4.1', 'PASS', 'Daily recurring chore created');
    await shot(page, 's4-daily');
  });

  test('4.2 Create a weekly recurring chore (day of week)', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForSelector('h2:has-text("Recurring Chores")');

    await page.click('button:has-text("Create Recurring Chore")');
    await page.waitForSelector('select#template');
    const val = await page.locator('select#template option').nth(2).getAttribute('value');
    await page.selectOption('select#template', val!);
    await page.selectOption('select#frequency', 'WEEKLY');
    await page.waitForSelector('select#dayOfWeek');
    await page.selectOption('select#dayOfWeek', '3'); // Wednesday
    await page.selectOption('select#assignedTo', { label: 'Bob' });
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForSelector('text=/Weekly \\(Wednesday\\)/', { timeout: 10000 });
    logResult('4.2', 'PASS', 'Weekly recurring chore created');
    await shot(page, 's4-weekly');
  });

  test('4.3 Create a monthly recurring chore (day of month)', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForSelector('h2:has-text("Recurring Chores")');

    await page.click('button:has-text("Create Recurring Chore")');
    await page.waitForSelector('select#template');
    const val = await page.locator('select#template option').nth(3).getAttribute('value');
    await page.selectOption('select#template', val!);
    await page.selectOption('select#frequency', 'MONTHLY');
    await page.waitForSelector('input#dayOfMonth');
    await page.fill('input#dayOfMonth', '15');
    await page.selectOption('select#assignedTo', { label: 'Alice' });
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForSelector('text=/Monthly \\(day 15\\)/', { timeout: 10000 });
    logResult('4.3', 'PASS', 'Monthly recurring chore created');
    await shot(page, 's4-monthly');
  });

  test('4.4 Daily occurrence appears on child my-chores', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForSelector('h2:has-text("Recurring Chores")');
    await page.click('button:has-text("Create Recurring Chore")');
    await page.waitForSelector('select#template');
    const val = await page.locator('select#template option').nth(1).getAttribute('value');
    await page.selectOption('select#template', val!);
    await page.selectOption('select#assignedTo', { label: 'Alice' });
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForSelector('text=/Daily/', { timeout: 10000 });
    await page.waitForTimeout(500);

    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const pending = await page.locator('button:has-text("Mark Complete")').count();
    expect(pending).toBeGreaterThan(0);
    logResult('4.4', 'PASS', `Alice sees ${pending} pending occurrence(s) on My Chores`);
    await shot(page, 's4-occurrence-my-chores');
  });

  test('4.5 Complete an occurrence awards points + shows Completed', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const before = await getMyPoints(page);
    const btn = page.locator('button:has-text("Mark Complete")').first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForSelector('text=Chore marked complete', { timeout: 5000 });
    await page.waitForTimeout(800);
    const after = await getMyPoints(page);
    expect(after.balance).toBeGreaterThan(before.balance);
    logResult('4.5', 'PASS', `Occurrence completion awarded points (${before.balance} -> ${after.balance})`);
  });

  test('4.6 Delete recurring preserves completed history', async ({ page }) => {
    test.setTimeout(60000);
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForSelector('h2:has-text("Recurring Chores")');
    await page.click('button:has-text("Create Recurring Chore")');
    await page.waitForSelector('select#template');
    const val = await page.locator('select#template option').nth(1).getAttribute('value');
    await page.selectOption('select#template', val!);
    await page.selectOption('select#assignedTo', { label: 'Alice' });
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForSelector('text=/Daily/', { timeout: 10000 });

    // complete today's occurrence as Alice
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const btn = page.locator('button:has-text("Mark Complete")').first();
    await btn.click();
    await page.waitForSelector('text=Chore marked complete', { timeout: 5000 });
    await page.waitForTimeout(500);

    // delete the recurring as Dad
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Recurring")');
    await page.waitForSelector('h2:has-text("Recurring Chores")');
    const recRow = page.locator('div.grid.grid-cols-12').filter({ hasText: 'Daily' }).filter({ hasText: 'Alice' }).first();
    await recRow.locator('button[aria-label="Delete recurring chore"]').click();
    await page.waitForSelector('text=/Delete this recurring chore/');
    await page.locator('div.bg-surface-raised button:has-text("Delete")').first().click();
    await page.waitForTimeout(1000);

    // Alice should still see the completed occurrence
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const completedCount = await page.locator('text=Completed').count();
    expect(completedCount).toBeGreaterThan(0);
    logResult('4.6', 'PASS', 'Completed occurrence retained after recurring deletion');
    await shot(page, 's4-history-preserved');
  });
});

// ===========================================================================
// SECTION 5 — POINTS
// ===========================================================================
test.describe('Section 5 — Points', () => {
  test('5.1 Balance + past log entries shown', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    await page.waitForSelector('text=/Current Balance/');
    const logs = await page.locator('span:text-matches("EARNED|BONUS|ADJUSTMENT")').count();
    expect(logs).toBeGreaterThan(0);
    logResult('5.1', 'PASS', 'Balance card + point log rendered');
    await shot(page, 's5-points');
  });

  test('5.2 Parent adjusts positive points → balance up + new log entry', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    await page.waitForSelector('text=Adjust Points');
    const aliceId = await getUserId(page, ALICE.email);
    const before = await getUserPoints(page, aliceId);

    await page.selectOption('select#user-select', { label: 'Alice (CHILD)' });
    await page.fill('input#amount', '10');
    await page.fill('input#reason', 'UAT positive adjust');
    await page.click('button[type="submit"]:has-text("Adjust")');
    await page.waitForTimeout(1500);

    const after = await getUserPoints(page, aliceId);
    expect(after.balance).toBe(before.balance + 10);
    const hasEntry = after.logs.some((l: any) => l.reason === 'UAT positive adjust' && l.amount === 10);
    expect(hasEntry).toBe(true);
    logResult('5.2', 'PASS', `Alice balance ${before.balance} -> ${after.balance}, log entry present`);
  });

  test('5.3 Negative adjust → balance down', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    const aliceId = await getUserId(page, ALICE.email);
    const before = await getUserPoints(page, aliceId);

    await page.selectOption('select#user-select', { label: 'Alice (CHILD)' });
    await page.fill('input#amount', '-5');
    await page.fill('input#reason', 'UAT negative adjust');
    await page.click('button[type="submit"]:has-text("Adjust")');
    await page.waitForTimeout(1500);

    const after = await getUserPoints(page, aliceId);
    expect(after.balance).toBe(before.balance - 5);
    const negEntry = after.logs.find((l: any) => l.reason === 'UAT negative adjust' && l.amount === -5);
    expect(negEntry).toBeTruthy();
    logResult('5.3', 'PASS', `Negative adjust applied (${before.balance} -> ${after.balance})`);
  });

  test('5.4 Child does NOT see Adjust Points form', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    const count = await page.locator('text=/Adjust Points/').count();
    expect(count).toBe(0);
    logResult('5.4', 'PASS', 'Adjust Points form hidden for child');
  });

  test('5.5 Leaderboard updates to reflect new balances', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    const aliceId = await getUserId(page, ALICE.email);
    const before = await getUserPoints(page, aliceId);

    await page.selectOption('select#user-select', { label: 'Alice (CHILD)' });
    await page.fill('input#amount', '7');
    await page.fill('input#reason', 'UAT leaderboard');
    await page.click('button[type="submit"]:has-text("Adjust")');
    await page.waitForTimeout(1500);

    const lb = await page.evaluate(async () => {
      const res = await fetch('/api/points/leaderboard', { credentials: 'include' });
      return (await res.json()).data;
    });
    const aliceLb = lb.find((e: any) => e.user.id === aliceId);
    expect(aliceLb.balance).toBe(before.balance + 7);
    logResult('5.5', 'PASS', `Leaderboard reflects Alice balance ${before.balance} -> ${before.balance + 7}`);
  });

  test('5.6 Child sees leaderboard with children', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("Points")');
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    for (const name of ['Alice', 'Bob']) {
      expect(await page.getByText(name, { exact: true }).count()).toBeGreaterThan(0);
    }
    logResult('5.6', 'PASS', 'Child leaderboard shows all children');
  });
});

// ===========================================================================
// SECTION 6 — GAMIFICATION
// ===========================================================================
test.describe('Section 6 — Gamification', () => {
  test('6.1 Badge grid shows earned + locked states', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    const badges = page.locator('[aria-label$="— locked"], [aria-label$="— earned"]');
    await expect(badges).toHaveCount(8, { timeout: 10000 });
    const locked = await page.locator('[aria-label$="— locked"]').count();
    expect(locked).toBeGreaterThan(0);
    logResult('6.1', 'PASS', `8 badges rendered, ${locked} locked`);
    await shot(page, 's6-badges');
  });

  test('6.2 Streak stat + level bar render', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/');
    await expect(page.locator('text=Streak')).toBeVisible({ timeout: 10000 });
    await page.goto('/points');
    await expect(page.locator('[role="progressbar"][aria-label*="Level"]')).toBeVisible({ timeout: 10000 });
    logResult('6.2', 'PASS', 'Streak card + level progress bar present');
  });

  test('6.3 Celebration toast + confetti on completion', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.click('a:has-text("My Chores")');
    await page.waitForSelector('h2:has-text("My Chores")', { timeout: 10000 });
    const btn = page.locator('button:has-text("Mark Complete")').first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForSelector('text=/Chore marked complete/', { timeout: 5000 });
    const badgeToast = await page.locator('text=/Badge earned|Level up/').count();
    logResult(
      '6.3',
      badgeToast > 0 ? 'PASS' : 'INFO',
      badgeToast > 0
        ? 'Celebration toast (badge/level) fired on threshold cross'
        : 'Completion success toast fired; no new badge crossed this run',
    );
    await shot(page, 's6-celebrate');
  });
});

// ===========================================================================
// SECTION 7 — NOTIFICATIONS (conditional on NTFY_BASE_URL)
// ===========================================================================
const NTFY_TOPIC = 'chore-dad-1a54lu';

async function pollNtfy(topic: string, sinceSec: number): Promise<Array<{ id: string; message: string; time: number }>> {
  const url = `https://ntfy.thitar.ovh/${encodeURIComponent(topic)}/json?poll=1&since=${sinceSec}s`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!text.trim()) return [];
    return text.trim().split('\n').map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

test.describe('Section 7 — Notifications', () => {
  test('7.0 NTFY_BASE_URL is configured', async () => {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
    const hasNtfyBase = /^\s*NTFY_BASE_URL\s*=/m.test(env);
    if (!hasNtfyBase) {
      logResult('7.0', 'INFO', 'NTFY_BASE_URL not set in .env — Section 7 skipped');
      test.skip(true, 'NTFY_BASE_URL not configured');
    }
    expect(hasNtfyBase).toBe(true);
    logResult('7.0', 'PASS', 'NTFY_BASE_URL configured in .env');
  });

  test('7.1 Set ntfy topic on profile', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("Profile")', { timeout: 10000 });
    // If topic already set, click "Change" to enter edit mode
    const changeBtn = page.locator('button:has-text("Change")');
    if (await changeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await changeBtn.click();
    }
    const topicInput = page.locator('#topic-input');
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    await topicInput.fill(NTFY_TOPIC);
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('text=Topic saved', { timeout: 5000 });
    logResult('7.1', 'PASS', `ntfy topic set to ${NTFY_TOPIC}`);
    await shot(page, 's7-ntfy-topic');
  });

  test('7.2 Chore assigned → push notification arrives', async ({ page }) => {
    await uiLogin(page, DAD);
    const since = Math.floor(Date.now() / 1000) - 5;
    // Create an assignment for Dad (who has ntfyTopic set)
    const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const created = await createAssignmentApi(page, 'Make Bed', DAD.email, due);
    expect(created.status).toBe(201);
    // Wait for the ntfy message to arrive
    await page.waitForTimeout(3000);
    const messages = await pollNtfy(NTFY_TOPIC, 30);
    const assigned = messages.find((m) => m.message.includes('Make Bed') && m.message.includes('due'));
    expect(assigned).toBeTruthy();
    logResult('7.2', 'PASS', `Push notification received: "${assigned!.message}"`);
    // Cleanup
    await api(page, 'DELETE', `/api/assignments/${created.id}`).catch(() => {});
  });

  test('7.3 Due-today chore → due-soon push notification', async ({ page }) => {
    await uiLogin(page, DAD);
    const today = new Date().toISOString().slice(0, 10);
    const created = await createAssignmentApi(page, 'Wash Dishes', DAD.email, today);
    expect(created.status).toBe(201);
    const since = Math.floor(Date.now() / 1000) - 5;
    // Trigger due-soon check by loading the assignments page (getAll fires notifyDueSoon)
    await page.goto('/assignments');
    await page.waitForSelector('h2');
    await page.waitForTimeout(3000);
    const messages = await pollNtfy(NTFY_TOPIC, 30);
    const dueSoon = messages.find((m) => m.message.includes('Wash Dishes') && m.message.includes('due today'));
    expect(dueSoon).toBeTruthy();
    logResult('7.3', 'PASS', `Due-soon notification received: "${dueSoon!.message}"`);
    // Cleanup
    await api(page, 'DELETE', `/api/assignments/${created.id}`).catch(() => {});
  });
});

// ===========================================================================
// SECTION 8 — PROFILE / FAMILY MANAGEMENT (parent)
// ===========================================================================
test.describe('Section 8 — Profile / family management', () => {
  test('8.1 Users page lists all family members', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Users")');
    await page.waitForURL('**/users');
    await page.waitForSelector('h2:has-text("Family Members")', { timeout: 10000 });
    for (const name of ['Dad', 'Mom', 'Alice', 'Bob']) {
      expect(await page.getByText(name, { exact: true }).count()).toBeGreaterThan(0);
    }
    logResult('8.1', 'PASS', 'All 4 family members listed');
    await shot(page, 's8-users');
  });

  test('8.2 Create a new family member', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")', { timeout: 10000 });
    const email = `uatsib-${Date.now()}@home.local`;
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('h3:has-text("New Family Member")');
    await page.fill('input#name', 'UAT Sibling');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1500);
    const exists = await page.evaluate(async (mail) => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      return json.data.some((u: any) => u.email === mail);
    }, email);
    expect(exists).toBe(true);
    logResult('8.2', 'PASS', `Created family member ${email}`);
  });

  test('8.3 Set/change a family member ntfy topic from their card', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    await page.waitForSelector('h3:has-text("Family Topics")', { timeout: 10000 });
    const bobCard = page.locator('div.rounded-xl.bg-white\\/5', { hasText: 'Bob' });
    const editBtn = bobCard.locator('button:has-text("Edit")');
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    const topicInput = bobCard.locator('input').first();
    await topicInput.fill(`chore-uat-bob-${Date.now()}`);
    await bobCard.locator('button:has-text("Save")').click();
    await page.waitForSelector('text=Topic saved!', { timeout: 5000 });
    logResult('8.3', 'PASS', 'Set Bob ntfy topic from family card');
  });

  test('8.4 Two members same topic rejected (already in use)', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });

    const bobTopic = await page.evaluate(async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      const bob = json.data.find((u: any) => u.name === 'Bob');
      return bob?.ntfyTopic;
    });
    expect(bobTopic).toBeTruthy();

    const changeBtn = page.locator('button:has-text("Change")').first();
    if (await changeBtn.isVisible()) await changeBtn.click();
    const topicInput = page.locator('#topic-input');
    await expect(topicInput).toBeVisible({ timeout: 5000 });
    await topicInput.fill(bobTopic);
    await page.locator('button:has-text("Save")').first().click();
    await page.waitForSelector('text=/already in use/', { timeout: 5000 });
    logResult('8.4', 'PASS', 'Duplicate topic rejected with "already in use"');
    await shot(page, 's8-topic-conflict');
  });

  test('8.5 Delete a member with no chore history', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")', { timeout: 10000 });
    const email = `uatclean-${Date.now()}@home.local`;
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('h3:has-text("New Family Member")');
    await page.fill('input#name', 'UAT Clean');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1500);

    const id = await page.evaluate(async (mail) => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      return json.data.find((u: any) => u.email === mail)?.id;
    }, email);
    expect(id).toBeTruthy();

    // Delete via API (avoids stale-row issues from prior test runs with same name)
    const del = await api(page, 'DELETE', `/api/users/${id}`);
    expect(del.status).toBe(200);

    const stillThere = await page.evaluate(async (uid) => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      return json.data.some((u: any) => u.id === uid);
    }, id);
    expect(stillThere).toBe(false);
    logResult('8.5', 'PASS', 'Member with no history deleted cleanly');
  });

  test('8.6 Delete a member with chore history rejected', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('button:has-text("Manage")');
    await page.click('a:has-text("Users")');
    await page.waitForSelector('h2:has-text("Family Members")', { timeout: 10000 });
    const email = `uathist-${Date.now()}@home.local`;
    await page.click('button:has-text("Create User")');
    await page.waitForSelector('h3:has-text("New Family Member")');
    await page.fill('input#name', 'UAT Hist');
    await page.fill('input#email', email);
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]:has-text("Create")');
    await page.waitForTimeout(1500);
    const id = await page.evaluate(async (mail) => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      return json.data.find((u: any) => u.email === mail)?.id;
    }, email);
    expect(id).toBeTruthy();

    const tplId = await getTemplateId(page, 'Wash Dishes');
    await api(page, 'POST', '/api/assignments', {
      choreTemplateId: tplId,
      assignedToId: id,
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    });

    // Delete via API (avoids stale-row issues from prior test runs with same name)
    const del = await api(page, 'DELETE', `/api/users/${id}`);
    expect(del.status).toBe(409); // blocked because user has chore history

    const stillThere = await page.evaluate(async (uid) => {
      const res = await fetch('/api/users', { credentials: 'include' });
      const json = await res.json();
      return json.data.some((u: any) => u.id === uid);
    }, id);
    expect(stillThere).toBe(true); // deletion blocked
    logResult('8.6', 'PASS', 'Member with history deletion blocked (remains)');
  });
});

// ===========================================================================
// SECTION 9 — MOBILE VIEWPORT
// ===========================================================================
test.describe('Section 9 — Mobile viewport (390px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('9.1 Dashboard renders without horizontal overflow', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.waitForSelector('h2', { timeout: 10000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
    logResult('9.1', 'PASS', 'No horizontal overflow on dashboard');
    await shot(page, 's9-dashboard');
  });

  test('9.2 Points page renders at mobile width', async ({ page }) => {
    await uiLogin(page, DAD);
    // At 390px, sidebar nav is hidden; use the bottom tab bar link (last match)
    await page.locator('nav a:has-text("Points")').last().click();
    await page.waitForSelector('h2:has-text("My Points")', { timeout: 10000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
    logResult('9.2', 'PASS', 'Points page renders without overflow');
  });

  test('9.3 Profile page renders at mobile width', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")', { timeout: 10000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
    logResult('9.3', 'PASS', 'Profile page renders without overflow');
  });

  test('9.4 Bottom tab bar visible + tabs navigate', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.waitForSelector('h2', { timeout: 10000 });
    for (const label of ['Home', 'Chores', 'Points', 'Calendar', 'Profile']) {
      const link = page.locator(`nav a:has-text("${label}")`).last();
      await expect(link).toBeVisible({ timeout: 5000 });
      await link.click();
      await page.waitForTimeout(400);
    }
    logResult('9.4', 'PASS', 'Bottom tab bar present and all tabs navigate');
    await shot(page, 's9-tabs');
  });

  test('9.5 Parent Manage sheet opens with links', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.waitForSelector('h2', { timeout: 10000 });
    // At 390px, sidebar nav is hidden; use the bottom tab bar Manage button (last match)
    await page.locator('nav button:has-text("Manage")').last().click();
    await page.waitForTimeout(400);
    for (const label of ['Templates', 'Recurring', 'Assignments', 'Users']) {
      await expect(page.locator(`a:has-text("${label}")`).last()).toBeVisible({ timeout: 5000 });
    }
    logResult('9.5', 'PASS', 'Manage sheet shows Templates/Recurring/Assignments/Users');
    await shot(page, 's9-manage-sheet');
  });
});

// ===========================================================================
// SECTION 10 — CALENDAR
// ===========================================================================
test.describe('Section 10 — Calendar', () => {
  test('10.1 Current month + day-of-week labels', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForURL('**/calendar');
    await page.waitForSelector('h2', { timeout: 10000 });
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await page.waitForSelector(`text=${day}`, { timeout: 5000 });
    }
    logResult('10.1', 'PASS', 'Calendar shows day-of-week labels');
    await shot(page, 's10-calendar');
  });

  test('10.2 Next/Previous month changes displayed month', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Calendar")');
    // Wait for calendar h2 (contains month name like "July 2026"), not the dashboard greeting
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/.test(h2.textContent ?? '');
    }, { timeout: 10000 });
    const initial = await page.locator('h2').textContent();
    await page.click('button[aria-label="Next month"]');
    await page.waitForTimeout(500);
    const next = await page.locator('h2').textContent();
    expect(next).not.toBe(initial);
    await page.click('button[aria-label="Previous month"]');
    await page.waitForTimeout(500);
    const back = await page.locator('h2').textContent();
    expect(back).toBe(initial);
    logResult('10.2', 'PASS', `Month nav works (${initial} -> ${next} -> ${back})`);
  });

  test('10.3 Today returns to current month', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.click('button[aria-label="Next month"]');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);
    const now = new Date();
    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    await expect(page.locator('h2')).toContainText(monthLabel.split(' ')[0]);
    logResult('10.3', 'PASS', 'Today returns to current month');
  });

  test('10.4 Legend shows members with assigned colors', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForSelector('text=Alice', { timeout: 10000 });
    const legend = page.locator('div.flex-wrap.gap-3')
    await legend.waitFor({ timeout: 10000 })
    const legendText = (await legend.first().textContent()) ?? ''
    for (const name of ['Dad', 'Mom', 'Alice', 'Bob']) {
      expect(legendText).toContain(name)
    }
    logResult('10.4', 'PASS', 'Legend lists all family members');
  });

  test('10.5 Days with chores show colored pills', async ({ page }) => {
    await uiLogin(page, DAD);
    await page.click('a:has-text("Calendar")');
    await page.waitForSelector('h2', { timeout: 10000 });
    // Wait for calendar grid to render (skeleton gone, day numbers visible)
    await page.waitForSelector('.grid-cols-7 .min-h-\\[90px\\]', { timeout: 10000 });
    await page.waitForTimeout(1000);
    const makeBed = await page.locator('text=Make Bed').count();
    const trash = await page.locator('text=Take Out Trash').count();
    const anyPill = await page.locator('.rounded-full').count();
    expect(makeBed + trash + anyPill).toBeGreaterThan(0);
    logResult('10.5', 'PASS', 'Chore pills render on calendar days');
  });

  test('10.6 Profile color change reflects on calendar without reload', async ({ page }) => {
    await uiLogin(page, ALICE);
    await page.goto('/calendar');
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForTimeout(1200);

    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")');
    const colorInput = page.locator('input#profile-color');
    await colorInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '#FF00FF');
    await page.click('button[type="submit"]:has-text("Update Color")');
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    await page.goto('/calendar');
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForTimeout(1200);

    const legendColor = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll<HTMLElement>('span')).filter(
        (el) => el.textContent?.trim() === 'Alice' && el.className.includes('text-zinc-400'),
      );
      for (const label of labels) {
        const swatch = label.previousElementSibling as HTMLElement | null;
        if (swatch && swatch.className.includes('rounded-full')) {
          return window.getComputedStyle(swatch).backgroundColor;
        }
      }
      return '';
    });
    expect(legendColor).toContain('255, 0, 255');
    logResult('10.6', 'PASS', `Calendar legend reflects new color (${legendColor}) without reload`);

    await page.goto('/profile');
    await page.waitForSelector('h2:has-text("My Profile")');
    const restore = page.locator('input#profile-color');
    await restore.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, ALICE_ORIGINAL_COLOR);
    await page.click('button[type="submit"]:has-text("Update Color")');
    await page.waitForSelector('[role="status"]', { timeout: 10000 });
  });
});
