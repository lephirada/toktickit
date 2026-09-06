import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";

test.describe("E2E-01: Full Requester Lifecycle Journey", () => {
  test("executes end-to-end requester workflow: selection, ticket submission with file, read-only detail view, attachment soft-removal audit, and list persistence", async ({
    page,
  }) => {
    // -----------------------------------------------------------------------
    // Step 1: Requester Selection Screen
    // -----------------------------------------------------------------------
    // 1.1 Clear localStorage and navigate to root
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto("/");

    // 1.2 Verify Development Requester Selection screen is displayed
    const selectScreen = page.getByTestId("select-requester-screen");
    await expect(selectScreen).toBeVisible();

    // 1.3 Select "Sarah Connor" and click Continue
    const requesterSelect = page.getByTestId("requester-dropdown");
    await expect(requesterSelect).toBeVisible();
    await requesterSelect.selectOption({ label: "Sarah Connor (Engineering)" });

    const continueBtn = page.getByTestId("continue-button");
    await continueBtn.click();

    // 1.4 Verify redirection to My Tickets dashboard with Sarah Connor profile
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    const profileName = page.getByTestId("header-profile-name");
    await expect(profileName).toContainText("Sarah Connor");

    // -----------------------------------------------------------------------
    // Step 2: Create Ticket Flow
    // -----------------------------------------------------------------------
    // 2.1 Navigate to Create Ticket
    const createNavBtn = page.getByRole("link", { name: "+ Create Ticket" });
    await createNavBtn.click();
    await expect(page.getByTestId("create-ticket-section")).toBeVisible();

    // 2.2 Fill in the form
    const summaryInput = page.locator("#summary-input");
    const uniqueSummary = `E2E Network Gateway Failure ${Date.now()}`;
    await summaryInput.fill(uniqueSummary);

    const categorySelect = page.locator("#category-select");
    await categorySelect.selectOption({ label: "Network" });

    // Select related system if available
    const systemSelect = page.locator("#related-system-select");
    await expect(systemSelect).toBeEnabled();
    const systemOptions = await systemSelect.locator("option").all();
    if (systemOptions.length > 1) {
      await systemSelect.selectOption({ index: 1 });
    }

    // Select Priority P1 High
    const p1Pill = page.locator("button.zg-priority-pill", { hasText: "P1 High" });
    await p1Pill.click();

    // Fill Description
    const descTextarea = page.locator("#description-textarea");
    await descTextarea.fill(
      "Detailed description for Playwright E2E-01 automated test: Cisco AnyConnect VPN gateway drops connection every 10 minutes."
    );

    // Attach sample PNG image
    const fileInput = page.locator("#file-upload-input");
    await fileInput.setInputFiles({
      name: "vpn_gateway_error.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    // Verify uploaded attachment chip is displayed
    await expect(page.locator("text=vpn_gateway_error.png")).toBeVisible();

    // 2.3 Submit the form
    const submitBtn = page.locator('button[type="submit"]:has-text("Submit Ticket")');
    await submitBtn.click();

    // -----------------------------------------------------------------------
    // Step 3: Ticket Detail View Verification
    // -----------------------------------------------------------------------
    // 3.1 After creation, user is directed to My Tickets dashboard with success banner
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    const successBanner = page.getByTestId("success-banner");
    await expect(successBanner).toBeVisible();

    // Extract ticket number from success banner text (e.g. "Ticket TKT-2026-00045 created successfully!")
    const bannerText = await successBanner.innerText();
    const match = bannerText.match(/TKT-\d{4}-\d{5}/);
    expect(match).not.toBeNull();
    const createdTicketNo = match![0];

    // 3.2 Click on the created ticket in the dashboard table to navigate to Detail View
    const ticketRowLink = page.locator(`button:has-text('${createdTicketNo}')`).first();
    await expect(ticketRowLink).toBeVisible();
    await ticketRowLink.click();

    // 3.3 Verify Ticket Detail Screen is displayed
    const detailScreen = page.getByTestId("ticket-detail-screen");
    await expect(detailScreen).toBeVisible();

    // Verify ticket number, summary, category, and status
    await expect(page.getByTestId("ticket-number")).toHaveText(createdTicketNo);
    await expect(page.getByTestId("ticket-summary")).toHaveText(uniqueSummary);
    await expect(page.getByTestId("ticket-category")).toHaveText("Network");
    await expect(page.getByTestId("detail-status-badge")).toHaveText("NEW");
    await expect(page.getByTestId("detail-priority-badge")).toContainText("P1 High");

    // Verify Attachment Card displays active file
    await expect(page.getByTestId("attachments-card")).toBeVisible();
    await expect(page.getByTestId("attachment-name")).toHaveText("vpn_gateway_error.png");
    const downloadBtn = page.getByRole("button", { name: /Download/i });
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
    const removeBtn = page.getByRole("button", { name: /Remove/i });
    await expect(removeBtn).toBeVisible();
    await expect(removeBtn).toBeEnabled();

    // -----------------------------------------------------------------------
    // Step 4: Soft-Remove Attachment Lifecycle
    // -----------------------------------------------------------------------
    // 4.1 Click "Remove" on the active attachment
    await removeBtn.click();

    // 4.2 Verify AttachmentRemovalModal opens
    const removalModal = page.getByTestId("attachment-removal-modal");
    await expect(removalModal).toBeVisible();
    await expect(page.getByTestId("modal-title")).toHaveText("Remove Attachment");

    // 4.3 Select preset reason: "Uploaded incorrect document / file"
    const presetRadio = page.locator('input[value="Uploaded incorrect document / file"]');
    await presetRadio.click();

    // 4.4 Click Confirm Removal
    const confirmBtn = page.getByTestId("confirm-remove-btn");
    await confirmBtn.click();

    // 4.5 Verify modal closes and attachment item updates immediately
    await expect(removalModal).not.toBeVisible();

    // "Removed" badge is visible
    const removedBadge = page.getByTestId("removed-badge");
    await expect(removedBadge).toBeVisible();
    await expect(removedBadge).toHaveText("Removed");

    // Filename has strikethrough
    const filenameEl = page.getByTestId("attachment-name");
    await expect(filenameEl).toHaveClass(/text-decoration-line-through/);

    // Shows removal reason text
    const reasonText = page.getByTestId("removal-reason");
    await expect(reasonText).toContainText("Uploaded incorrect document / file");

    // Download button is disabled
    const disabledDownloadBtn = page.getByTestId("download-btn-disabled");
    await expect(disabledDownloadBtn).toBeVisible();
    await expect(disabledDownloadBtn).toBeDisabled();

    // 4.6 Verify Activity Timeline displays removal audit entry
    const timeline = page.getByTestId("activity-timeline");
    await expect(timeline).toBeVisible();
    await expect(timeline).toContainText("vpn_gateway_error.png removed by requester");
    await expect(timeline).toContainText("Uploaded incorrect document / file");

    // -----------------------------------------------------------------------
    // Step 5: Verify My Tickets Dashboard
    // -----------------------------------------------------------------------
    // 5.1 Click "My Tickets" in the breadcrumb
    const breadcrumbTicketsLink = page.getByTestId("breadcrumb-tickets-link");
    await breadcrumbTicketsLink.click();

    // 5.2 Verify user is returned to My Tickets dashboard and the ticket is present in the table
    await expect(page.getByTestId("my-tickets-section")).toBeVisible();
    await expect(page.locator(`text=${createdTicketNo}`).first()).toBeVisible();
    await expect(page.locator(`text=${uniqueSummary}`).first()).toBeVisible();
  });
});
