import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");

test.describe("Lab 3 Responsive Screenshot Capture", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  const viewports = [
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    test(`captures Login screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `01-login-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures Change Password screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      // Login with Sarah Connor (mustChangePassword: true)
      await page.fill('[data-testid="login-email-input"]', "sarah.connor@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="change-password-screen"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `02-change-password-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures My Tickets screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      // Login with Jennifer Anderson (owner of seed tickets, mustChangePassword: false)
      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="my-tickets-section"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `03-my-tickets-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures Create Ticket screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="my-tickets-section"]');
      await page.goto("http://localhost:5173/create-ticket");
      await page.waitForSelector('[data-testid="create-ticket-section"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `04-create-ticket-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures Requester Ticket Detail screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="my-tickets-section"]');
      await page.goto("http://localhost:5173/tickets/2321");
      await page.waitForSelector('[data-testid="ticket-detail-screen"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `05-ticket-detail-${vp.name}.png`),
        fullPage: true,
      });
    });
  }
});
