import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --port 3000',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: true,
  },
})
