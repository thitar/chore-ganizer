import { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_DIR = path.join(__dirname, '..', '.auth')

interface Credentials {
  email: string
  password: string
}

function authFileFor(email: string): string {
  const name = email.split('@')[0] // dad, mom, alice, bob
  return path.join(AUTH_DIR, `${name}.json`)
}

// Loads a pre-authenticated session saved by e2e/auth.setup.ts instead of
// performing a fresh UI login per test. backend/src/middleware/rateLimiter.ts's
// authLimiter caps POST /api/auth/login at 10 req/15min; the old pattern of
// every test independently driving the login form made 50+ real login
// requests from the same IP and got rate-limited well before a full suite
// run finished. The setup project logs in once per seeded user instead.
export async function login(page: Page, user: Credentials): Promise<void> {
  const file = authFileFor(user.email)
  if (!fs.existsSync(file)) {
    throw new Error(
      `No saved auth state for ${user.email} at ${file} — the "setup" project ` +
      `(e2e/auth.setup.ts) must run first; it's wired as a dependency of the ` +
      `chromium project in playwright.config.ts, so a plain "npx playwright test" ` +
      `run should trigger it automatically.`
    )
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf-8'))
  await page.context().addCookies(state.cookies)
  await page.goto('/')
}
