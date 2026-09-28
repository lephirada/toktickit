import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");

test.describe("Lab 3 Responsive Screenshot Capture", () => {
  let ticketId: number | string = 1;

  test.beforeAll(async ({ request }) => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    try {
      execSync("npm --prefix server run db:seed", { stdio: "ignore" });
      execSync(
        `node -e 'const { PrismaClient } = require("./server/node_modules/@prisma/client"); const p = new PrismaClient({ datasources: { db: { url: "postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public" } } }); Promise.all([p.user.update({ where: { email: "sarah.connor@toktickit.com" }, data: { passwordHash: "$2b$10$Darja.Q6FT2ivIiXVxb0V.S96Mw20uhnhV.UkhZVw7Jm91AWU5h4q", mustChangePassword: true } }), p.user.update({ where: { email: "admin@toktickit.com" }, data: { mustChangePassword: false } })]).catch(() => {}).finally(() => p.$disconnect());'`,
        { stdio: "ignore" }
      );
    } catch {
      // ignore
    }

    try {
      const loginRes = await request.post("http://localhost:3000/api/auth/login", {
        data: {
          email: "jennifer.anderson@toktickit.com",
          password: "Password123!",
        },
      });

      if (loginRes.ok()) {
        const ticketsRes = await request.get("http://localhost:3000/api/tickets?pageSize=1");
        const ticketsData = await ticketsRes.json();
        if (ticketsData.data && ticketsData.data.length > 0) {
          ticketId = ticketsData.data[0].id;
        } else {
          const createRes = await request.post("http://localhost:3000/api/tickets", {
            data: {
              categoryId: 1,
              priority: "P2_MEDIUM",
              summary: "MacBook Pro keyboard key sticking intermittently",
              description: "The spacebar and E key on my corporate laptop occasionally register double keypresses.",
            },
          });
          const createData = await createRes.json();
          if (createData.data?.id) {
            ticketId = createData.data.id;
          }
        }
      }
    } catch (e) {
      console.warn("Could not pre-seed ticket for screenshot capture:", e);
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
      await page.goto(`http://localhost:5173/tickets/${ticketId}`);
      await page.waitForSelector('[data-testid="ticket-detail-screen"]');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `05-ticket-detail-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures Staff Ticket Queue screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      // Login with David Lee (active IT Staff, mustChangePassword: false)
      await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="staff-ticket-queue-view"]');
      if (vp.name === "mobile") {
        await expect(page.locator('[data-testid="staff-ticket-cards"]')).toBeVisible();
        await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeHidden();
      } else {
        await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();
        await expect(page.locator('[data-testid="staff-ticket-cards"]')).toBeHidden();
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `06-staff-queue-${vp.name}.png`),
        fullPage: true,
      });

      // For tablet and mobile, also capture with filter drawer opened
      if (vp.name !== "desktop") {
        await page.click('[data-testid="queue-filter-drawer-toggle"]');
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `06-staff-queue-${vp.name}-filter-open.png`),
          fullPage: true,
        });
      }
    });

    test(`captures Staff Ticket Detail screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      // Login with David Lee (active IT Staff, mustChangePassword: false)
      await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="staff-ticket-queue-view"]');
      await page.goto(`http://localhost:5173/staff/tickets/${ticketId}`);
      await page.waitForSelector('[data-testid="staff-ticket-detail-section"]');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `07-staff-ticket-detail-${vp.name}.png`),
        fullPage: true,
      });
    });

    test(`captures Administrator User Management screen (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:5173/login");
      await page.waitForSelector('[data-testid="login-screen"]');

      // Login with System Admin (mustChangePassword set to false in beforeAll)
      await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Admin123!");
      await page.click('[data-testid="login-submit-btn"]');

      await page.waitForSelector('[data-testid="app-header"]');
      await page.goto("http://localhost:5173/admin/users");
      await page.waitForSelector('[data-testid="user-management-container"]');

      if (vp.name === "mobile") {
        await page.waitForSelector('[data-testid="admin-users-mobile-list"]');
      } else {
        await page.waitForSelector('[data-testid="admin-users-table"]');
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `08-admin-users-${vp.name}.png`),
        fullPage: true,
      });

      // On desktop, capture modals
      if (vp.name === "desktop") {
        // 1. Create User Modal
        await page.click('[data-testid="create-user-button"]');
        await page.waitForSelector('[data-testid="create-user-modal"]');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "09-user-modal-create.png"),
        });
        await page.click('[data-testid="create-user-cancel-btn"]');
        await page.waitForSelector('[data-testid="create-user-modal"]', { state: "detached" });

        // 2. Edit User Modal
        await page.locator('button[data-testid^="edit-user-btn-"]').first().click();
        await page.waitForSelector('[data-testid="edit-user-modal"]');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "09-user-modal-edit.png"),
        });
        await page.click('[data-testid="edit-user-cancel-btn"]');
        await page.waitForSelector('[data-testid="edit-user-modal"]', { state: "detached" });

        // 3. Reset Password Modal
        await page.locator('button[data-testid^="reset-pwd-btn-"]').first().click();
        await page.waitForSelector('[data-testid="reset-password-modal"]');
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "09-user-modal-reset-password.png"),
        });
        await page.click('[data-testid="reset-password-cancel-btn"]');
        await page.waitForSelector('[data-testid="reset-password-modal"]', { state: "detached" });
      }
    });
  }
});
