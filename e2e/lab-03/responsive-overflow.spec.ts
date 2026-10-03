import { test, expect } from "@playwright/test";
import { resetAuthUsers, getPrisma, ensureSeedData } from "./helpers/db-helper.js";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

test.describe("Lab 03 Responsive Page-Level Overflow Verification", () => {
  let sampleTicketId: number = 1;

  test.beforeAll(async () => {
    await resetAuthUsers();
    await ensureSeedData();
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: { requester: { email: "jennifer.anderson@toktickit.com" } },
      select: { id: true },
    });
    if (ticket) {
      sampleTicketId = ticket.id;
    }
  });

  // 1. View: Login
  for (const vp of VIEWPORTS) {
    test(`view 1: login screen has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 2. View: Change Password
  for (const vp of VIEWPORTS) {
    test(`view 2: change password screen has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await resetAuthUsers(); // ensure Sarah has mustChangePassword=true
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "sarah.connor@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');

      await expect(page.locator('[data-testid="change-password-screen"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 3. View: Requester Create Ticket
  for (const vp of VIEWPORTS) {
    test(`view 3: create ticket screen has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto("/create-ticket");
      await expect(page.locator('[data-testid="create-ticket-section"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 4. View: Requester My Tickets
  for (const vp of VIEWPORTS) {
    test(`view 4: my tickets dashboard has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto("/my-tickets");
      await expect(page.locator('[data-testid="my-tickets-section"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 5. View: Requester Ticket Detail
  for (const vp of VIEWPORTS) {
    test(`view 5: requester ticket detail has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto(`/tickets/${sampleTicketId}`);
      await expect(page.locator('[data-testid="ticket-detail-screen"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 6. View: Staff Queue
  for (const vp of VIEWPORTS) {
    test(`view 6: staff queue has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto("/staff/queue");
      await expect(page.locator('[data-testid="staff-ticket-queue-view"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 7. View: Staff Ticket Detail
  for (const vp of VIEWPORTS) {
    test(`view 7: staff ticket detail has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Password123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto(`/staff/tickets/${sampleTicketId}`);
      await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }

  // 8. View: User Management
  for (const vp of VIEWPORTS) {
    test(`view 8: user management has no page-level horizontal overflow (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
      await page.fill('[data-testid="login-password-input"]', "Admin123!");
      await page.click('[data-testid="login-submit-btn"]');
      await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

      await page.goto("/admin/users");
      await expect(page.locator('[data-testid="user-management-container"]')).toBeVisible();

      const hasPageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });
  }
});
