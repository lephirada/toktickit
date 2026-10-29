import { test, expect } from "@playwright/test";
import { getPrisma, resetAuthUsers } from "../lab-03/helpers/db-helper.js";

test.describe("Lab 04 Issue 25: Advisory Resolution & Server Resolution Gate E2E Suite", () => {
  const prisma = getPrisma();
  const createdActionIds: number[] = [];
  let initialActionIds: number[] = [];
  let consoleErrors: string[] = [];
  let pageErrors: Error[] = [];

  test.beforeAll(async () => {
    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    if (ticket3) {
      const existing = await prisma.actionTaken.findMany({
        where: { ticketId: ticket3.id },
        select: { id: true },
      });
      initialActionIds = existing.map((a: { id: number }) => a.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    await resetAuthUsers();
    consoleErrors = [];
    pageErrors = [];

    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Allow ONLY the expected 422 Resolution Gate error during negative boundary test
        const isExpected422 =
          text.includes("422") ||
          text.includes("ACTION_TAKEN_REQUIRED_FOR_RESOLUTION") ||
          (text.includes("Failed to load resource") && text.includes("422"));
        if (!isExpected422) {
          consoleErrors.push(text);
        }
      }
    });

    if (createdActionIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { id: { in: createdActionIds } },
      });
      createdActionIds.length = 0;
    }

    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    if (ticket3) {
      await prisma.ticket.update({
        where: { id: ticket3.id },
        data: {
          status: "NEW",
          ownerId: null,
          resolutionSummary: null,
          resolutionIndicated: false,
        },
      });
    }
  });

  test.afterEach(async () => {
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test.afterAll(async () => {
    // Targeted cleanup: restore TKT-2026-00002 and TKT-2026-00003 to pristine seed state
    await prisma.ticket.updateMany({
      where: { ticketNo: "TKT-2026-00002" },
      data: { resolutionIndicated: false },
    });

    // Delete ONLY test-created action IDs, preserving any seed actions
    if (createdActionIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { id: { in: createdActionIds } },
      });
      // Postcondition assertion: verify test actions are deleted
      const remainingCreated = await prisma.actionTaken.count({
        where: { id: { in: createdActionIds } },
      });
      expect(remainingCreated).toBe(0);
    }

    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    if (ticket3) {
      await prisma.ticket.update({
        where: { id: ticket3.id },
        data: {
          status: "NEW",
          ownerId: null,
          resolutionSummary: null,
          resolutionIndicated: false,
        },
      });
    }

    // Postcondition assertion: verify restored database state
    const t2 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00002" },
      select: { resolutionIndicated: true },
    });
    expect(t2?.resolutionIndicated).toBe(false);

    if (ticket3) {
      const t3 = await prisma.ticket.findUnique({
        where: { id: ticket3.id },
      });
      expect(t3?.status).toBe("NEW");
      expect(t3?.ownerId).toBeNull();
      expect(t3?.resolutionIndicated).toBe(false);

      // Verify that initial seed actions on ticket3 (if any) are 100% intact
      if (initialActionIds.length > 0) {
        const remainingSeed = await prisma.actionTaken.findMany({
          where: { id: { in: initialActionIds } },
        });
        expect(remainingSeed.length).toBe(initialActionIds.length);
      }
    }
  });

  test("1. Requester resolution indication is strictly advisory and does NOT alter ticket status to RESOLVED", async ({
    page,
  }) => {
    // 1. Fetch TKT-2026-00002 (Jennifer Anderson, IN_PROGRESS)
    const ticket2 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00002" },
    });
    expect(ticket2).not.toBeNull();
    expect(ticket2!.status).toBe("IN_PROGRESS");

    // Ensure resolutionIndicated starts false
    await prisma.ticket.update({
      where: { id: ticket2!.id },
      data: { resolutionIndicated: false },
    });

    // 2. Log in as Requester Jennifer Anderson
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "jennifer.anderson@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/my-tickets/);

    // 3. Open ticket detail
    await page.goto(`/tickets/${ticket2!.id}`);
    await expect(page.locator('[data-testid="ticket-detail-screen"]')).toBeVisible();

    // 4. Verify advisory resolution button is visible for IN_PROGRESS ticket
    const confirmBtn = page.locator('[data-testid="confirm-resolved-btn"]');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 5. Fill advisory feedback and confirm
    const modal = page.locator('[data-testid="confirm-resolved-modal"]');
    await expect(modal).toBeVisible();

    const feedbackText = "Campus Wi-Fi connectivity has stabilized in room 302.";
    await page.fill('[data-testid="confirm-resolved-feedback"]', feedbackText);

    const submitConfirmBtn = page.locator('[data-testid="confirm-resolved-submit-btn"]');
    await expect(submitConfirmBtn).toBeEnabled();
    await submitConfirmBtn.click();

    await expect(modal).not.toBeVisible();

    // 6. Confirmed notice banner appears
    const notice = page.locator('[data-testid="confirmed-resolved-notice"]');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/confirmed this ticket appears resolved/i);

    // 7. STRICT CONTRACT ASSERTION: Ticket status MUST REMAIN IN_PROGRESS
    const statusBadge = page.locator('.badge:has-text("IN PROGRESS")').first();
    await expect(statusBadge).toBeVisible();

    // Database verification: resolutionIndicated is true, but status remains IN_PROGRESS
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticket2!.id },
    });
    expect(updatedTicket?.resolutionIndicated).toBe(true);
    expect(updatedTicket?.status).toBe("IN_PROGRESS");
  });

  test("2. Staff cannot resolve an IN_PROGRESS ticket without at least one Action Taken and valid summary", async ({
    page,
  }) => {
    // 1. Prepare TKT-2026-00003 (starts with 0 actions)
    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    expect(ticket3).not.toBeNull();

    // Clean any prior test-created actions
    if (createdActionIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { id: { in: createdActionIds } },
      });
      createdActionIds.length = 0;
    }

    // 2. Log in as David Lee
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);

    // 3. Open ticket 3
    await page.goto(`/staff/tickets/${ticket3!.id}`);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // 4. Claim ticket to assign to David Lee (transitions NEW -> OPEN)
    const claimBtn = page.locator('button:has-text("Claim Ticket")');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. Transition to IN_PROGRESS
    const openStatusBtn = page.locator('[data-testid="open-status-modal-button"]');
    await expect(openStatusBtn).toBeVisible();
    await openStatusBtn.click();

    await page.selectOption("#target-status-select", "IN_PROGRESS");
    await page.locator('[data-testid="submit-status-button"]').click();
    await page.waitForTimeout(500);

    // Verify current status is now IN_PROGRESS
    const currentStatusBadge = page.locator('[data-testid="detail-status-badge"]');
    await expect(currentStatusBadge).toContainText(/IN PROGRESS/i);

    // Verify 0 actions exist
    const actionCount = await prisma.actionTaken.count({
      where: { ticketId: ticket3!.id },
    });
    expect(actionCount).toBe(0);

    // 6. Attempt to resolve ticket without actions taken
    await openStatusBtn.click();
    await page.selectOption("#target-status-select", "RESOLVED");

    // 6a. Verify client-side minimum length validation (<10 chars rejected)
    await page.fill("#resolution-summary-input", "Too short");
    await page.locator('[data-testid="submit-status-button"]').click();
    const clientValidationAlert = page.locator('form [role="alert"]');
    await expect(clientValidationAlert).toContainText(/between 10 and 1,000 characters/i);

    // 6b. Enter valid summary (>= 10 chars) and submit to test server Resolution Gate
    await page.fill(
      "#resolution-summary-input",
      "Attempted resolution summary without recording mandatory diagnostic actions."
    );

    const patchResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/tickets/${ticket3!.id}/status`) &&
        resp.request().method() === "PATCH"
    );

    await page.locator('[data-testid="submit-status-button"]').click();

    const patchResponse = await patchResponsePromise;
    expect(patchResponse.status()).toBe(422);

    const errorBody = await patchResponse.json();
    expect(errorBody.error?.code).toBe("ACTION_TAKEN_REQUIRED_FOR_RESOLUTION");

    // UI displays the server blocker alert
    const serverAlert = page.locator('form [role="alert"]');
    await expect(serverAlert).toBeVisible();
    await expect(serverAlert).toContainText(
      /At least one action taken must be recorded before resolving this ticket/i
    );

    // Close modal
    await page.locator('button:has-text("Cancel")').first().click();

    // Status remains IN_PROGRESS
    await expect(currentStatusBadge).toContainText(/IN PROGRESS/i);
  });

  test("3. After a valid Action Taken exists, Staff can resolve the ticket with a valid summary", async ({
    page,
  }) => {
    // 1. Fetch TKT-2026-00003
    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    expect(ticket3).not.toBeNull();

    // 2. Log in as David Lee and navigate to ticket 3
    await page.goto("/login");
    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    await expect(page).toHaveURL(/\/staff\/queue/);

    await page.goto(`/staff/tickets/${ticket3!.id}`);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();

    // Ensure ticket is in IN_PROGRESS
    const currentStatusBadge = page.locator('[data-testid="detail-status-badge"]');
    if (!(await currentStatusBadge.innerText()).includes("IN PROGRESS")) {
      const claimBtn = page.locator('button:has-text("Claim Ticket")');
      if (await claimBtn.isVisible()) {
        await claimBtn.click();
        await page.waitForTimeout(500);
      }
      await page.locator('[data-testid="open-status-modal-button"]').click();
      await page.selectOption("#target-status-select", "IN_PROGRESS");
      await page.locator('[data-testid="submit-status-button"]').click();
      await page.waitForTimeout(500);
    }

    // 3. Log an Action Taken to satisfy the Resolution Gate
    const logBtn = page.locator(
      '[data-testid="log-action-btn"], [data-testid="empty-log-first-action-btn"]'
    ).first();
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    const logModal = page.locator('[data-testid="log-action-modal"]');
    await expect(logModal).toBeVisible();

    await page.selectOption("#log-action-type", "CONFIGURATION");
    await page.fill("#log-time-spent", "25");
    await page.fill(
      "#log-description",
      "[E2E-GATE-PASS] Reconfigured FortiClient tunnel profile and cleared cached VPN credentials."
    );
    await page.fill("#log-result", "Tunnel established with 10.10.4.52 assigned IP address.");
    await page.locator('[data-testid="submit-action-btn"]').click();

    await expect(logModal).not.toBeVisible();

    // Action appears in timeline
    await expect(page.locator('[data-testid="actions-timeline-list"]')).toContainText(
      "[E2E-GATE-PASS]"
    );

    // Register test-created action ID for safe targeted teardown
    const createdAction = await prisma.actionTaken.findFirst({
      where: { description: { contains: "[E2E-GATE-PASS]" } },
      select: { id: true },
    });
    if (createdAction) {
      createdActionIds.push(createdAction.id);
    }

    // 4. Now transition to RESOLVED with valid summary
    const openStatusBtn = page.locator('[data-testid="open-status-modal-button"]');
    await openStatusBtn.click();

    await page.selectOption("#target-status-select", "RESOLVED");
    const resolutionText =
      "Re-provisioned SSL-VPN client tunnel configuration and verified successful user authentication.";
    await page.fill("#resolution-summary-input", resolutionText);

    const patchResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/tickets/${ticket3!.id}/status`) &&
        resp.request().method() === "PATCH"
    );

    await page.locator('[data-testid="submit-status-button"]').click();

    const patchResponse = await patchResponsePromise;
    expect(patchResponse.status()).toBe(200);

    // 5. Verify detail screen updates status to RESOLVED and renders resolution summary
    await expect(currentStatusBadge).toContainText(/RESOLVED/i);
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toContainText(
      resolutionText
    );

    // Database verification
    const dbResolvedTicket = await prisma.ticket.findUnique({
      where: { id: ticket3!.id },
    });
    expect(dbResolvedTicket?.status).toBe("RESOLVED");
    expect(dbResolvedTicket?.resolutionSummary).toBe(resolutionText);
  });
});
