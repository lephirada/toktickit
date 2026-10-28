import { test, expect } from "@playwright/test";
import { getPrisma, resetAuthUsers } from "../lab-03/helpers/db-helper.js";

test.describe("Lab 04 Issue 25: Advisory Resolution & Server Resolution Gate E2E Suite", () => {
  const prisma = getPrisma();

  test.beforeEach(async () => {
    await resetAuthUsers();
    const ticket3 = await prisma.ticket.findUnique({
      where: { ticketNo: "TKT-2026-00003" },
    });
    if (ticket3) {
      await prisma.actionTaken.deleteMany({
        where: { ticketId: ticket3.id },
      });
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

  test.afterAll(async () => {
    // Targeted cleanup: restore TKT-2026-00002 and TKT-2026-00003 to pristine seed state
    try {
      await prisma.ticket.updateMany({
        where: { ticketNo: "TKT-2026-00002" },
        data: { resolutionIndicated: false },
      });

      const ticket3 = await prisma.ticket.findUnique({
        where: { ticketNo: "TKT-2026-00003" },
      });
      if (ticket3) {
        await prisma.actionTaken.deleteMany({
          where: { ticketId: ticket3.id },
        });
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
    } catch {
      // Ignore cleanup error if DB is busy
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

    // Clean any prior actions on ticket 3
    await prisma.actionTaken.deleteMany({
      where: { ticketId: ticket3!.id },
    });

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
