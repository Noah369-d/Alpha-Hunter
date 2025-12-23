import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'

test('HoloResonance smoke and screenshot', async ({ page }) => {
  await page.goto(`${BASE}/holo`)

  // Wait for demo rows to appear
  await page.waitForSelector('.stock-grid-row', { timeout: 5000 })

  // take full page screenshot for PR preview
  await page.screenshot({ path: 'e2e/holo-resonance-snapshot.png', fullPage: true })

  const count = await page.$$eval('.stock-grid-row', els => els.length)
  expect(count).toBeGreaterThan(0)
})
