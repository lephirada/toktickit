import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "node:path";
import fs from "node:fs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { UPLOAD_DIR } from "../../src/middleware/upload.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("Issue 9 — Attachments Lifecycle Integration Tests (attachments.test.ts)", () => {
  const prisma = getPrisma();

  let requester1Id: number;
  let requester2Id: number;
  let ticketId: number;

  let attachmentId: number;
  let attachmentStorageKey: string;
  const fileContent = "TokTickIT Attachment Stream Test Binary Content";

  beforeAll(async () => {
    // 1. Retrieve Requesters
    const sarah = await prisma.requesterUser.findFirstOrThrow({
      where: { email: "sarah.connor@toktickit.com" },
    });
    const john = await prisma.requesterUser.findFirstOrThrow({
      where: { email: "john.doe@toktickit.com" },
    });

    requester1Id = sarah.id;
    requester2Id = john.id;

    // 2. Retrieve Category
    const category = await prisma.category.findFirstOrThrow();

    // 3. Create Ticket for Requester 1
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: "TKT-2026-99042",
        summary: "Attachment Lifecycle Spec Ticket",
        description: "Testing API-09, API-08B, and API-10 specifications.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        requesterId: requester1Id,
        categoryId: category.id,
      },
    });
    ticketId = ticket.id;

    // 4. Ensure upload directory and write file
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    attachmentStorageKey = `att_spec_${Date.now()}_test.png`;
    fs.writeFileSync(path.join(UPLOAD_DIR, attachmentStorageKey), fileContent);

    // 5. Create active attachment
    const attachment = await prisma.attachment.create({
      data: {
        originalName: "error_screen.png",
        storageKey: attachmentStorageKey,
        mimeType: "image/png",
        sizeBytes: Buffer.byteLength(fileContent),
        uploadedById: requester1Id,
        ticketId: ticketId,
        isSoftDeleted: false,
      },
    });
    attachmentId = attachment.id;
  });

  afterAll(async () => {
    if (attachmentStorageKey) {
      const p = path.join(UPLOAD_DIR, attachmentStorageKey);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore
        }
      }
    }

    await prisma.attachment.deleteMany({ where: { ticketId } });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
  });

  // API-09: Attachment Stream Download
  it("API-09: Attachment Stream Download returns 200 OK binary stream with correct Content-Type and Content-Disposition", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requester1Id));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["content-disposition"]).toContain(
      'attachment; filename="error_screen.png"'
    );
    expect(res.body.toString()).toBe(fileContent);
  });

  // API-08B: Attachment Download Ownership Guard
  it("API-08B: Attachment Download Ownership Guard returns 403 Forbidden for cross-requester download attempt", async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requester2Id));

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN_RESOURCE");
  });

  // API-10: Attachment Soft-Removal & 410 Guard
  it("API-10: Attachment Soft-Removal & 410 Guard performs soft-removal and subsequently returns 410 Gone", async () => {
    // 1. Send DELETE /api/attachments/:id with reason "Wrong file"
    const deleteRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Requester-Id", String(requester1Id))
      .send({ reason: "Wrong file" });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.isSoftDeleted).toBe(true);
    expect(deleteRes.body.data.deletionReason).toBe("Wrong file");

    // 2. Send GET /api/attachments/:id/download
    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Requester-Id", String(requester1Id));

    expect(downloadRes.status).toBe(410);
    expect(downloadRes.body.error).toBe("Attachment has been removed");
    expect(downloadRes.body.reason).toBe("Wrong file");
    expect(downloadRes.body.removedAt).toBeDefined();
  });

  // API-11: Add Attachment to Existing Ticket (Section 14 Part 8)
  it("API-11: Add Attachment to Existing Ticket allows authorized requester to attach a valid file", async () => {
    const newFileBuf = Buffer.from("New Attachment Content For Ticket");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requester1Id))
      .attach("file", newFileBuf, "diagnostics_log.pdf");

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.originalName).toBe("diagnostics_log.pdf");
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.isSoftDeleted).toBe(false);

    // Verify it appears in GET /api/tickets/:id
    const ticketRes = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set("X-Requester-Id", String(requester1Id));

    expect(ticketRes.status).toBe(200);
    const addedAtt = ticketRes.body.data.attachments.find(
      (a: { id: number }) => a.id === res.body.data.id
    );
    expect(addedAtt).toBeDefined();
    expect(addedAtt.originalName).toBe("diagnostics_log.pdf");

    // Verify activity history timeline entry exists
    const timelineEntry = ticketRes.body.data.activityTimeline.find(
      (entry: { message: string }) => entry.message.includes("diagnostics_log.pdf")
    );
    expect(timelineEntry).toBeDefined();
  });

  // API-12: Add Attachment Ownership Guard
  it("API-12: Add Attachment Ownership Guard returns 403 Forbidden for unauthorized requester", async () => {
    const fileBuf = Buffer.from("Hacker Payload");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requester2Id))
      .attach("file", fileBuf, "exploit.pdf");

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN_RESOURCE");
  });

  // API-13: Add Attachment Active Limit Guard (Max 5 active attachments)
  it("API-13: Add Attachment Limit Guard returns 400 Bad Request when ticket exceeds 5 active attachments", async () => {
    // Current active attachments on ticket: 1 (diagnostics_log.pdf)
    // Add 4 more attachments to reach 5 active
    for (let i = 1; i <= 4; i++) {
      const buf = Buffer.from(`Attachment content ${i}`);
      const r = await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Requester-Id", String(requester1Id))
        .attach("file", buf, `extra_doc_${i}.png`);
      expect(r.status).toBe(201);
    }

    // 6th active attachment attempt must fail with 400
    const extraBuf = Buffer.from("Sixth active attachment");
    const failRes = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requester1Id))
      .attach("file", extraBuf, "overflow_doc.png");

    expect(failRes.status).toBe(400);
    expect(failRes.body.error).toBeDefined();
    expect(failRes.body.error.code).toBe("MAX_ATTACHMENTS_EXCEEDED");
  });

  // API-14: Add Attachment File Validation
  it("API-14: Add Attachment File Validation returns 415 for unsupported media type", async () => {
    const exeBuf = Buffer.from("malicious binary content");
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Requester-Id", String(requester1Id))
      .attach("file", exeBuf, "malware.exe");

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });
});
