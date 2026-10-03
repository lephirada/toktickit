import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { COOKIE_NAME, getJwtSecret } from "../../src/utils/jwt.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("Issue 12 — Role & Ownership Authorization Matrix (authorization.api.test.ts)", () => {
  const prisma = getPrisma();

  let req1User: any;
  let req2User: any;
  let staffUser: any;
  let adminUser: any;
  let deactUser: any;
  let gateUser: any;

  let cookieReq1: string;
  let cookieReq2: string;
  let cookieStaff: string;
  let cookieAdmin: string;
  let cookieDeact: string;
  let cookieGate: string;

  let categoryId: number;
  let ticket1Id: number;
  let ticket2Id: number;
  let waitingTicketId: number;
  let inProgressTicketId: number;
  let newTicketId: number;

  beforeAll(async () => {
    const dummyHash = await hashPassword("AuthMatrixPass123!");
    const now = Date.now();

    // 1. Create distinct test personas
    req1User = await prisma.user.create({
      data: {
        email: `auth_req1_${now}@toktickit.com`,
        fullName: "Matrix Requester One",
        role: "REQUESTER",
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    req2User = await prisma.user.create({
      data: {
        email: `auth_req2_${now}@toktickit.com`,
        fullName: "Matrix Requester Two",
        role: "REQUESTER",
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        email: `auth_staff_${now}@toktickit.com`,
        fullName: "Matrix Staff User",
        role: "IT_STAFF",
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `auth_admin_${now}@toktickit.com`,
        fullName: "Matrix Admin User",
        role: "ADMINISTRATOR",
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });

    deactUser = await prisma.user.create({
      data: {
        email: `auth_deact_${now}@toktickit.com`,
        fullName: "Matrix Deactivated User",
        role: "REQUESTER",
        passwordHash: dummyHash,
        isActive: false,
        mustChangePassword: false,
      },
    });

    gateUser = await prisma.user.create({
      data: {
        email: `auth_gate_${now}@toktickit.com`,
        fullName: "Matrix Gate User",
        role: "REQUESTER",
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Generate authenticated session cookies
    cookieReq1 = createTestSessionCookie(req1User);
    cookieReq2 = createTestSessionCookie(req2User);
    cookieStaff = createTestSessionCookie(staffUser);
    cookieAdmin = createTestSessionCookie(adminUser);
    cookieDeact = createTestSessionCookie(deactUser);
    cookieGate = createTestSessionCookie(gateUser);

    // 2. Fetch category
    const cat = await prisma.category.findFirstOrThrow();
    categoryId = cat.id;

    // 3. Create test tickets
    const t1 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-MAT-${now}-001`,
        summary: "Requester One Laptop Fault",
        description: "Screen flickering on Requester One laptop.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        requesterId: req1User.id,
        categoryId,
      },
    });
    ticket1Id = t1.id;

    const t2 = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-MAT-${now}-002`,
        summary: "Requester Two VPN Issue",
        description: "Cannot connect to VPN from home network.",
        requestedPriority: Priority.P1_HIGH,
        status: TicketStatus.NEW,
        requesterId: req2User.id,
        categoryId,
      },
    });
    ticket2Id = t2.id;

    const tWaiting = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-MAT-${now}-003`,
        summary: "Requester One Waiting for Reply",
        description: "Waiting for user response on diagnostics.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.WAITING_FOR_REQUESTER,
        requesterId: req1User.id,
        categoryId,
      },
    });
    waitingTicketId = tWaiting.id;

    const tInProgress = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-MAT-${now}-004`,
        summary: "Requester One In Progress Ticket",
        description: "Ticket is actively being resolved.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        requesterId: req1User.id,
        categoryId,
      },
    });
    inProgressTicketId = tInProgress.id;

    const tNew = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-MAT-${now}-005`,
        summary: "Requester One New Status Ticket",
        description: "Brand new ticket.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        requesterId: req1User.id,
        categoryId,
      },
    });
    newTicketId = tNew.id;

    // Add comments: 1 public and 1 internal to ticket1
    await prisma.comment.create({
      data: {
        ticketId: ticket1Id,
        authorId: staffUser.id,
        body: "Public update: technician dispatched.",
        isInternal: false,
      },
    });

    await prisma.comment.create({
      data: {
        ticketId: ticket1Id,
        authorId: staffUser.id,
        body: "Internal note: vendor SLA breached.",
        isInternal: true,
      },
    });
  });

  afterAll(async () => {
    const userIds = [
      req1User?.id,
      req2User?.id,
      staffUser?.id,
      adminUser?.id,
      deactUser?.id,
      gateUser?.id,
    ].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } });
      await prisma.attachment.deleteMany({ where: { uploadedById: { in: userIds } } });
      await prisma.ticketActivity.deleteMany({ where: { actorId: { in: userIds } } });
      await prisma.ticket.deleteMany({ where: { requesterId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  // =========================================================================
  // 1. Role-Based Access Matrix: REQUESTER-only endpoints
  // =========================================================================
  describe("REQUESTER-Only Endpoints Guarding", () => {
    it("allows REQUESTER to access GET /api/tickets (My Tickets)", async () => {
      const res = await request(app).get("/api/tickets").set("Cookie", cookieReq1);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
    });

    it("denies IT_STAFF from GET /api/tickets with 403 FORBIDDEN_ROLE", async () => {
      const res = await request(app).get("/api/tickets").set("Cookie", cookieStaff);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("denies ADMINISTRATOR from GET /api/tickets with 403 FORBIDDEN_ROLE", async () => {
      const res = await request(app).get("/api/tickets").set("Cookie", cookieAdmin);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("allows REQUESTER to post to POST /api/tickets", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookieReq1)
        .send({
          summary: "Matrix Test Requester Ticket",
          description: "Testing requester ticket creation capability.",
          categoryId,
          priority: "P2_MEDIUM",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.requesterId).toBe(req1User.id);
    });

    it("denies IT_STAFF from POST /api/tickets with 403 FORBIDDEN_ROLE", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookieStaff)
        .send({
          summary: "Staff Attempted Ticket",
          description: "Staff creating ticket directly on requester route.",
          categoryId,
          priority: "P2_MEDIUM",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("denies ADMINISTRATOR from POST /api/tickets with 403 FORBIDDEN_ROLE", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", cookieAdmin)
        .send({
          summary: "Admin Attempted Ticket",
          description: "Admin creating ticket directly on requester route.",
          categoryId,
          priority: "P2_MEDIUM",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // =========================================================================
  // 2. Cross-Requester Ownership Isolation & Anti-Leakage (AC-12-12)
  // =========================================================================
  describe("Cross-Requester Ownership Isolation & Anti-Leakage", () => {
    it("returns 404 Not Found when Requester Two attempts to view Requester One ticket (GET /api/tickets/:id)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}`)
        .set("Cookie", cookieReq2);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 404 Not Found when Requester Two attempts to list comments on Requester One ticket (GET /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieReq2);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 404 Not Found when Requester Two attempts to post comment on Requester One ticket (POST /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieReq2)
        .send({ content: "Malicious requester comment" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 404 Not Found when Requester Two attempts to confirm resolved on Requester One ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket1Id}/confirm-resolved`)
        .set("Cookie", cookieReq2);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });
  });

  // =========================================================================
  // 3. Staff & Administrator Access Where Permitted
  // =========================================================================
  describe("Staff & Administrator Access Where Permitted", () => {
    it("allows IT_STAFF to view any ticket (GET /api/tickets/:id)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ticket1Id);
    });

    it("allows ADMINISTRATOR to view any ticket (GET /api/tickets/:id)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}`)
        .set("Cookie", cookieAdmin);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ticket1Id);
    });

    it("allows IT_STAFF to list public comments on any ticket (GET /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].content).toContain("technician dispatched");
    });

    it("allows ADMINISTRATOR to list public comments on any ticket (GET /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieAdmin);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it("strictly filters internal notes out of public comments endpoint", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      const note = res.body.data.find((c: any) => c.content.includes("vendor SLA breached"));
      expect(note).toBeUndefined();
    });

    it("allows IT_STAFF to post public comment on a ticket (POST /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieStaff)
        .send({ content: "IT Staff public response to user." });

      expect(res.status).toBe(201);
      expect(res.body.data.authorRole).toBe("IT_STAFF");
      expect(res.body.data.authorId).toBe(staffUser.id);
    });

    it("allows ADMINISTRATOR to post public comment on a ticket (POST /api/tickets/:id/comments)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieAdmin)
        .send({ content: "Administrator executive note to user." });

      expect(res.status).toBe(201);
      expect(res.body.data.authorRole).toBe("ADMINISTRATOR");
      expect(res.body.data.authorId).toBe(adminUser.id);
    });

    it("denies IT_STAFF and ADMINISTRATOR from calling POST /api/tickets/:id/confirm-resolved (Requester-only)", async () => {
      const staffRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/confirm-resolved`)
        .set("Cookie", cookieStaff);

      expect(staffRes.status).toBe(403);
      expect(staffRes.body.error.code).toBe("FORBIDDEN_ROLE");

      const adminRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/confirm-resolved`)
        .set("Cookie", cookieAdmin);

      expect(adminRes.status).toBe(403);
      expect(adminRes.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // =========================================================================
  // 4. Discussion Endpoints Business Logic & Side Effects
  // =========================================================================
  describe("Discussion Endpoints Business Logic & Preconditions", () => {
    it("rejects blank or whitespace-only comments with 422 Unprocessable Entity", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieReq1)
        .send({ content: "   " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("automatically transitions ticket from WAITING_FOR_REQUESTER to IN_PROGRESS upon requester comment (AC-15-12)", async () => {
      // Verify initial state
      const beforeTicket = await prisma.ticket.findUnique({ where: { id: waitingTicketId } });
      expect(beforeTicket?.status).toBe("WAITING_FOR_REQUESTER");

      const res = await request(app)
        .post(`/api/tickets/${waitingTicketId}/comments`)
        .set("Cookie", cookieReq1)
        .send({ content: "Here is the diagnostic log you requested." });

      expect(res.status).toBe(201);

      // Verify status auto-transitioned to IN_PROGRESS
      const afterTicket = await prisma.ticket.findUnique({ where: { id: waitingTicketId } });
      expect(afterTicket?.status).toBe("IN_PROGRESS");
    });

    it("rejects confirm-resolved on tickets in NEW status with 422", async () => {
      const res = await request(app)
        .post(`/api/tickets/${newTicketId}/confirm-resolved`)
        .set("Cookie", cookieReq1);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("allows ticket owner to confirm resolved on IN_PROGRESS ticket without setting status to RESOLVED (BR-05)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${inProgressTicketId}/confirm-resolved`)
        .set("Cookie", cookieReq1)
        .send({ feedbackComment: "Device reboot fixed the problem." });

      expect(res.status).toBe(200);
      expect(res.body.data.resolutionIndicated).toBe(true);
      expect(res.body.data.status).toBe("IN_PROGRESS"); // NEVER set to RESOLVED (BR-05)

      // Verify in DB
      const dbTicket = await prisma.ticket.findUnique({ where: { id: inProgressTicketId } });
      expect(dbTicket?.resolutionIndicated).toBe(true);
      expect(dbTicket?.status).toBe("IN_PROGRESS");

      // Verify automated resolution feedback comment was appended
      const comments = await prisma.comment.findMany({ where: { ticketId: inProgressTicketId } });
      const feedback = comments.find((c) => c.body.includes("[Resolution Feedback]"));
      expect(feedback).toBeDefined();
      expect(feedback?.body).toContain("Device reboot fixed the problem.");
    });

    it("rejects duplicate confirm-resolved with 409 ALREADY_INDICATED_RESOLVED", async () => {
      const res = await request(app)
        .post(`/api/tickets/${inProgressTicketId}/confirm-resolved`)
        .set("Cookie", cookieReq1);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ALREADY_INDICATED_RESOLVED");
    });
  });

  // =========================================================================
  // 5. Password-Change Gate & Inactive Revocation Across Related Endpoints
  // =========================================================================
  describe("Password-Change Gate & Account Deactivation Across Endpoints", () => {
    it("blocks mustChangePassword users from operational discussion routes", async () => {
      const commentsRes = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieGate);
      expect(commentsRes.status).toBe(403);
      expect(commentsRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

      const postCommentRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieGate)
        .send({ content: "Blocked comment" });
      expect(postCommentRes.status).toBe(403);
      expect(postCommentRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

      const confirmRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/confirm-resolved`)
        .set("Cookie", cookieGate);
      expect(confirmRes.status).toBe(403);
      expect(confirmRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("rejects deactivated users with 401 ACCOUNT_DEACTIVATED across all endpoints", async () => {
      const ticketsRes = await request(app).get("/api/tickets").set("Cookie", cookieDeact);
      expect(ticketsRes.status).toBe(401);
      expect(ticketsRes.body.error.code).toBe("ACCOUNT_DEACTIVATED");

      const ticketDetailRes = await request(app)
        .get(`/api/tickets/${ticket1Id}`)
        .set("Cookie", cookieDeact);
      expect(ticketDetailRes.status).toBe(401);
      expect(ticketDetailRes.body.error.code).toBe("ACCOUNT_DEACTIVATED");

      const commentsRes = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", cookieDeact);
      expect(commentsRes.status).toBe(401);
      expect(commentsRes.body.error.code).toBe("ACCOUNT_DEACTIVATED");
    });
  });

  // =========================================================================
  // 6. Token Authentication Validation (Missing, Invalid, Expired)
  // =========================================================================
  describe("Authentication Token Validation (Missing, Invalid, Expired Tokens)", () => {
    it("returns 401 UNAUTHORIZED when session cookie is missing", async () => {
      const getTicketsRes = await request(app).get("/api/tickets");
      expect(getTicketsRes.status).toBe(401);
      expect(getTicketsRes.body.error.code).toBe("UNAUTHORIZED");

      const getTicketDetailRes = await request(app).get(`/api/tickets/${ticket1Id}`);
      expect(getTicketDetailRes.status).toBe(401);
      expect(getTicketDetailRes.body.error.code).toBe("UNAUTHORIZED");

      const getCommentsRes = await request(app).get(`/api/tickets/${ticket1Id}/comments`);
      expect(getCommentsRes.status).toBe(401);
      expect(getCommentsRes.body.error.code).toBe("UNAUTHORIZED");

      const postCommentRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .send({ content: "Unauthorized comment" });
      expect(postCommentRes.status).toBe(401);
      expect(postCommentRes.body.error.code).toBe("UNAUTHORIZED");

      const confirmResolvedRes = await request(app).post(`/api/tickets/${ticket1Id}/confirm-resolved`);
      expect(confirmResolvedRes.status).toBe(401);
      expect(confirmResolvedRes.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when session cookie is invalid or tampered", async () => {
      const tamperedCookie = `${COOKIE_NAME}=not-a-valid-jwt-token-string`;

      const getCommentsRes = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", tamperedCookie);
      expect(getCommentsRes.status).toBe(401);
      expect(getCommentsRes.body.error.code).toBe("UNAUTHORIZED");

      const postCommentRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", tamperedCookie)
        .send({ content: "Tampered comment" });
      expect(postCommentRes.status).toBe(401);
      expect(postCommentRes.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when session cookie contains an expired token", async () => {
      const expiredToken = jwt.sign(
        {
          sub: req1User.id,
          email: req1User.email,
          role: req1User.role,
        },
        getJwtSecret(),
        { expiresIn: -10 }
      );
      const expiredCookie = `${COOKIE_NAME}=${expiredToken}`;

      const getCommentsRes = await request(app)
        .get(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", expiredCookie);
      expect(getCommentsRes.status).toBe(401);
      expect(getCommentsRes.body.error.code).toBe("UNAUTHORIZED");

      const postCommentRes = await request(app)
        .post(`/api/tickets/${ticket1Id}/comments`)
        .set("Cookie", expiredCookie)
        .send({ content: "Expired comment" });
      expect(postCommentRes.status).toBe(401);
      expect(postCommentRes.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
