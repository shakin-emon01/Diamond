import { defineConfig, devices } from "@playwright/test";

const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === "true";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3006",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3006",
    port: 3006,
    reuseExistingServer: true,
    timeout: 180000
  },
  projects: fullMatrix
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        },
        {
          name: "mobile",
          use: { ...devices["Pixel 7"] }
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] }
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] }
        }
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        }
      ]
});
