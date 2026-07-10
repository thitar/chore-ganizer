import { Page } from '@playwright/test'

// Tests that call fetch() directly inside page.evaluate() (to avoid fragile
// form interaction) bypass the app's own axios CSRF interceptor entirely —
// backend/src/middleware/csrf.ts rejects any mutating request (POST/PUT/
// PATCH/DELETE) missing a matching x-xsrf-token header with 403. Read the
// cookie Playwright already holds and pass it in explicitly.
export async function getCsrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value
  if (!token) {
    throw new Error('No XSRF-TOKEN cookie found — visit a page before calling getCsrfToken()')
  }
  return token
}
