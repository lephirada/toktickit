import { test, expect } from "@playwright/test";
import path from "path";
import { resetAuthUsers, ensureSeedData, getPrisma } from "./helpers/db-helper.js";

test.describe("Lab 03 Complete 20-Step End-to-End Integration Journey", () => {
  test.beforeAll(async () => {
    await resetAuthUsers();
    await ensureSeedData();
  });

  test("executes continuous 20-step multi-persona integration journey", async ({
    page,
    request,
  }) => {
    test.setTimeout(90000);

    // =========================================================================
    // STEP 1 — Open application
    // =========================================================================
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // =========================================================================
    // STEP 2 — Login with seeded Requester account (Sarah Connor)
    // =========================================================================
    await page.fill('[data-testid="login-email-input"]', "sarah.connor@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // =========================================================================
    // STEP 3 — Complete first-login password change
    // =========================================================================
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('[data-testid="change-password-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="change-password-notice"]')).toBeVisible();

    // Verify operational routes are blocked while password change is required
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/change-password/);

    const newSarahPassword = "NewSarahPassword123!";
    await page.fill('[data-testid="current-password-input"]', "Password123!");
    await page.fill('[data-testid="new-password-input"]', newSarahPassword);
    await page.fill('[data-testid="confirm-password-input"]', newSarahPassword);
    await page.click('[data-testid="change-password-submit-btn"]');

    // Successfully released into application (/my-tickets)
    await expect(page).toHaveURL(/\/my-tickets/, { timeout: 10000 });
    await expect(page.locator('[data-testid="my-tickets-section"]')).toBeVisible();

    // =========================================================================
    // STEP 4 — Create a ticket through Requester UI
    // =========================================================================
    await page.click('[data-testid="nav-create-ticket"]');
    await expect(page).toHaveURL(/\/create-ticket/);
    await expect(page.locator('[data-testid="create-ticket-section"]')).toBeVisible();

    // Fill form
    await page.selectOption("#category-select", { label: "Hardware" });
    await page.selectOption("#related-system-select", { label: "Corporate Laptop" });
    await page.getByRole("radio", { name: /P1 High/i }).click();

    const ticketSummary = `MacBook display flickering during conference - ${Date.now()}`;
    const ticketDesc = "The external HDMI monitor flickers intermittently during video calls.";
    await page.fill("#summary-input", ticketSummary);
    await page.fill("#description-textarea", ticketDesc);

    await page.click('[data-testid="submit-ticket-btn"]');

    // Navigates back to /my-tickets with success banner
    await expect(page).toHaveURL(/\/my-tickets/, { timeout: 10000 });
    const successBanner = page.locator('.alert-success');
    await expect(successBanner).toBeVisible();

    // Extract ticket number from success banner (e.g. "Ticket TKT-2026-00017 created successfully!")
    const bannerText = await successBanner.innerText();
    const ticketNoMatch = bannerText.match(/TKT-\d{4}-\d+/);
    expect(ticketNoMatch).not.toBeNull();
    const createdTicketNo = ticketNoMatch![0];

    // =========================================================================
    // STEP 5 — Requester ticket list
    // =========================================================================
    const createdRow = page.locator(`tr:has-text("${createdTicketNo}")`);
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText(ticketSummary);
    await expect(createdRow).toContainText(/Hardware/i);
    await expect(createdRow).toContainText(/NEW/i);

    // =========================================================================
    // STEP 6 — Requester ticket detail
    // =========================================================================
    // Open through the UI link, not direct goto
    const ticketDetailLink = createdRow.locator('[data-testid^="ticket-link-"]');
    await ticketDetailLink.click();

    await expect(page.locator('[data-testid="ticket-detail-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-number"]')).toContainText(createdTicketNo);
    await expect(page.locator('text=' + ticketSummary)).toBeVisible();

    // Extract ticket ID from hidden span for later verification
    const idText = await page.locator('[data-testid="ticket-detail-id"]').innerText();
    const createdTicketId = idText.replace(/\D/g, "");

    // =========================================================================
    // STEP 7 — Switch to IT Staff (David Lee)
    // =========================================================================
    await page.click('[data-testid="header-profile-button"]');
    await page.click('[data-testid="header-logout-btn"]');
    await expect(page).toHaveURL(/\/login/);

    await page.fill('[data-testid="login-email-input"]', "david.lee@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Password123!");
    await page.click('[data-testid="login-submit-btn"]');

    // Land on staff queue
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('[data-testid="nav-staff-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-create-ticket"]')).toBeHidden();

    // =========================================================================
    // STEP 8 — Staff queue: locate created ticket
    // =========================================================================
    await expect(page.locator('[data-testid="staff-ticket-table"]')).toBeVisible();
    const staffQueueRow = page.locator(`tr:has-text("${createdTicketNo}")`);
    await expect(staffQueueRow).toBeVisible();

    // =========================================================================
    // STEP 9 — Staff ticket detail: open from queue
    // =========================================================================
    await staffQueueRow.click();
    await expect(page).toHaveURL(new RegExp(`/staff/tickets/${createdTicketId}`));
    await expect(page.locator('[data-testid="staff-ticket-detail-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-number"]')).toContainText(createdTicketNo);

    // =========================================================================
    // STEP 10 — Claim ticket
    // =========================================================================
    const claimBtn = page.locator('button:has-text("Claim Ticket")');
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    const ownerDisplay = page.locator('[data-testid="assigned-owner-display"]');
    await expect(ownerDisplay).toContainText(/David Lee/i);

    // =========================================================================
    // STEP 11 — Change status to IN_PROGRESS
    // =========================================================================
    await page.click('[data-testid="open-status-modal-button"]');
    await expect(page.locator('#transition-modal-title')).toBeVisible();

    // Transition from OPEN (after claim) to IN_PROGRESS
    await page.selectOption("#target-status-select", "IN_PROGRESS");
    await page.click('[data-testid="submit-status-button"]');
    await expect(page.locator('#transition-modal-title')).toBeHidden();

    await expect(page.locator('[data-testid="detail-status-badge"]')).toContainText(/IN PROGRESS/i);

    // =========================================================================
    // STEP 12 — Add public comment
    // =========================================================================
    const publicCommentText = `We are investigating the external monitor connectivity issue. - ${Date.now()}`;
    await page.fill('textarea[placeholder*="public message"]', publicCommentText);
    await page.click('button:has-text("Post Comment")');

    await expect(page.locator(`text=${publicCommentText}`)).toBeVisible();

    // =========================================================================
    // STEP 13 — Add internal note
    // =========================================================================
    await page.click('button:has-text("Internal Notes")');
    await expect(page.locator('text=Visible only to IT Staff and Administrators')).toBeVisible();

    const confidentialNoteText = `Confidential Hardware Triage: Motherboard GPU solder reflow required - ${Date.now()}`;
    await page.fill('textarea[placeholder*="confidential note"]', confidentialNoteText);
    await page.click('button:has-text("Add Internal Note")');

    await expect(page.locator(`text=${confidentialNoteText}`)).toBeVisible();

    // =========================================================================
    // STEP 14 — Verify Requester cannot see internal note
    // =========================================================================
    // Log out staff
    await page.click('[data-testid="header-profile-button"]');
    await page.click('[data-testid="header-logout-btn"]');
    await expect(page).toHaveURL(/\/login/);

    // Log in as Sarah Connor with updated password
    await page.fill('[data-testid="login-email-input"]', "sarah.connor@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', newSarahPassword);
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    // Navigate to ticket detail from My Tickets
    await page.goto("/my-tickets");
    const requesterTicketRow = page.locator(`tr:has-text("${createdTicketNo}")`);
    await requesterTicketRow.locator('[data-testid^="ticket-link-"]').click();
    await expect(page.locator('[data-testid="ticket-detail-screen"]')).toBeVisible();

    // Public comment MUST be visible
    await expect(page.locator(`text=${publicCommentText}`)).toBeVisible();

    // Confidential internal note MUST NOT be visible anywhere in the DOM
    const confidentialMatches = await page.locator(`text=${confidentialNoteText}`).count();
    expect(confidentialMatches).toBe(0);

    // =========================================================================
    // STEP 15 — Upload attachment
    // =========================================================================
    const fixturePath = path.resolve("e2e/fixtures/test-document.pdf");
    const fileInput = page.locator('[data-testid="add-attachment-input"]');
    await fileInput.setInputFiles(fixturePath);

    // Attachment appears in UI
    const attachmentItem = page.locator('[data-testid^="attachment-item-"]');
    await expect(attachmentItem.first()).toBeVisible();
    await expect(page.locator('[data-testid="attachment-name"]')).toContainText("test-document.pdf");

    // Capture attachment ID for soft-delete and 410 checks
    const removeBtn = page.locator('[data-testid^="remove-btn-"]').first();
    const removeTestId = await removeBtn.getAttribute("data-testid");
    const attachmentId = removeTestId!.replace("remove-btn-", "");

    // =========================================================================
    // STEP 16 — Remove attachment using soft-delete
    // =========================================================================
    await removeBtn.click();
    await expect(page.locator('[data-testid="confirm-remove-btn"]')).toBeVisible();
    await page.click('[data-testid="confirm-remove-btn"]');

    // UI displays "Removed" badge and active download button is gone
    await expect(page.locator('[data-testid="removed-badge"]')).toBeVisible();
    await expect(page.locator(`[data-testid="download-btn-${attachmentId}"]`)).toHaveCount(0);

    // =========================================================================
    // STEP 17 — Verify removed attachment cannot be downloaded (HTTP 410 Gone)
    // =========================================================================
    const downloadRes = await page.request.get(`http://localhost:3000/api/attachments/${attachmentId}/download`);
    expect(downloadRes.status()).toBe(410);

    // =========================================================================
    // STEP 18 — Test requester confirmation of resolution
    // =========================================================================
    // Ticket is IN_PROGRESS, so Requester has "Problem Appears Resolved" button
    const confirmResolvedBtn = page.locator('[data-testid="confirm-resolved-btn"]');
    await expect(confirmResolvedBtn).toBeVisible();
    await confirmResolvedBtn.click();

    await expect(page.locator('[data-testid="confirm-resolved-modal"]')).toBeVisible();
    await page.fill('[data-testid="confirm-resolved-feedback"]', "Display tested with cable replacement, problem resolved!");
    await page.click('[data-testid="confirm-resolved-submit-btn"]');

    // Resolution notice appears
    await expect(page.locator('[data-testid="confirmed-resolved-notice"]')).toBeVisible();
    await expect(confirmResolvedBtn).toBeHidden();

    // Verify state machine preservation: status is still IN_PROGRESS (NOT auto-closed/resolved)
    await expect(page.locator('[data-testid="detail-status-badge"]')).toContainText(/IN PROGRESS/i);

    // =========================================================================
    // STEP 19 — Test user management flow as Administrator
    // =========================================================================
    // Logout Sarah Connor
    await page.click('[data-testid="header-profile-button"]');
    await page.click('[data-testid="header-logout-btn"]');
    await expect(page).toHaveURL(/\/login/);

    // Login as Admin
    await page.fill('[data-testid="login-email-input"]', "admin@toktickit.com");
    await page.fill('[data-testid="login-password-input"]', "Admin123!");
    await page.click('[data-testid="login-submit-btn"]');
    await expect(page.locator('[data-testid="app-header"]')).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible();

    // Create a new user
    await page.click('[data-testid="create-user-button"]');
    await expect(page.locator('[data-testid="create-user-modal"]')).toBeVisible();

    const journeyUserEmail = `e2e_test_journey_${Date.now()}@toktickit.com`;
    await page.fill('[data-testid="create-user-fullname-input"]', "Journey User");
    await page.fill('[data-testid="create-user-email-input"]', journeyUserEmail);
    await page.selectOption('[data-testid="create-user-role-select"]', "REQUESTER");
    await page.fill('[data-testid="create-user-password-input"]', "JourneyPass123!");
    await page.click('[data-testid="create-user-submit-btn"]');

    await expect(page.locator('[data-testid="create-user-modal"]')).toBeHidden();
    await expect(page.locator('[data-testid="admin-users-table"]').locator(`text=${journeyUserEmail}`)).toBeVisible();

    // =========================================================================
    // STEP 20 — Log out and verify protected pages require authentication again
    // =========================================================================
    await page.click('[data-testid="header-profile-button"]');
    await page.click('[data-testid="header-logout-btn"]');
    await expect(page).toHaveURL(/\/login/);

    // Verify /my-tickets redirects to /login
    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // Verify /staff/queue redirects to /login
    await page.goto("/staff/queue");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();

    // Verify /admin/users redirects to /login
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-screen"]')).toBeVisible();
  });
});
