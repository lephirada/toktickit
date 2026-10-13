import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 21 — Ticket Resolution Gate and Lab 3 Preservation (resolution-gate.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let adminUser: any;
  let requesterUser: any;
  let inactiveStaffUser: any;
  let mustChangePasswordStaffUser: any;

  let cookieStaff: string;
  let cookieAdmin: string;
  let cookieRequester: string;
  let cookieInactiveStaff: string;
  let cookieMustChangePasswordStaff: string;

  let testCategory: any;

  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("GatePass123!");
    const now = Date.now();

    testCategory = await prisma.category.create({
      data: { name: `Gate Cat ${now}` },
    });
    createdCategoryIds.push(testCategory.id);

    staffUser = await prisma.user.create({
      data: {
        email: `gate_staff_${now}@toktickit.com`,
        fullName: "IT Staff Casey",
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
        email: `gate_admin_${now}@toktickit.com`,
        fullName: "Admin Riley",
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
        email: `gate_req_${now}@toktickit.com`,
        fullName: "Requester Sam",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterUser.id);
    cookieRequester = createTestSessionCookie(requesterUser);

    inactiveStaffUser = await prisma.user.create({
      data: {
        email: `gate_inactive_${now}@toktickit.com`,
        fullName: "Inactive Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: false,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(inactiveStaffUser.id);
    cookieInactiveStaff = createTestSessionCookie(inactiveStaffUser);

    mustChangePasswordStaffUser = await prisma.user.create({
      data: {
        email: `gate_mcp_${now}@toktickit.com`,
        fullName: "Password Change Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: true,
      },
    });
    createdUserIds.push(mustChangePasswordStaffUser.id);
    cookieMustChangePasswordStaff = createTestSessionCookie(mustChangePasswordStaffUser);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.comment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticketActivity.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({
        where: { id: { in: createdCategoryIds } },
      });
    }
  });

  // Helper to create tickets in DB
  async function createTicket(options: {
    status?: TicketStatus;
    ownerId?: number | null;
    requesterId?: number;
    resolutionIndicated?: boolean;
    resolutionSummary?: string | null;
  }) {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-GATE-${unique}`,
        summary: `Test Ticket ${unique}`,
        description: `Description for ticket ${unique}`,
        requestedPriority: Priority.P2_MEDIUM,
        status: options.status ?? TicketStatus.IN_PROGRESS,
        categoryId: testCategory.id,
        requesterId: options.requesterId ?? requesterUser.id,
        ownerId: options.ownerId !== undefined ? options.ownerId : staffUser.id,
        resolutionIndicated: options.resolutionIndicated ?? false,
        resolutionSummary: options.resolutionSummary ?? null,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // Helper to create an action taken record in DB
  async function createAction(ticketId: number, performedById: number = staffUser.id) {
    return prisma.actionTaken.create({
      data: {
        ticketId,
        performedById,
        description: "Diagnosed system logs and resolved underlying service fault.",
        actionType: "INVESTIGATION",
        result: "Root cause found and remediated.",
        timeSpentMinutes: 30,
      },
    });
  }

  // =========================================================================
  // Section 1: Authentication & Role-Based Authorization
  // =========================================================================
  describe("Authentication and Authorization (PATCH /api/tickets/:id/status)", () => {
    it("returns 401 UNAUTHORIZED when no session cookie is provided", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .send({ status: "RESOLVED", resolutionSummary: "Resolved without auth." });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when session cookie is tampered or invalid", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", "toktickit_session=invalid.token.payload")
        .send({ status: "RESOLVED", resolutionSummary: "Resolved with bad cookie." });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieMustChangePasswordStaff)
        .send({ status: "RESOLVED", resolutionSummary: "Resolved while password change pending." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("returns 403 FORBIDDEN when user has role REQUESTER", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieRequester)
        .send({ status: "RESOLVED", resolutionSummary: "Requester attempting status change." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("allows ADMINISTRATOR to transition status", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id, adminUser.id);

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieAdmin)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Administrator verified and resolved ticket.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
    });
  });

  // =========================================================================
  // Section 2: Input & State Machine Error Handling
  // =========================================================================
  describe("Validation & State Machine Errors", () => {
    it("returns 404 TICKET_NOT_FOUND when ID is invalid or non-numeric", async () => {
      const res = await request(app)
        .patch("/api/tickets/abc/status")
        .set("Cookie", cookieStaff)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 404 TICKET_NOT_FOUND when ticket does not exist", async () => {
      const res = await request(app)
        .patch("/api/tickets/999999/status")
        .set("Cookie", cookieStaff)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("returns 422 VALIDATION_ERROR when status is omitted from body", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 INVALID_STATUS_TRANSITION when transition is illegal in state machine (e.g. NEW -> RESOLVED)", async () => {
      const ticket = await createTicket({ status: TicketStatus.NEW, ownerId: null });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Attempting illegal direct transition from NEW to RESOLVED.",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res.body.error.details.currentStatus).toBe("NEW");
      expect(res.body.error.details.requestedStatus).toBe("RESOLVED");
    });
  });

  // =========================================================================
  // Section 3: Resolution Gate Boundary Tests (AC-21-01 to AC-21-07)
  // =========================================================================
  describe("Resolution Gate Boundary Tests (AC-21-01 to AC-21-07)", () => {
    it("Boundary 1 (AC-21-01): returns 422 VALIDATION_ERROR when resolutionSummary is missing or null", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const resMissing = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({ status: "RESOLVED" });

      expect(resMissing.status).toBe(422);
      expect(resMissing.body.error.code).toBe("VALIDATION_ERROR");

      const resNull = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({ status: "RESOLVED", resolutionSummary: null });

      expect(resNull.status).toBe(422);
      expect(resNull.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Boundary 2 (AC-21-02): returns 422 VALIDATION_ERROR when resolutionSummary has fewer than 10 characters", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Fixed it.", // 9 chars
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Boundary 3 (AC-21-03): succeeds with 200 OK when resolutionSummary is exactly 10 characters and actionsCount >= 1", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "1234567890", // Exactly 10 chars
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe("1234567890");
    });

    it("Boundary 4 (AC-21-04): succeeds with 200 OK when resolutionSummary is exactly 1,000 characters and actionsCount >= 1", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const summary1000 = "a".repeat(1000);
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: summary1000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe(summary1000);
    });

    it("Boundary 5 (AC-21-05): returns 422 VALIDATION_ERROR when resolutionSummary exceeds 1,000 characters (1,001 chars)", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const summary1001 = "a".repeat(1001);
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: summary1001,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Boundary 6 (AC-21-06): returns 422 RESOLUTION_ACTION_REQUIRED when actionsCount === 0", async () => {
      // IN_PROGRESS ticket with ZERO actions taken
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Replaced hardware and verified operation without logging any action.",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");
      expect(res.body.error.message).toBe(
        "At least one action taken must be recorded before resolving this ticket."
      );
      expect(res.body.error.details).toEqual({
        ticketId: ticket.id,
        currentStatus: "IN_PROGRESS",
        requestedStatus: "RESOLVED",
        actionsCount: 0,
      });

      // Verify DB status remained unchanged
      const freshTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(freshTicket!.status).toBe("IN_PROGRESS");
    });

    it("Boundary 7 (AC-21-07): succeeds with 200 OK when actionsCount >= 1, updating status to RESOLVED and creating TicketActivity audit", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      const resolutionText = "Replaced faulty switch port module and restored full network connectivity.";
      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: resolutionText,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ticket.id);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe(resolutionText);

      // Verify DB ticket record
      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket!.status).toBe("RESOLVED");
      expect(dbTicket!.resolutionSummary).toBe(resolutionText);

      // Verify TicketActivity audit entry was created
      const activities = await prisma.ticketActivity.findMany({
        where: { ticketId: ticket.id, type: "STATUS_CHANGED" },
      });
      expect(activities.length).toBeGreaterThanOrEqual(1);
      const latestActivity = activities[activities.length - 1];
      expect(latestActivity.actorId).toBe(staffUser.id);
      expect(latestActivity.action).toBe("Status updated");
      expect((latestActivity.metadata as any)?.fromStatus).toBe("IN_PROGRESS");
      expect((latestActivity.metadata as any)?.toStatus).toBe("RESOLVED");
      expect((latestActivity.metadata as any)?.resolutionSummary).toBe(resolutionText);
    });
  });

  // =========================================================================
  // Section 4: Cancellation and Reopen Reason Validations
  // =========================================================================
  describe("Other Status Transitions Reason Validation", () => {
    it("requires cancellationReason (10-500 chars) when transitioning to CANCELLED", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const resShort = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "CANCELLED",
          cancellationReason: "Short", // < 10 chars
        });

      expect(resShort.status).toBe(422);
      expect(resShort.body.error.code).toBe("VALIDATION_ERROR");

      const resValid = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "CANCELLED",
          cancellationReason: "User requested cancellation due to duplicate submission.",
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.data.status).toBe("CANCELLED");
    });

    it("requires reopenReason (10-500 chars) when transitioning from RESOLVED to REOPENED", async () => {
      const ticket = await createTicket({
        status: TicketStatus.RESOLVED,
        resolutionSummary: "Initial resolution summary.",
      });

      const resShort = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "REOPENED",
          reopenReason: "Short",
        });

      expect(resShort.status).toBe(422);
      expect(resShort.body.error.code).toBe("VALIDATION_ERROR");

      const resValid = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "REOPENED",
          reopenReason: "Problem reoccurred immediately after reboot during morning shift.",
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.data.status).toBe("REOPENED");
    });
  });

  // =========================================================================
  // Section 5: BR-05 Requester Advisory Resolution Indication (AC-21-09)
  // =========================================================================
  describe("BR-05 Requester Advisory Indication (AC-21-09)", () => {
    it("sets resolutionIndicated = true and leaves ticket.status unaltered (IN_PROGRESS remains IN_PROGRESS)", async () => {
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/confirm-resolved`)
        .set("Cookie", cookieRequester)
        .send({ feedbackComment: "Everything is working again, thank you!" });

      expect(res.status).toBe(200);
      expect(res.body.data.resolutionIndicated).toBe(true);
      expect(res.body.data.status).toBe("IN_PROGRESS"); // Strictly unaltered

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket!.resolutionIndicated).toBe(true);
      expect(dbTicket!.status).toBe("IN_PROGRESS");
    });

    it("leaves ticket.status unaltered when called on WAITING_FOR_REQUESTER ticket", async () => {
      const ticket = await createTicket({
        status: TicketStatus.WAITING_FOR_REQUESTER,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/confirm-resolved`)
        .set("Cookie", cookieRequester)
        .send({ feedbackComment: "Confirmed working." });

      expect(res.status).toBe(200);
      expect(res.body.data.resolutionIndicated).toBe(true);
      expect(res.body.data.status).toBe("WAITING_FOR_REQUESTER"); // Strictly unaltered

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket!.resolutionIndicated).toBe(true);
      expect(dbTicket!.status).toBe("WAITING_FOR_REQUESTER");
    });

    it("proves requester advisory indication cannot bypass resolution gate (actionsCount === 0 still rejected)", async () => {
      // Requester confirmed resolution, but NO ActionTaken exists
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
        resolutionIndicated: true,
      });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Attempting to resolve based solely on requester indication.",
        });

      // Must STILL reject because actionsCount is 0!
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("RESOLUTION_ACTION_REQUIRED");
    });
  });

  // =========================================================================
  // Section 6: Concurrency and Race Condition Handling
  // =========================================================================
  describe("Concurrency & Conflict Handling (TICKET_MODIFIED_CONCURRENTLY)", () => {
    it("proves deterministic CAS conflict rejection: returns 409 TICKET_MODIFIED_CONCURRENTLY when ticket status is modified concurrently during the transaction (updateMany count === 0)", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      // Controlled test strategy: Intercept $transaction using vi.spyOn to simulate an interleaved concurrent commit
      // The handler passes findUnique and passes validateStatusTransition (from IN_PROGRESS).
      // Right before updateMany executes, a concurrent update shifts the ticket status in PostgreSQL.
      // updateMany({ where: { id: ticket.id, status: 'IN_PROGRESS' } }) matches 0 rows, triggering the CAS failure.
      const realTransaction = prisma.$transaction.bind(prisma);
      const txSpy = vi
        .spyOn(prisma, "$transaction")
        .mockImplementationOnce(async (fn: any, ...args: any[]) => {
          return realTransaction(async (tx: any) => {
            // Concurrently change the ticket status directly in the database from a separate connection
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { status: TicketStatus.WAITING_FOR_REQUESTER },
            });
            return fn(tx);
          }, ...args);
        });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Valid resolution summary attempting to resolve.",
        });

      txSpy.mockRestore();

      // Assert that the CAS failure path was exercised and returned 409 with exact error code
      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("TICKET_MODIFIED_CONCURRENTLY");
      expect(res.body.error.message).toBe(
        "Ticket status was modified concurrently by another request. Please reload the latest ticket state."
      );

      // Verify the ticket status in DB remains the concurrent modification (WAITING_FOR_REQUESTER), not overwritten
      const freshTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(freshTicket!.status).toBe("WAITING_FOR_REQUESTER");
    });

    it("proves concurrent request integration: mutual exclusion allows exactly one winner and safely rejects competing attempt", async () => {
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(ticket.id);

      // Staff Casey attempts to RESOLVE while Admin Riley attempts to CANCEL simultaneously
      const reqResolve = request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Staff Casey resolved the issue after verification.",
        });

      const reqCancel = request(app)
        .patch(`/api/tickets/${ticket.id}/status`)
        .set("Cookie", cookieAdmin)
        .send({
          status: "CANCELLED",
          cancellationReason: "Admin Riley cancelled ticket due to superseded order.",
        });

      const [res1, res2] = await Promise.all([reqResolve, reqCancel]);

      const statuses = [res1.status, res2.status].sort();
      // One request MUST succeed with 200
      expect(statuses[0]).toBe(200);
      // The other request must be safely rejected (either 409 CAS conflict or 422 state-machine conflict)
      expect([409, 422]).toContain(statuses[1]);

      const winnerRes = res1.status === 200 ? res1 : res2;
      const loserRes = res1.status === 200 ? res2 : res1;

      expect(winnerRes.body.data).toBeDefined();
      expect(["RESOLVED", "CANCELLED"]).toContain(winnerRes.body.data.status);

      // Loser must have an error envelope
      expect(loserRes.body.error).toBeDefined();

      // DB status must strictly match the winner's committed status
      const freshTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(freshTicket!.status).toBe(winnerRes.body.data.status);
    });
  });

  // =========================================================================
  // Section 7: Lab 3 Endpoint Preservation (ST-06)
  // =========================================================================
  describe("Lab 3 Endpoint Preservation (PATCH /api/staff/tickets/:id/status)", () => {
    it("preserves Lab 3 behavior: allows resolving without ActionTaken on the legacy endpoint", async () => {
      // IN_PROGRESS ticket with ZERO ActionTaken records
      const ticket = await createTicket({ status: TicketStatus.IN_PROGRESS });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaff)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Legacy Lab 3 endpoint resolution without requiring actions.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe(
        "Legacy Lab 3 endpoint resolution without requiring actions."
      );
    });
  });
});
