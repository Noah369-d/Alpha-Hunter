// Playwright E2E sample - requires Playwright to be installed
// Usage: npm i -D @playwright/test && npx playwright install && npx playwright test e2e/alpha-pro.spec.js --headed
import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('Alpha Pro smoke and screenshot', async ({ page }) => {
  await page.goto(`${BASE}/alpha-pro`)
  await page.fill('textarea, input[type=text], input', 'AAA,BBB,CCC')
  await page.click('text=扫描')
  // wait for results list to populate
  await page.waitForSelector('.scan-results .scan-table tbody tr', { timeout: 5000 })
  await page.screenshot({ path: 'e2e/alpha-pro-snapshot.png', fullPage: true })
  const count = await page.$$eval('.scan-results .scan-table tbody tr', els => els.length)
  expect(count).toBeGreaterThan(0)
})
