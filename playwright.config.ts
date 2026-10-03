import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/lab-03",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix server run dev",
      url: "http://localhost:3000/api/requesters",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "npm --prefix client run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});

