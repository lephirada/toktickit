import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { UPLOAD_DIR } from "../../src/middleware/upload.js";

describe("Issue 7 — Ticket Creation & Pre-upload Attachments Backend Integration Tests", () => {
  const prisma = getPrisma();
  let activeRequesterId: number;
  let inactiveRequesterId: number;
  let hardwareCategoryId: number;
  let networkCategoryId: number;
  let corporateLaptopSystemId: number;
  let vpnSystemId: number;

  beforeAll(async () => {
    // Retrieve seeded data for tests
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { isActive: true },
    });
    const inactiveRequester = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    const hardwareCategory = await prisma.category.findUnique({
      where: { name: "Hardware" },
    });
    const networkCategory = await prisma.category.findUnique({
      where: { name: "Network" },
    });
    const laptopSystem = await prisma.relatedSystem.findFirst({
      where: { name: "Corporate Laptop" },
    });
    const vpnSystem = await prisma.relatedSystem.findFirst({
      where: { name: "VPN" },
    });

    if (
      !activeRequester ||
      !inactiveRequester ||
      !hardwareCategory ||
      !networkCategory ||
      !laptopSystem ||
      !vpnSystem
    ) {
      throw new Error("Required seed data missing for integration tests");
    }

    activeRequesterId = activeRequester.id;
    inactiveRequesterId = inactiveRequester.id;
    hardwareCategoryId = hardwareCategory.id;
    networkCategoryId = networkCategory.id;
    corporateLaptopSystemId = laptopSystem.id;
    vpnSystemId = vpnSystem.id;
  });

  afterAll(async () => {
    // Cleanup any created tickets and attachments from tests
    await prisma.attachment.deleteMany({
      where: {
        originalName: {
          in: [
            "test_screenshot.png",
            "document.pdf",
            "log.txt",
            "large_file.png",
            "malicious.exe",
            "archive.zip",
            "sample.png",
          ],
        },
      },
    });
    await prisma.ticket.deleteMany({
      where: {
        summary: {
          startsWith: "Test Ticket",
        },
      },
    });
  });

  // -------------------------------------------------------------------------
  // 1. POST /api/attachments/pre-upload
  // -------------------------------------------------------------------------
  describe("POST /api/attachments/pre-upload", () => {
    it("returns 403 Forbidden if X-Requester-Id header is missing", async () => {
      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .attach("files", Buffer.from("image content"), "test_screenshot.png");

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");
      expect(res.body.error).toHaveProperty("correlationId");
    });

    it("returns 403 Forbidden if X-Requester-Id belongs to an inactive requester", async () => {
      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(inactiveRequesterId))
        .attach("files", Buffer.from("image content"), "test_screenshot.png");

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });

    it("returns 403 Forbidden if X-Requester-Id is non-existent or invalid integer", async () => {
      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", "999999")
        .attach("files", Buffer.from("image content"), "test_screenshot.png");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");

      const invalidStrRes = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", "invalid-id")
        .attach("files", Buffer.from("image content"), "test_screenshot.png");

      expect(invalidStrRes.status).toBe(403);
      expect(invalidStrRes.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });

    it("returns 400 Bad Request if no files are attached", async () => {
      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId));

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("NO_FILES_PROVIDED");
    });

    it("returns 415 Unsupported Media Type for disallowed file types (.exe, .zip)", async () => {
      const exeRes = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", Buffer.from("binary"), {
          filename: "malicious.exe",
          contentType: "application/x-msdownload",
        });

      expect(exeRes.status).toBe(415);
      expect(exeRes.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
      expect(exeRes.body.error.message).toBe("Allowed file types: JPEG, PNG, WEBP, PDF, TXT.");

      const zipRes = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", Buffer.from("zip-bytes"), {
          filename: "archive.zip",
          contentType: "application/zip",
        });

      expect(zipRes.status).toBe(415);
      expect(zipRes.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });

    it("returns 413 Payload Too Large when a file exceeds 5MB", async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB

      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", largeBuffer, {
          filename: "large_file.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe("FILE_TOO_LARGE");
      expect(res.body.error.message).toBe("File size exceeds 5MB limit.");
    });

    it("returns 413 Payload Too Large when more than 5 files are attached", async () => {
      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", Buffer.from("file 1"), { filename: "f1.png", contentType: "image/png" })
        .attach("files", Buffer.from("file 2"), { filename: "f2.png", contentType: "image/png" })
        .attach("files", Buffer.from("file 3"), { filename: "f3.png", contentType: "image/png" })
        .attach("files", Buffer.from("file 4"), { filename: "f4.png", contentType: "image/png" })
        .attach("files", Buffer.from("file 5"), { filename: "f5.png", contentType: "image/png" })
        .attach("files", Buffer.from("file 6"), { filename: "f6.png", contentType: "image/png" });

      expect(res.status).toBe(413);
      expect(res.body.error.code).toBe("MAX_ATTACHMENTS_EXCEEDED");
    });

    it("returns 201 Created with metadata array for valid file uploads (PNG, PDF, WEBP, TXT)", async () => {
      const pngBuffer = Buffer.from("fake png content");
      const pdfBuffer = Buffer.from("fake pdf content");
      const webpBuffer = Buffer.from("fake webp content");

      const res = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", pngBuffer, { filename: "test_screenshot.png", contentType: "image/png" })
        .attach("files", pdfBuffer, { filename: "document.pdf", contentType: "application/pdf" })
        .attach("files", webpBuffer, { filename: "image.webp", contentType: "image/webp" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);

      const [first, second, third] = res.body.data;
      expect(first).toHaveProperty("id");
      expect(first.originalName).toBe("test_screenshot.png");
      expect(first.mimeType).toBe("image/png");
      expect(first.sizeBytes).toBe(pngBuffer.length);
      expect(first).toHaveProperty("createdAt");

      expect(second).toHaveProperty("id");
      expect(second.originalName).toBe("document.pdf");
      expect(second.mimeType).toBe("application/pdf");
      expect(second.sizeBytes).toBe(pdfBuffer.length);

      expect(third).toHaveProperty("id");
      expect(third.originalName).toBe("image.webp");
      expect(third.mimeType).toBe("image/webp");
      expect(third.sizeBytes).toBe(webpBuffer.length);

      // Verify records in DB
      const dbAtt = await prisma.attachment.findUnique({
        where: { id: first.id },
      });
      expect(dbAtt).toBeDefined();
      expect(dbAtt?.uploadedById).toBe(activeRequesterId);
      expect(dbAtt?.ticketId).toBeNull();
      expect(dbAtt?.isSoftDeleted).toBe(false);

      // Verify file exists on disk
      const diskPath = path.join(UPLOAD_DIR, dbAtt!.storageKey);
      expect(fs.existsSync(diskPath)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. POST /api/tickets
  // -------------------------------------------------------------------------
  describe("POST /api/tickets", () => {
    it("returns 403 Forbidden if X-Requester-Id header is missing or inactive", async () => {
      const payload = {
        summary: "Test Ticket VPN issue",
        description: "Cannot connect to VPN from home network.",
        priority: "P1_HIGH",
        categoryId: networkCategoryId,
      };

      const missingRes = await request(app).post("/api/tickets").send(payload);
      expect(missingRes.status).toBe(403);
      expect(missingRes.body.error.code).toBe("FORBIDDEN_REQUESTER");

      const inactiveRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(inactiveRequesterId))
        .send(payload);
      expect(inactiveRes.status).toBe(403);
      expect(inactiveRes.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });

    it("returns 422 Unprocessable Entity with exact fieldErrors for invalid summary, description, category, and system mismatch", async () => {
      // 1. Short summary (< 5 chars) & short description (< 10 chars)
      const shortRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "VPN",
          description: "broken",
          categoryId: networkCategoryId,
          priority: "P2_MEDIUM",
        });

      expect(shortRes.status).toBe(422);
      expect(shortRes.body.error.code).toBe("VALIDATION_FAILED");
      expect(shortRes.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          { field: "summary", message: "Summary must be between 5 and 100 characters." },
          { field: "description", message: "Description must be between 10 and 2000 characters." },
        ])
      );

      // 2. Long summary (> 100 chars)
      const longSummary = "A".repeat(101);
      const longSumRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: longSummary,
          description: "This is a valid long description for the test ticket.",
          categoryId: networkCategoryId,
          priority: "P2_MEDIUM",
        });

      expect(longSumRes.status).toBe(422);
      expect(longSumRes.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          { field: "summary", message: "Summary must be between 5 and 100 characters." },
        ])
      );

      // 3. Invalid / Non-existent categoryId
      const invalidCatRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "Test Ticket Category",
          description: "Valid description for testing category validation.",
          categoryId: 99999,
          priority: "P2_MEDIUM",
        });

      expect(invalidCatRes.status).toBe(422);
      expect(invalidCatRes.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          { field: "categoryId", message: "Valid category is required." },
        ])
      );

      // 4. relatedSystemId belonging to a different category
      // Corporate Laptop belongs to Hardware, but Network category is passed
      const mismatchRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "Test Ticket Mismatch",
          description: "Testing related system category mismatch validation.",
          categoryId: networkCategoryId,
          relatedSystemId: corporateLaptopSystemId,
          priority: "P2_MEDIUM",
        });

      expect(mismatchRes.status).toBe(422);
      expect(mismatchRes.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          {
            field: "relatedSystemId",
            message: "Selected system does not belong to the chosen category.",
          },
        ])
      );
    });

    it("returns 422 Unprocessable Entity when attachmentIds are invalid, non-existent, or owned by another requester", async () => {
      // 1. Non-existent attachment ID
      const invalidAttRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "Test Ticket Invalid Attachment",
          description: "Valid description testing attachment validation.",
          categoryId: networkCategoryId,
          priority: "P2_MEDIUM",
          attachmentIds: [999999],
        });

      expect(invalidAttRes.status).toBe(422);
      expect(invalidAttRes.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          { field: "attachmentIds", message: "Invalid or already linked attachment ID." },
        ])
      );

      // 2. Attachment owned by another requester
      const otherRequester = await prisma.requesterUser.findFirst({
        where: { isActive: true, id: { not: activeRequesterId } },
      });

      if (otherRequester) {
        const otherAtt = await prisma.attachment.create({
          data: {
            originalName: "sample.png",
            storageKey: `att_other_${Date.now()}`,
            mimeType: "image/png",
            sizeBytes: 100,
            uploadedById: otherRequester.id,
          },
        });

        const foreignAttRes = await request(app)
          .post("/api/tickets")
          .set("X-Requester-Id", String(activeRequesterId))
          .send({
            summary: "Test Ticket Foreign Attachment",
            description: "Valid description testing foreign attachment ownership.",
            categoryId: networkCategoryId,
            priority: "P2_MEDIUM",
            attachmentIds: [otherAtt.id],
          });

        expect(foreignAttRes.status).toBe(422);
        expect(foreignAttRes.body.error.fieldErrors).toEqual(
          expect.arrayContaining([
            { field: "attachmentIds", message: "Invalid or already linked attachment ID." },
          ])
        );
      }
    });

    it("successfully creates a ticket with pre-uploaded attachment, sequential ticket number, and relations", async () => {
      // 1. Pre-upload an attachment
      const uploadRes = await request(app)
        .post("/api/attachments/pre-upload")
        .set("X-Requester-Id", String(activeRequesterId))
        .attach("files", Buffer.from("log content"), {
          filename: "log.txt",
          contentType: "text/plain",
        });

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.data[0].id;

      // 2. Create ticket with the attachment
      const currentYear = new Date().getFullYear();
      const createRes = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "Test Ticket VPN Gateway Connection Issue",
          description: "Getting error code 0x80070005 when trying to connect to VPN Gateway.",
          categoryId: networkCategoryId,
          relatedSystemId: vpnSystemId,
          priority: "P1_HIGH",
          attachmentIds: [attachmentId],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty("data");

      const ticket = createRes.body.data;
      expect(ticket).toHaveProperty("id");
      expect(ticket.ticketNo).toMatch(new RegExp(`^TKT-${currentYear}-\\d{5}$`));
      expect(ticket.summary).toBe("Test Ticket VPN Gateway Connection Issue");
      expect(ticket.description).toBe(
        "Getting error code 0x80070005 when trying to connect to VPN Gateway."
      );
      expect(ticket.priority).toBe("P1_HIGH");
      expect(ticket.status).toBe("NEW");
      expect(ticket.requesterId).toBe(activeRequesterId);
      expect(ticket.categoryId).toBe(networkCategoryId);
      expect(ticket.relatedSystemId).toBe(vpnSystemId);

      // Verify nested relations
      expect(ticket.category).toBeDefined();
      expect(ticket.category.name).toBe("Network");
      expect(ticket.relatedSystem).toBeDefined();
      expect(ticket.relatedSystem.name).toBe("VPN");
      expect(ticket.requester).toBeDefined();
      expect(ticket.requester.id).toBe(activeRequesterId);

      // Verify attachments relation in response
      expect(Array.isArray(ticket.attachments)).toBe(true);
      expect(ticket.attachments.length).toBe(1);
      expect(ticket.attachments[0].id).toBe(attachmentId);
      expect(ticket.attachments[0].originalName).toBe("log.txt");

      // Verify DB linking
      const dbAttachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
      });
      expect(dbAttachment?.ticketId).toBe(ticket.id);

      // 3. Create second ticket to verify sequential numbering increment
      const createRes2 = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          summary: "Test Ticket Second Issue for Sequence Verification",
          description: "Checking that sequential ticket number increments properly.",
          categoryId: hardwareCategoryId,
          relatedSystemId: corporateLaptopSystemId,
          priority: "P2_MEDIUM",
        });

      expect(createRes2.status).toBe(201);
      const ticket2 = createRes2.body.data;
      const num1 = parseInt(ticket.ticketNo.split("-")[2], 10);
      const num2 = parseInt(ticket2.ticketNo.split("-")[2], 10);
      expect(num2).toBe(num1 + 1);
    });
  });
});
