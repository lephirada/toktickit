import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { TicketStatus, UserRole } from "@prisma/client";

describe("Issue 15 — Public Comments & Internal Notes Suite (comments-notes.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let adminUser: any;
  let requesterUser: any;
  let requesterOther: any;

  let cookieStaff: string;
  let cookieAdmin: string;
  let cookieRequester: string;
  let cookieRequesterOther: string;

  let testCategory: any;
  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("NotesPass123!");
    const now = Date.now();

    testCategory = await prisma.category.create({
      data: { name: `Notes Cat ${now}` },
    });
    createdCategoryIds.push(testCategory.id);

    staffUser = await prisma.user.create({
      data: {
        email: `notes_staff_${now}@toktickit.com`,
        fullName: "Notes IT Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(staffUser.id);
    cookieStaff = createTestSessionCookie(staffUser);

    adminUser = await prisma.user.create({
      data: {
        email: `notes_admin_${now}@toktickit.com`,
        fullName: "Notes Admin",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(adminUser.id);
    cookieAdmin = createTestSessionCookie(adminUser);

    requesterUser = await prisma.user.create({
      data: {
        email: `notes_req_${now}@toktickit.com`,
        fullName: "Notes Requester",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterUser.id);
    cookieRequester = createTestSessionCookie(requesterUser);

    requesterOther = await prisma.user.create({
      data: {
        email: `notes_other_${now}@toktickit.com`,
        fullName: "Other Requester",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterOther.id);
    cookieRequesterOther = createTestSessionCookie(requesterOther);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticketActivity.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
  });

  async function createTestTicket(status: TicketStatus = TicketStatus.OPEN) {
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-NOTE-${Date.now()}-${createdTicketIds.length + 1}`,
        summary: `Notes Test Ticket ${createdTicketIds.length + 1}`,
        description: "Testing notes and comments isolation.",
        status,
        requesterId: requesterUser.id,
        categoryId: testCategory.id,
        ownerId: staffUser.id,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // =========================================================================
  // 1. Public Comments (AC-15-09)
  // =========================================================================
  describe("1. Public Comments (AC-15-09)", () => {
    it("creates public comment by staff and requester", async () => {
      const ticket = await createTestTicket();

      // Staff posts public comment
      const resStaff = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "Hello from IT staff. We are investigating." });

      expect(resStaff.status).toBe(201);
      expect(resStaff.body.data.body).toBe("Hello from IT staff. We are investigating.");

      // Requester posts public comment
      const resReq = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieRequester)
        .send({ content: "Thank you for looking into this." });

      expect(resReq.status).toBe(201);
      expect(resReq.body.data.body).toBe("Thank you for looking into this.");
    });

    it("rejects whitespace-only public comment with 422", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "     " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("lists public comments created by staff with author, timestamp, and content", async () => {
      const ticket = await createTestTicket();

      // Staff posts public comment
      const createRes = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "Official staff public update." });

      expect(createRes.status).toBe(201);

      // List comments as staff
      const listRes = await request(app)
        .get(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      const found = listRes.body.data.find(
        (c: any) => c.content === "Official staff public update." || c.body === "Official staff public update."
      );
      expect(found).toBeDefined();
      expect(found.authorRole).toBe("IT_STAFF");
      expect(found.authorName).toBe("Notes IT Staff");
      expect(found.createdAt).toBeDefined();
    });

    it("verifies public comment length boundaries: accepts 1 and 2000 chars, rejects 2001 chars", async () => {
      const ticket = await createTestTicket();

      // 1 char boundary -> 201
      const res1 = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "A" });
      expect(res1.status).toBe(201);

      // 2000 chars boundary -> 201
      const res2000 = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "B".repeat(2000) });
      expect(res2000.status).toBe(201);

      // 2001 chars boundary -> 422
      const res2001 = await request(app)
        .post(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "C".repeat(2001) });
      expect(res2001.status).toBe(422);
      expect(res2001.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // =========================================================================
  // 2. Internal Notes (AC-15-10)
  // =========================================================================
  describe("2. Internal Notes Creation & Retrieval (AC-15-10)", () => {
    it("allows IT_STAFF to create an internal note with isInternal: true and logs TicketActivity", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "Confidential diagnostic findings: replace RAM chip." });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe(
        "Confidential diagnostic findings: replace RAM chip."
      );
      expect(res.body.data.authorId).toBe(staffUser.id);
      expect(res.body.data.authorRole).toBe("IT_STAFF");

      // Verify in DB that isInternal is strictly true
      const dbNote = await prisma.comment.findFirst({
        where: { ticketId: ticket.id, isInternal: true },
      });
      expect(dbNote).toBeDefined();
      expect(dbNote?.isInternal).toBe(true);
      expect(dbNote?.body).toBe("Confidential diagnostic findings: replace RAM chip.");

      // Verify TicketActivity was created
      const activity = await prisma.ticketActivity.findFirst({
        where: { ticketId: ticket.id, type: "INTERNAL_NOTE_ADDED" },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(staffUser.id);
    });

    it("allows ADMINISTRATOR to create internal notes", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieAdmin)
        .send({ content: "Admin note: approved for warranty replacement." });

      expect(res.status).toBe(201);
      expect(res.body.data.authorRole).toBe("ADMINISTRATOR");
    });

    it("rejects REQUESTER from posting internal notes (403 Forbidden)", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieRequester)
        .send({ content: "Requester trying to post internal note." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects empty or whitespace-only internal note with 422", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "   \n\t  " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("verifies internal note length boundaries: accepts 1 and 2000 chars, rejects 2001 chars with 422", async () => {
      const ticket = await createTestTicket();

      // 1 char boundary -> 201
      const res1 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "X" });
      expect(res1.status).toBe(201);
      expect(res1.body.data.content).toBe("X");

      // 2000 chars boundary -> 201
      const res2000 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "Y".repeat(2000) });
      expect(res2000.status).toBe(201);
      expect(res2000.body.data.content).toBe("Y".repeat(2000));

      // 2001 chars boundary -> 422
      const res2001 = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "Z".repeat(2001) });
      expect(res2001.status).toBe(422);
      expect(res2001.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects adding internal note on CLOSED and CANCELLED tickets with 422", async () => {
      const closedTicket = await createTestTicket(TicketStatus.CLOSED);
      const resClosed = await request(app)
        .post(`/api/staff/tickets/${closedTicket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "Attempting note on closed ticket" });
      expect(resClosed.status).toBe(422);
      expect(resClosed.body.error.code).toBe("TICKET_CLOSED");

      const cancelledTicket = await createTestTicket(TicketStatus.CANCELLED);
      const resCancelled = await request(app)
        .post(`/api/staff/tickets/${cancelledTicket.id}/notes`)
        .set("Cookie", cookieStaff)
        .send({ content: "Attempting note on cancelled ticket" });
      expect(resCancelled.status).toBe(422);
      expect(resCancelled.body.error.code).toBe("TICKET_CANCELLED");
    });

    it("retrieves list of internal notes via GET /api/staff/tickets/:id/notes for staff", async () => {
      const ticket = await createTestTicket();

      await prisma.comment.createMany({
        data: [
          {
            ticketId: ticket.id,
            authorId: staffUser.id,
            body: "First private note",
            isInternal: true,
          },
          {
            ticketId: ticket.id,
            authorId: adminUser.id,
            body: "Second private note",
            isInternal: true,
          },
        ],
      });

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].content).toBe("First private note");
      expect(res.body.data[1].content).toBe("Second private note");
    });

    it("rejects REQUESTER from accessing GET /api/staff/tickets/:id/notes (403 Forbidden)", async () => {
      const ticket = await createTestTicket();

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}/notes`)
        .set("Cookie", cookieRequester);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. Privacy & Zero-Leakage Verification (AC-15-11)
  // =========================================================================
  describe("3. Internal Notes Privacy & Leakage Prevention (AC-15-11)", () => {
    it("never returns internal notes in GET /api/tickets/:id for requester", async () => {
      const ticket = await createTestTicket();

      // Create 1 public comment and 1 internal note
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: requesterUser.id,
          body: "Visible requester comment",
          isInternal: false,
        },
      });

      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: staffUser.id,
          body: "TOP SECRET INTERNAL NOTE NEVER SHOW REQUESTER",
          isInternal: true,
        },
      });

      // Requester views ticket detail
      const res = await request(app)
        .get(`/api/tickets/${ticket.id}`)
        .set("Cookie", cookieRequester);

      expect(res.status).toBe(200);
      const comments = res.body.data.comments || [];
      expect(comments.length).toBe(1);
      expect(comments[0].body).toBe("Visible requester comment");

      // Verify JSON payload across entire response does NOT contain the secret text
      const fullResponseJson = JSON.stringify(res.body);
      expect(fullResponseJson).not.toContain("TOP SECRET INTERNAL NOTE");
    });

    it("never returns internal notes in GET /api/tickets/:id/comments for requester", async () => {
      const ticket = await createTestTicket();

      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: staffUser.id,
          body: "CLASSIFIED INTERNAL NOTE",
          isInternal: true,
        },
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket.id}/comments`)
        .set("Cookie", cookieRequester);

      expect(res.status).toBe(200);
      const comments = res.body.data || [];
      const noteMatch = comments.find((c: any) =>
        c.body?.includes("CLASSIFIED INTERNAL NOTE")
      );
      expect(noteMatch).toBeUndefined();
    });
  });
});
