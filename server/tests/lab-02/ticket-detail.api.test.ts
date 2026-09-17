import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { app } from "../../src/app.js";
import * as appModule from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { UPLOAD_DIR } from "../../src/middleware/upload.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("Issue 9 — Ticket Details & Attachments Lifecycle API (ticket-detail.api.test.ts)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;

  let categoryId: number;
  let systemId: number;

  let ticketAId: number;
  let ticketBId: number;

  let activeAttachmentAId: number;
  let activeAttachmentStorageKey: string;
  const activeFileContent = "TokTickIT Active Test Attachment Content Binary Stream";

  let softDeletedAttachmentAId: number;
  let softDeletedAttachmentStorageKey: string;

  let presetRemovalAttachmentId: number;
  let customRemovalAttachmentId: number;

  beforeAll(async () => {
    // 1. Retrieve seeded requesters
    const sarah = await prisma.user.findFirstOrThrow({
      where: { email: "sarah.connor@toktickit.com" },
    });
    const john = await prisma.user.findFirstOrThrow({
      where: { email: "john.doe@toktickit.com" },
    });
    const kyle = await prisma.user.findFirstOrThrow({
      where: { email: "kyle.reese@toktickit.com" },
    });

    requesterAId = sarah.id;
    requesterBId = john.id;
    inactiveRequesterId = kyle.id;

    // 2. Retrieve Category & System
    const hardware = await prisma.category.findFirstOrThrow({
      where: { name: "Hardware" },
    });
    categoryId = hardware.id;

    const laptop = await prisma.relatedSystem.findFirstOrThrow({
      where: { name: "Corporate Laptop", categoryId },
    });
    systemId = laptop.id;

    // 3. Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // 4. Create Ticket for Requester A
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNo: "TKT-2026-90001",
        summary: "MacBook Pro screen flickering issue",
        description: "The built-in Liquid Retina display flickers violently when launching heavy IDE workloads.",
        requestedPriority: Priority.P1_HIGH,
        status: TicketStatus.NEW,
        requesterId: requesterAId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketAId = ticketA.id;

    // 5. Create Ticket for Requester B
    const ticketB = await prisma.ticket.create({
      data: {
        ticketNo: "TKT-2026-90002",
        summary: "Requester B confidential ticket",
        description: "Confidential hardware diagnostic notes owned strictly by John Doe.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        requesterId: requesterBId,
        categoryId,
        relatedSystemId: systemId,
      },
    });
    ticketBId = ticketB.id;

    // 6. Create Active Attachment on Ticket A
    activeAttachmentStorageKey = `att_test_active_${Date.now()}_screen.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, activeAttachmentStorageKey), activeFileContent);

    const activeAtt = await prisma.attachment.create({
      data: {
        originalName: "screen_flicker.png",
        storageKey: activeAttachmentStorageKey,
        mimeType: "image/png",
        sizeBytes: Buffer.byteLength(activeFileContent),
        uploadedById: requesterAId,
        ticketId: ticketAId,
        isSoftDeleted: false,
      },
    });
    activeAttachmentAId = activeAtt.id;

    // 7. Create Pre-existing Soft-Deleted Attachment on Ticket A
    softDeletedAttachmentStorageKey = `att_test_removed_${Date.now()}_old_log.txt`;
    fs.writeFileSync(
      path.join(UPLOAD_DIR, softDeletedAttachmentStorageKey),
      "Old error logs containing deprecated credentials"
    );

    const softDeletedAtt = await prisma.attachment.create({
      data: {
        originalName: "system_dump.txt",
        storageKey: softDeletedAttachmentStorageKey,
        mimeType: "text/plain",
        sizeBytes: 48,
        uploadedById: requesterAId,
        ticketId: ticketAId,
        isSoftDeleted: true,
        deletedAt: new Date("2026-08-20T12:00:00.000Z"),
        deletedBy: requesterAId,
        deletionReason: "Uploaded incorrect document / file",
      },
    });
    softDeletedAttachmentAId = softDeletedAtt.id;

    // 8. Create Attachments reserved for removal testing
    const presetKey = `att_test_preset_${Date.now()}_preset.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, presetKey), "Preset file test");
    const presetAtt = await prisma.attachment.create({
      data: {
        originalName: "duplicate_receipt.png",
        storageKey: presetKey,
        mimeType: "image/png",
        sizeBytes: 17,
        uploadedById: requesterAId,
        ticketId: ticketAId,
        isSoftDeleted: false,
      },
    });
    presetRemovalAttachmentId = presetAtt.id;

    const customKey = `att_test_custom_${Date.now()}_custom.pdf`;
    fs.writeFileSync(path.join(UPLOAD_DIR, customKey), "Custom reason file test");
    const customAtt = await prisma.attachment.create({
      data: {
        originalName: "confidential_passport.pdf",
        storageKey: customKey,
        mimeType: "application/pdf",
        sizeBytes: 25,
        uploadedById: requesterAId,
        ticketId: ticketAId,
        isSoftDeleted: false,
      },
    });
    customRemovalAttachmentId = customAtt.id;
  });

  afterAll(async () => {
    // Clean up test files from disk
    const filesToClean = [
      activeAttachmentStorageKey,
      softDeletedAttachmentStorageKey,
    ];
    for (const file of filesToClean) {
      if (file) {
        const p = path.join(UPLOAD_DIR, file);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {
            // ignore
          }
        }
      }
    }

    // Clean up created test tickets and attachments in DB
    await prisma.attachment.deleteMany({
      where: {
        ticketId: { in: [ticketAId, ticketBId] },
      },
    });
    await prisma.ticket.deleteMany({
      where: {
        id: { in: [ticketAId, ticketBId] },
      },
    });
  });

  // =========================================================================
  // 1. GET /api/tickets/:id (AC 1)
  // =========================================================================
  describe("1. GET /api/tickets/:id — Ticket Details & Isolation", () => {
    it("returns 200 OK with complete ticket details, category, attachments, and timeline for owner", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const ticket = res.body.data;
      expect(ticket.id).toBe(ticketAId);
      expect(ticket.ticketNo).toBe("TKT-2026-90001");
      expect(ticket.summary).toBe("MacBook Pro screen flickering issue");
      expect(ticket.description).toContain("Liquid Retina display flickers");
      expect(ticket.priority).toBe("P1_HIGH");
      expect(ticket.status).toBe("NEW");

      // Requester info
      expect(ticket.requester.id).toBe(requesterAId);
      expect(ticket.requester.fullName).toBe("Sarah Connor");
      expect(ticket.requester.displayName).toBe("Sarah Connor");

      // Category and Related System
      expect(ticket.category.id).toBe(categoryId);
      expect(ticket.category.name).toBe("Hardware");
      expect(ticket.relatedSystem.id).toBe(systemId);
      expect(ticket.relatedSystem.name).toBe("Corporate Laptop");

      // Attachments array includes active and soft-deleted items with correct status
      expect(Array.isArray(ticket.attachments)).toBe(true);
      expect(ticket.attachments.length).toBeGreaterThanOrEqual(2);

      const activeItem = ticket.attachments.find(
        (a: { id: number }) => a.id === activeAttachmentAId
      );
      expect(activeItem).toBeDefined();
      expect(activeItem.status).toBe("ACTIVE");
      expect(activeItem.isSoftDeleted).toBe(false);

      const softDeletedItem = ticket.attachments.find(
        (a: { id: number }) => a.id === softDeletedAttachmentAId
      );
      expect(softDeletedItem).toBeDefined();
      expect(softDeletedItem.status).toBe("REMOVED");
      expect(softDeletedItem.isSoftDeleted).toBe(true);
      expect(softDeletedItem.deletionReason).toBe("Uploaded incorrect document / file");

      // Activity History Timeline
      const timeline = ticket.activityTimeline || ticket.timeline;
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThanOrEqual(1);

      // Verify creation event
      const createEvent = timeline.find(
        (e: { type: string }) => e.type === "TICKET_CREATED"
      );
      expect(createEvent).toBeDefined();
      expect(createEvent.message).toContain("TKT-2026-90001");

      // Verify removal event in timeline for the pre-existing soft-deleted attachment
      const removalEvent = timeline.find(
        (e: { type: string; message: string }) =>
          e.type === "ATTACHMENT_REMOVED" || e.message.includes("removed by requester")
      );
      expect(removalEvent).toBeDefined();
      expect(removalEvent.message).toContain("system_dump.txt");
    });

    it("returns 403 Forbidden when requester attempts to view another user's ticket (Requester Isolation)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN_RESOURCE");
      expect(res.body.data).toBeUndefined();
    });

    it("returns 404 Not Found when ticket ID does not exist", async () => {
      const res = await request(app)
        .get("/api/tickets/999999")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 404 Not Found for non-integer ticket ID", async () => {
      const res = await request(app)
        .get("/api/tickets/not-a-number")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 403 Forbidden if X-Requester-Id is missing or inactive", async () => {
      const noHeaderRes = await request(app).get(`/api/tickets/${ticketAId}`);
      expect(noHeaderRes.status).toBe(403);

      const inactiveRes = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(inactiveRequesterId));
      expect(inactiveRes.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. GET /api/attachments/:id/download (AC 2 & AC 4)
  // =========================================================================
  describe("2. GET /api/attachments/:id/download — Streaming & 410 Guard", () => {
    it("returns 200 OK and streams binary file content with appropriate headers for active attachment", async () => {
      const res = await request(app)
        .get(`/api/attachments/${activeAttachmentAId}/download`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/png");
      expect(res.headers["content-disposition"]).toContain(
        'attachment; filename="screen_flicker.png"'
      );
      expect(res.body.toString()).toBe(activeFileContent);
    });

    it("returns HTTP 410 Gone when attachment status is REMOVED / soft-deleted", async () => {
      const res = await request(app)
        .get(`/api/attachments/${softDeletedAttachmentAId}/download`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(410);
      expect(res.body.error).toBe("Attachment has been removed");
      expect(res.body.reason).toBe("Uploaded incorrect document / file");
      expect(res.body.removedAt).toBeDefined();
    });

    it("returns 403 Forbidden when cross-requester attempts to download attachment", async () => {
      const res = await request(app)
        .get(`/api/attachments/${activeAttachmentAId}/download`)
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN_RESOURCE");
    });

    it("returns 404 Not Found when attachment ID does not exist", async () => {
      const res = await request(app)
        .get("/api/attachments/999999/download")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
    });

    it("returns 403 Forbidden when X-Requester-Id is missing", async () => {
      const res = await request(app).get(
        `/api/attachments/${activeAttachmentAId}/download`
      );
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. Attachment Removal (AC 3) & Audit Log Timeline Entry
  // =========================================================================
  describe("3. Attachment Removal & Audit Timeline Entry", () => {
    it("successfully soft-removes attachment with valid preset reason (POST /api/attachments/:id/remove)", async () => {
      const res = await request(app)
        .post(`/api/attachments/${presetRemovalAttachmentId}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Duplicate file",
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(presetRemovalAttachmentId);
      expect(res.body.data.status).toBe("REMOVED");
      expect(res.body.data.isSoftDeleted).toBe(true);
      expect(res.body.data.reason).toBe("Duplicate file");
      expect(res.body.data.deletedBy).toBe(requesterAId);
      expect(res.body.data.removedAt).toBeDefined();

      // Verify DB record
      const inDb = await prisma.attachment.findUnique({
        where: { id: presetRemovalAttachmentId },
      });
      expect(inDb?.isSoftDeleted).toBe(true);
      expect(inDb?.deletionReason).toBe("Duplicate file");

      // Verify that subsequent download returns 410 Gone
      const downloadRes = await request(app)
        .get(`/api/attachments/${presetRemovalAttachmentId}/download`)
        .set("X-Requester-Id", String(requesterAId));
      expect(downloadRes.status).toBe(410);
      expect(downloadRes.body.error).toBe("Attachment has been removed");
    });

    it("successfully soft-removes attachment with valid custom reason (>= 5 chars) when preset is 'Other'", async () => {
      const res = await request(app)
        .post(`/api/attachments/${customRemovalAttachmentId}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Other",
          customReason: "Accidentally uploaded confidential government passport scan",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSoftDeleted).toBe(true);
      expect(res.body.data.reason).toBe(
        "Accidentally uploaded confidential government passport scan"
      );

      // Verify DB record
      const inDb = await prisma.attachment.findUnique({
        where: { id: customRemovalAttachmentId },
      });
      expect(inDb?.isSoftDeleted).toBe(true);
      expect(inDb?.deletionReason).toBe(
        "Accidentally uploaded confidential government passport scan"
      );
    });

    it("returns 400 Bad Request when preset is 'Other' but customReason is too short (< 5 chars)", async () => {
      // Create a temporary attachment to test validation failure
      const tempKey = `att_fail_short_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "short_reason_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 10,
          uploadedById: requesterAId,
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${tempAtt.id}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Other",
          customReason: "bad",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("VALIDATION_FAILED");

      // Verify DB was not modified
      const inDb = await prisma.attachment.findUnique({
        where: { id: tempAtt.id },
      });
      expect(inDb?.isSoftDeleted).toBe(false);

      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });

    it("returns 400 Bad Request when preset reason is invalid", async () => {
      const tempKey = `att_fail_invalid_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "invalid_reason_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 10,
          uploadedById: requesterAId,
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${tempAtt.id}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "InvalidPresetNotAllowed",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");

      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });

    it("returns 400 Bad Request when attachment is already removed", async () => {
      const res = await request(app)
        .post(`/api/attachments/${presetRemovalAttachmentId}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Duplicate file",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("ALREADY_REMOVED");
    });

    it("returns 403 Forbidden when unauthorized user attempts to remove an attachment", async () => {
      const tempKey = `att_unauth_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "unauth_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 10,
          uploadedById: requesterAId,
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${tempAtt.id}/remove`)
        .set("X-Requester-Id", String(requesterBId))
        .send({
          reason: "Duplicate file",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_RESOURCE");

      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });

    it("supports DELETE /api/attachments/:id endpoint", async () => {
      const tempKey = `att_delete_test_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "delete_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 10,
          uploadedById: requesterAId,
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${tempAtt.id}`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Contains sensitive or confidential data",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSoftDeleted).toBe(true);
      expect(res.body.data.reason).toBe("Contains sensitive or confidential data");

      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });

    it("appends audit entry to ticket activity timeline after soft-removal", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      const timeline = res.body.data.activityTimeline || res.body.data.timeline;
      expect(Array.isArray(timeline)).toBe(true);

      // Verify the audit entry for duplicate_receipt.png
      const auditItem = timeline.find((t: { type: string; message: string }) =>
        t.type === "ATTACHMENT_REMOVED" && t.message.includes("duplicate_receipt.png")
      );
      expect(auditItem).toBeDefined();
      expect(auditItem.message).toBe(
        "Attachment duplicate_receipt.png removed by requester. Reason: Duplicate file"
      );
      expect(auditItem.reason).toBe("Duplicate file");
      expect(auditItem.timestamp).toBeDefined();

      // Verify the audit entry for confidential_passport.pdf
      const customAuditItem = timeline.find((t: { type: string; message: string }) =>
        t.type === "ATTACHMENT_REMOVED" && t.message.includes("confidential_passport.pdf")
      );
      expect(customAuditItem).toBeDefined();
      expect(customAuditItem.message).toContain(
        "Accidentally uploaded confidential government passport scan"
      );
    });

    it("successfully soft-removes attachment with 'Other' and valid customReason (full lifecycle)", async () => {
      const tempKey = `att_other_flow_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "other_flow_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 256,
          uploadedById: requesterAId,
          ticketId: ticketAId,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${tempAtt.id}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Other",
          customReason: "Accidentally uploaded draft document that needs redaction",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSoftDeleted).toBe(true);
      expect(res.body.data.deletionReason).toBe(
        "Accidentally uploaded draft document that needs redaction"
      );

      // Verify directly in DB
      const dbAtt = await prisma.attachment.findUnique({
        where: { id: tempAtt.id },
      });
      expect(dbAtt?.isSoftDeleted).toBe(true);
      expect(dbAtt?.deletionReason).toBe(
        "Accidentally uploaded draft document that needs redaction"
      );

      // Verify in activity timeline
      const ticketRes = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(requesterAId));
      const timeline = ticketRes.body.data.activityTimeline;
      const otherAudit = timeline.find(
        (t: { type: string; message: string; reason?: string }) =>
          t.type === "ATTACHMENT_REMOVED" &&
          t.message.includes("other_flow_test.png")
      );
      expect(otherAudit).toBeDefined();
      expect(otherAudit.reason).toBe(
        "Accidentally uploaded draft document that needs redaction"
      );

      await prisma.ticketActivity.deleteMany({
        where: { ticketId: ticketAId, message: { contains: "other_flow_test.png" } },
      });
      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });

    it("rolls back attachment soft-removal if audit log creation fails during transaction (Atomicity / AC3)", async () => {
      const tempKey = `att_rollback_test_${Date.now()}.png`;
      const tempAtt = await prisma.attachment.create({
        data: {
          originalName: "rollback_test.png",
          storageKey: tempKey,
          mimeType: "image/png",
          sizeBytes: 128,
          uploadedById: requesterAId,
          ticketId: ticketAId,
          isSoftDeleted: false,
        },
      });

      // Spy on appendTicketAuditLog to simulate failure inside the Prisma transaction
      const auditSpy = vi
        .spyOn(appModule.auditService, "appendTicketAuditLog")
        .mockRejectedValueOnce(new Error("Simulated Database write failure in TicketActivity"));

      const res = await request(app)
        .post(`/api/attachments/${tempAtt.id}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          reason: "Duplicate file",
        });

      expect(res.status).toBe(500);
      auditSpy.mockRestore();

      // Verify that the attachment update was ROLLED BACK and remains active in DB
      const dbAtt = await prisma.attachment.findUnique({
        where: { id: tempAtt.id },
      });
      expect(dbAtt).toBeDefined();
      expect(dbAtt?.isSoftDeleted).toBe(false);
      expect(dbAtt?.deletedAt).toBeNull();
      expect(dbAtt?.deletionReason).toBeNull();

      await prisma.attachment.delete({ where: { id: tempAtt.id } });
    });
  });
});
