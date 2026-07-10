import { test as setup } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_DIR = path.join(__dirname, '.auth')
fs.mkdirSync(AUTH_DIR, { recursive: true })

// One real UI login per seeded user, saved as browser storage state and
// reused by every spec via e2e/helpers/auth.ts's login() — see that file's
// comment for why (POST /api/auth/login is rate-limited to 10 req/15min).
const USERS = [
  { name: 'dad', email: 'dad@home.local', password: 'password123' },
  { name: 'mom', email: 'mom@home.local', password: 'password123' },
  { name: 'alice', email: 'alice@home.local', password: 'password123' },
  { name: 'bob', email: 'bob@home.local', password: 'password123' },
]

for (const user of USERS) {
  setup(`authenticate as ${user.name}`, async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 10000 })
    await page.context().storageState({ path: path.join(AUTH_DIR, `${user.name}.json`) })
  })
}
