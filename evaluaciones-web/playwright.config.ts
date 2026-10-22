import { defineConfig, devices } from '@playwright/test'

// E2E (Req 6, 7, 8, 9). Requiere la API en :3000 y el frontend (Vite) en :5173,
// con la base migrada y sembrada. Playwright levanta el dev server del frontend.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
