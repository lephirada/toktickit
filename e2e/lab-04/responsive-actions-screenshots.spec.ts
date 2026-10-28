import { test, expect } from "@playwright/test";
import { getPrisma } from "../lab-03/helpers/db-helper.js";
import fs from "fs";
import path from "path";

const prisma = getPrisma();

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const SCREENSHOT_BASE = path.resolve(process.cwd(), "artifacts/lab-04/screenshots");

test.describe("Lab 04 Issue 23: Responsive Layout Overflow & Screenshots", () => {
  test.beforeAll(async () => {
    // Ensure screenshot directories exist
    const dirs = [
      "actions-timeline",
      "requester-actions-view",
      "log-action-modal",
      "concurrency-conflict",
    ];
    for (const dir of dirs) {
      const fullDir = path.join(SCREENSHOT_BASE, dir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
    }
  });

  test("1. Staff Actions Timeline, Log Modal, and Concurrency Conflict across viewports", async ({
    page,
  }) => {
    // Log in as IT Staff David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // Wait for staff queue
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();

    // Search and open ticket TKT-2026-00014 which has multiple actions
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill("00014");
    await page.waitForTimeout(300);
    const targetRow = page.locator('tbody tr[data-testid^="ticket-row-"]').first();
    await targetRow.click();

    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // Wait for Actions Taken card
    const actionsCard = page.locator('[data-testid="actions-taken-card"]');
    await expect(actionsCard).toBeVisible();

    // Verify horizontal overflow and capture screenshots across all 3 viewports
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      const ssPath = path.join(
        SCREENSHOT_BASE,
        "actions-timeline",
        `actions-timeline-staff-${vp.width}.png`
      );
      await page.screenshot({ path: ssPath, fullPage: true });
    }

    // Capture Log Action Modal at 1280px and 375px
    for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      const logBtn = page.locator('[data-testid="log-action-btn"]');
      if (await logBtn.isVisible()) {
        await logBtn.click();
        const logModal = page.locator('[data-testid="log-action-modal"]');
        await expect(logModal).toBeVisible();

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        const ssPath = path.join(
          SCREENSHOT_BASE,
          "log-action-modal",
          `log-action-modal-${vp.width}.png`
        );
        await page.screenshot({ path: ssPath, fullPage: false });

        // Close modal
        await page.locator('button:has-text("Cancel")').first().click();
        await expect(logModal).not.toBeVisible();
      }
    }

    // Capture Concurrency Conflict Dialog at 1280px and 375px
    // Trigger an edit on an existing action, and simulate a 409 conflict
    const editBtn = page.locator('[data-testid="edit-action-btn"]').first();
    if (await editBtn.isVisible()) {
      // Intercept the PUT update call to return 409 STALE_ACTION_CONFLICT
      await page.route("**/api/tickets/*/actions/*", async (route) => {
        if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "STALE_ACTION_CONFLICT",
                message: "Another user updated this action concurrently.",
                details: {
                  currentRecord: {
                    id: 1,
                    ticketId: 14,
                    actionType: "INVESTIGATION",
                    timeSpentMinutes: 45,
                    description: "Apple diagnostics run by Sarah Connor: thermal paste reapplication recommended.",
                    result: "Thermal throttling verified at 98C under load.",
                    followUpRequired: true,
                    followUpNote: "Procure Arctic MX-4 thermal compound.",
                    attachmentNotes: "Captured thermal sensor telemetry logs.",
                    updatedAt: new Date().toISOString(),
                    performedBy: {
                      id: 7,
                      fullName: "Sarah Connor",
                      email: "sarah.connor@toktickit.com",
                      role: "IT_STAFF",
                    },
                  },
                  currentUpdatedAt: new Date().toISOString(),
                },
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(200);

        await editBtn.click();
        const editModal = page.locator('[data-testid="edit-action-modal"]');
        await expect(editModal).toBeVisible();

        // Submit to trigger 409 conflict
        await page.locator('[data-testid="submit-edit-btn"]').click();

        const conflictDialog = page.locator('[data-testid="concurrency-conflict-dialog"]');
        await expect(conflictDialog).toBeVisible();

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow).toBe(false);

        const ssPath = path.join(
          SCREENSHOT_BASE,
          "concurrency-conflict",
          `concurrency-conflict-${vp.width}.png`
        );
        await page.screenshot({ path: ssPath, fullPage: false });

        // Cancel conflict dialog and edit modal
        await page.locator('button:has-text("Cancel")').last().click();
        await expect(conflictDialog).not.toBeVisible();
        await page.locator('button:has-text("Cancel")').first().click();
        await expect(editModal).not.toBeVisible();
      }

      await page.unroute("**/api/tickets/*/actions/*");
    }
  });

  test("2. Requester Read-Only View has no mutation controls in DOM and no horizontal overflow", async ({
    page,
  }) => {
    // Clear cookies & log in as Requester Jennifer Anderson
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // Wait for Requester dashboard / tickets
    await expect(page).toHaveURL(/\/(my-tickets|dashboard)/);

    // Fetch real ticket belonging to Jennifer Anderson with actions
    const requesterTicket = await prisma.ticket.findFirst({
      where: {
        requester: { email: "jennifer.anderson@toktickit.com" },
        actionsTaken: { some: {} },
      },
      select: { id: true },
    });
    const ticketId = requesterTicket?.id ?? 14;

    await page.goto(`/tickets/${ticketId}`);
    await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}`));
    await expect(page.locator('[data-testid="ticket-detail-screen"]')).toBeVisible();

    // Verify Actions Taken card is present
    const actionsCard = page.locator('[data-testid="actions-taken-card"]');
    await expect(actionsCard).toBeVisible();

    // CRITICAL: Requester must NOT have any mutation controls in the DOM!
    expect(await page.locator('[data-testid="log-action-btn"]').count()).toBe(0);
    expect(await page.locator('[data-testid="edit-action-btn"]').count()).toBe(0);
    expect(await page.locator('[data-testid="empty-log-first-action-btn"]').count()).toBe(0);

    // Verify horizontal overflow and capture screenshots across all viewports
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow).toBe(false);

      const ssPath = path.join(
        SCREENSHOT_BASE,
        "requester-actions-view",
        `actions-timeline-requester-${vp.width}.png`
      );
      await page.screenshot({ path: ssPath, fullPage: true });
    }
  });
});
