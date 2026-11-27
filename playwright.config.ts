import { defineConfig, devices } from '@playwright/test';

// E2E tests run the UI in a plain browser (`npm run dev`): the platform layer falls back to
// localStorage and browser dialogs, so no Tauri build is needed. See src/platform/browser.ts.
// Own port, so a running `npm run dev` / `tauri dev` (1420) is never mistaken for the test server.
const PORT = 14_290;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', locale: 'es-ES' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
