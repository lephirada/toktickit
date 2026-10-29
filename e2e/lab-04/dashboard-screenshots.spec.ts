import { test, expect } from "@playwright/test";
import { resetAuthUsers } from "../lab-03/helpers/db-helper.js";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const SCREENSHOT_BASE = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/dashboards");

test.describe("Lab 04 Issue 24: Role Dashboards UI & Screenshots", () => {
  let consoleErrors: string[] = [];
  let pageErrors: Error[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_BASE)) {
      fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await resetAuthUsers();
    consoleErrors = [];
    pageErrors = [];

    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
  });

  test.afterEach(async () => {
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test.afterAll(async () => {
    await resetAuthUsers();
  });

  test("1. Requester Dashboard visual verification across viewports", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page).toHaveURL(/\/my-tickets/);

    const dashboardNav = page.locator('[data-testid="nav-requester-dashboard"]');
    if (await dashboardNav.isVisible()) {
      await dashboardNav.click();
    } else {
      await page.goto("/dashboard");
    }

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="requester-dashboard-container"]')).toBeVisible();

    // Verify 4 KPI cards are rendered
    await expect(page.locator('[data-testid="kpi-card-total-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-waiting-requester"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-recently-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-total-closed"]')).toBeVisible();

    // Verify recent tickets section is visible
    await expect(page.locator('[data-testid="requester-recent-tickets-card"]')).toBeVisible();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const overflowData = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        if (docWidth <= winWidth) return null;
        const offenders: any[] = [];
        document.querySelectorAll("*").forEach((el) => {
          if (el.scrollWidth > winWidth) {
            offenders.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              scrollWidth: el.scrollWidth,
            });
          }
        });
        return { docWidth, winWidth, offenders: offenders.slice(0, 5) };
      });

      if (overflowData) {
        console.log("Requester overflow at", vp.width, JSON.stringify(overflowData));
      }
      expect(overflowData).toBeNull();

      const ssPath = path.join(SCREENSHOT_BASE, `requester-dashboard-${vp.width}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
    }
  });

  test("2. Staff Dashboard visual verification across viewports (IT Staff)", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page).toHaveURL(/\/staff\/queue/);

    const dashboardNav = page.locator('[data-testid="nav-staff-dashboard"]');
    if (await dashboardNav.isVisible()) {
      await dashboardNav.click();
    } else {
      await page.goto("/staff/dashboard");
    }

    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // Verify 7 KPI metric cards
    await expect(page.locator('[data-testid="kpi-card-unassigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-my-assigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-waiting-requester"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-total-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-recently-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-card-total-time"]')).toBeVisible();

    // Admin user card must be absent for IT_STAFF
    expect(await page.locator('[data-testid="admin-user-summary-card"]').count()).toBe(0);

    // Verify category and priority breakdowns
    await expect(page.locator('[data-testid="category-breakdown-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="priority-breakdown-card"]')).toBeVisible();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const overflowData = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        if (docWidth <= winWidth) return null;
        const offenders: any[] = [];
        document.querySelectorAll("*").forEach((el) => {
          if (el.scrollWidth > winWidth) {
            offenders.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              scrollWidth: el.scrollWidth,
            });
          }
        });
        return { docWidth, winWidth, offenders: offenders.slice(0, 5) };
      });

      if (overflowData) {
        console.log("Staff overflow at", vp.width, JSON.stringify(overflowData));
      }
      expect(overflowData).toBeNull();

      const ssPath = path.join(SCREENSHOT_BASE, `staff-dashboard-${vp.width}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
    }
  });

  test("3. Admin Dashboard with User Accounts Summary Card", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    if (await page.locator('[data-testid="change-password-modal"]').isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.fill('input[placeholder="Current Password"]', "Admin123!");
      await page.fill('input[placeholder="New Password"]', "NewAdminPass123!");
      await page.fill('input[placeholder="Confirm New Password"]', "NewAdminPass123!");
      await page.click('button:has-text("Update Password")');
      await page.waitForTimeout(500);
      // Immediately restore baseline Admin credentials so subsequent suites are never affected
      await resetAuthUsers();
    }

    const adminDashNav = page.locator('[data-testid="nav-admin-dashboard"]');
    if (await adminDashNav.isVisible()) {
      await adminDashNav.click();
    } else {
      await page.goto("/staff/dashboard");
    }

    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // Administrator user summary card MUST be visible
    await expect(page.locator('[data-testid="admin-user-summary-card"]')).toBeVisible();

    for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const overflowData = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        if (docWidth <= winWidth) return null;
        const offenders: any[] = [];
        document.querySelectorAll("*").forEach((el) => {
          if (el.scrollWidth > winWidth) {
            offenders.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              scrollWidth: el.scrollWidth,
            });
          }
        });
        return { docWidth, winWidth, offenders: offenders.slice(0, 5) };
      });

      if (overflowData) {
        console.log("Admin overflow at", vp.width, JSON.stringify(overflowData));
      }
      expect(overflowData).toBeNull();

      const ssPath = path.join(SCREENSHOT_BASE, `admin-dashboard-${vp.width}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
    }
  });

  test("4. Metric Drill-Down Navigation to Queue Filters", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Go to dashboard
    await page.locator('[data-testid="nav-staff-dashboard"]').click();
    await expect(page).toHaveURL(/\/staff\/dashboard/);
    await expect(page.locator('[data-testid="staff-dashboard-container"]')).toBeVisible();

    // Click Unassigned card
    await page.locator('[data-testid="kpi-card-unassigned"]').click();
    await expect(page).toHaveURL(/\/staff\/queue\?owner=UNASSIGNED/);
    await expect(
      page.locator('[data-testid="staff-ticket-table"], [data-testid="queue-empty-state"], h2:has-text("No matching tickets")').first()
    ).toBeVisible();

    const ssPath = path.join(SCREENSHOT_BASE, "dashboard-drilldown-queue-1280.png");
    await page.screenshot({ path: ssPath, fullPage: true });
  });
});
