import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 15 — Staff Ticket Operations API Suite (staff-ticket-detail.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUserA: any;
  let staffUserB: any;
  let adminUser: any;
  let requesterUser: any;
  let requesterOther: any;
  let inactiveStaffUser: any;
  let mustChangePasswordStaffUser: any;

  let cookieStaffA: string;
  let cookieStaffB: string;
  let cookieAdmin: string;
  let cookieRequester: string;
  let cookieRequesterOther: string;
  let cookieInactiveStaff: string;
  let cookieMustChangePasswordStaff: string;

  let testCategory: any;
  let testSystem: any;

  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("StaffOpsPass123!");
    const now = Date.now();

    testCategory = await prisma.category.create({
      data: { name: `StaffOps Cat ${now}` },
    });
    createdCategoryIds.push(testCategory.id);

    testSystem = await prisma.relatedSystem.create({
      data: {
        name: `StaffOps Sys ${now}`,
        categoryId: testCategory.id,
      },
    });

    staffUserA = await prisma.user.create({
      data: {
        email: `staff_a_${now}@toktickit.com`,
        fullName: "IT Staff Alex",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(staffUserA.id);
    cookieStaffA = createTestSessionCookie(staffUserA);

    staffUserB = await prisma.user.create({
      data: {
        email: `staff_b_${now}@toktickit.com`,
        fullName: "IT Staff Blake",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(staffUserB.id);
    cookieStaffB = createTestSessionCookie(staffUserB);

    adminUser = await prisma.user.create({
      data: {
        email: `staff_admin_${now}@toktickit.com`,
        fullName: "IT Admin Chris",
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
        email: `staff_req_${now}@toktickit.com`,
        fullName: "Requester Robin",
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
        email: `staff_req_other_${now}@toktickit.com`,
        fullName: "Requester Other",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterOther.id);
    cookieRequesterOther = createTestSessionCookie(requesterOther);

    inactiveStaffUser = await prisma.user.create({
      data: {
        email: `staff_inactive_${now}@toktickit.com`,
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
        email: `staff_mcp_${now}@toktickit.com`,
        fullName: "Password Expired Staff",
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
      await prisma.comment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticketActivity.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.relatedSystem.deleteMany({ where: { categoryId: { in: createdCategoryIds } } });
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
  });

  // Helper to create test tickets
  async function createTicket(overrides: Partial<any> = {}) {
    const count = createdTicketIds.length + 1;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-OPS-${Date.now()}-${count}`,
        summary: overrides.summary || `Staff Ops Ticket ${count}`,
        description: overrides.description || "Detailed description for staff operations.",
        status: overrides.status || TicketStatus.NEW,
        requestedPriority: overrides.requestedPriority || Priority.P2_MEDIUM,
        itPriority: overrides.itPriority || null,
        requesterId: overrides.requesterId || requesterUser.id,
        categoryId: overrides.categoryId || testCategory.id,
        relatedSystemId: overrides.relatedSystemId || testSystem.id,
        ownerId: overrides.ownerId !== undefined ? overrides.ownerId : null,
        resolutionSummary: overrides.resolutionSummary || null,
        cancellationReason: overrides.cancellationReason || null,
        reopenReason: overrides.reopenReason || null,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // =========================================================================
  // 1. RBAC & Security Access Tests
  // =========================================================================
  describe("1. RBAC & Security Access (AC-15-02)", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const ticket = await createTicket();
      const res = await request(app).get(`/api/staff/tickets/${ticket.id}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when a REQUESTER attempts to access staff ticket detail", async () => {
      const ticket = await createTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieRequester);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("returns 401 Unauthorized for inactive staff session", async () => {
      const ticket = await createTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieInactiveStaff);
      expect(res.status).toBe(401);
    });

    it("returns 401 Unauthorized when staff must change password", async () => {
      const ticket = await createTicket();
      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieMustChangePasswordStaff);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("allows IT_STAFF and ADMINISTRATOR to access staff ticket detail", async () => {
      const ticket = await createTicket();
      const resStaff = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieStaffA);
      expect(resStaff.status).toBe(200);

      const resAdmin = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieAdmin);
      expect(resAdmin.status).toBe(200);
    });
  });

  // =========================================================================
  // 2. Active Staff Users Dropdown (GET /api/staff/users)
  // =========================================================================
  describe("2. Active Staff Users List (GET /api/staff/users)", () => {
    it("returns active IT_STAFF and ADMINISTRATOR users, excluding requesters and inactive users", async () => {
      const res = await request(app)
        .get("/api/staff/users")
        .set("Cookie", cookieStaffA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const users = res.body.data;

      const userIds = users.map((u: any) => u.id);
      expect(userIds).toContain(staffUserA.id);
      expect(userIds).toContain(staffUserB.id);
      expect(userIds).toContain(adminUser.id);
      expect(userIds).not.toContain(requesterUser.id);
      expect(userIds).not.toContain(inactiveStaffUser.id);

      // Verify no sensitive credentials leaked
      for (const u of users) {
        expect(u.passwordHash).toBeUndefined();
        expect(u.mustChangePassword).toBeUndefined();
      }
    });

    it("rejects non-staff callers with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/users")
        .set("Cookie", cookieRequester);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 3. Operational Ticket Detail (GET /api/staff/tickets/:id)
  // =========================================================================
  describe("3. Operational Ticket Detail (GET /api/staff/tickets/:id - AC-15-01)", () => {
    it("returns complete operational ticket data with relations, owner, and timeline", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set("Cookie", cookieStaffA);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.id).toBe(ticket.id);
      expect(data.ticketNo).toBe(ticket.ticketNo);
      expect(data.summary).toBe(ticket.summary);
      expect(data.status).toBe("OPEN");
      expect(data.requester.id).toBe(requesterUser.id);
      expect(data.category.id).toBe(testCategory.id);
      expect(data.relatedSystem.id).toBe(testSystem.id);
      expect(data.owner.id).toBe(staffUserA.id);
      expect(Array.isArray(data.activityTimeline)).toBe(true);
      expect(Array.isArray(data.attachments)).toBe(true);
      expect(Array.isArray(data.comments)).toBe(true);
    });

    it("returns 404 for nonexistent ticket ID or non-integer ID", async () => {
      const res1 = await request(app)
        .get("/api/staff/tickets/99999999")
        .set("Cookie", cookieStaffA);
      expect(res1.status).toBe(404);
      expect(res1.body.error.code).toBe("TICKET_NOT_FOUND");

      const res2 = await request(app)
        .get("/api/staff/tickets/abc")
        .set("Cookie", cookieStaffA);
      expect(res2.status).toBe(404);
    });
  });

  // =========================================================================
  // 4. Concurrency-Safe Claim & Assignment (PATCH /api/staff/tickets/:id/assign)
  // =========================================================================
  describe("4. Claim & Assignment Operations (AC-15-03, AC-15-04, AC-15-05)", () => {
    it("claims an unassigned NEW ticket: assigns to caller and auto-transitions to OPEN (ST-01C)", async () => {
      const ticket = await createTicket({ status: TicketStatus.NEW, ownerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({}); // empty body = self-claim

      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(staffUserA.id);
      expect(res.body.data.status).toBe("OPEN");

      // Verify DB and TicketActivity
      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffUserA.id);
      expect(dbTicket?.status).toBe("OPEN");

      const activity = await prisma.ticketActivity.findFirst({
        where: { ticketId: ticket.id, type: "TICKET_CLAIMED" },
      });
      expect(activity).toBeDefined();
      expect(activity?.actorId).toBe(staffUserA.id);
    });

    it("explicitly assigns an unassigned NEW ticket to another staff: auto-transitions to OPEN", async () => {
      const ticket = await createTicket({ status: TicketStatus.NEW, ownerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: staffUserB.id });

      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(staffUserB.id);
      expect(res.body.data.status).toBe("OPEN");

      const activity = await prisma.ticketActivity.findFirst({
        where: { ticketId: ticket.id, type: "TICKET_ASSIGNED" },
      });
      expect(activity).toBeDefined();
    });

    it("rejects claim if ticket is already assigned (409 Conflict TICKET_ALREADY_CLAIMED)", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffB)
        .send({}); // Staff B tries to claim already owned ticket

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("TICKET_ALREADY_CLAIMED");
    });

    it("guarantees concurrency safety during simultaneous claims (exactly one winner, loser gets 409)", async () => {
      const ticket = await createTicket({ status: TicketStatus.NEW, ownerId: null });

      // Run two claims concurrently
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/assign`)
          .set("Cookie", cookieStaffA)
          .send({}),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/assign`)
          .set("Cookie", cookieStaffB)
          .send({}),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const winnerRes = res1.status === 200 ? res1 : res2;
      const loserRes = res1.status === 409 ? res1 : res2;

      expect(winnerRes.body.data.status).toBe("OPEN");
      expect(loserRes.body.error.code).toBe("TICKET_ALREADY_CLAIMED");
    });

    it("reassignment of active tickets preserves existing status (OPEN, IN_PROGRESS, WAITING, RESOLVED)", async () => {
      const activeStatuses = [
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
      ];

      for (const status of activeStatuses) {
        const ticket = await createTicket({
          status,
          ownerId: staffUserA.id,
        });

        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/assign`)
          .set("Cookie", cookieStaffA)
          .send({ ownerId: staffUserB.id });

        expect(res.status).toBe(200);
        expect(res.body.data.ownerId).toBe(staffUserB.id);
        // CRUCIAL: status must be preserved, NOT reset to OPEN!
        expect(res.body.data.status).toBe(status);

        const activity = await prisma.ticketActivity.findFirst({
          where: { ticketId: ticket.id, type: "ASSIGNMENT_CHANGED" },
        });
        expect(activity).toBeDefined();
      }
    });

    it("guarantees concurrency safety during simultaneous explicit reassignments (deterministic, exactly one winner, loser gets 409)", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });

      // Staff A tries to reassign to Staff B, while Staff B tries to reassign to adminUser simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/assign`)
          .set("Cookie", cookieStaffA)
          .send({ ownerId: staffUserB.id }),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/assign`)
          .set("Cookie", cookieStaffB)
          .send({ ownerId: adminUser.id }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const winnerRes = res1.status === 200 ? res1 : res2;
      const loserRes = res1.status === 409 ? res1 : res2;

      expect([staffUserB.id, adminUser.id]).toContain(winnerRes.body.data.ownerId);
      expect(loserRes.body.error.code).toBe("TICKET_MODIFIED_CONCURRENTLY");

      // Verify DB final state is deterministic and matches the winner
      const finalTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(finalTicket?.ownerId).toBe(winnerRes.body.data.ownerId);

      // Verify only one ASSIGNMENT_CHANGED activity was written for this race
      const activities = await prisma.ticketActivity.findMany({
        where: { ticketId: ticket.id, type: "ASSIGNMENT_CHANGED" },
      });
      expect(activities.length).toBe(1);
    });

    it("rejects explicit reassignment when caller provides stale expectedOwnerId (409 Conflict TICKET_MODIFIED_CONCURRENTLY)", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });

      // Caller expects ticket to be owned by adminUser (stale view), but it's actually owned by staffUserA
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: staffUserB.id, expectedOwnerId: adminUser.id });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("TICKET_MODIFIED_CONCURRENTLY");
      expect(res.body.error.message).toContain("concurrently");
    });

    it("rejects assignment to an inactive user with 422 INACTIVE_OWNER (AC-15-05)", async () => {
      const ticket = await createTicket({ status: TicketStatus.OPEN, ownerId: staffUserA.id });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: inactiveStaffUser.id });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INACTIVE_OWNER");
    });

    it("rejects assignment to a requester user with 422 INVALID_OWNER_ROLE (AC-15-04)", async () => {
      const ticket = await createTicket({ status: TicketStatus.OPEN, ownerId: staffUserA.id });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: requesterUser.id });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_OWNER_ROLE");
    });

    it("rejects assignment to a nonexistent user with 404 USER_NOT_FOUND", async () => {
      const ticket = await createTicket({ status: TicketStatus.OPEN, ownerId: staffUserA.id });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: 999999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });

    it("rejects assignment on CLOSED and CANCELLED tickets with 422 (AC-15-08)", async () => {
      const closedTicket = await createTicket({ status: TicketStatus.CLOSED });
      const resClosed = await request(app)
        .patch(`/api/staff/tickets/${closedTicket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: staffUserA.id });
      expect(resClosed.status).toBe(422);
      expect(resClosed.body.error.code).toBe("TICKET_CLOSED");

      const cancelledTicket = await createTicket({ status: TicketStatus.CANCELLED });
      const resCancelled = await request(app)
        .patch(`/api/staff/tickets/${cancelledTicket.id}/assign`)
        .set("Cookie", cookieStaffA)
        .send({ ownerId: staffUserA.id });
      expect(resCancelled.status).toBe(422);
      expect(resCancelled.body.error.code).toBe("TICKET_CANCELLED");
    });
  });

  // =========================================================================
  // 5. IT Priority Updates (PATCH /api/staff/tickets/:id/priority)
  // =========================================================================
  describe("5. IT Priority Updates (AC-15-16)", () => {
    it("updates itPriority independently without altering requestedPriority", async () => {
      const ticket = await createTicket({
        requestedPriority: Priority.P3_LOW,
        itPriority: null,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", cookieStaffA)
        .send({ itPriority: "P0_URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.data.itPriority).toBe("P0_URGENT");
      expect(res.body.data.requestedPriority).toBe("P3_LOW");

      const activity = await prisma.ticketActivity.findFirst({
        where: { ticketId: ticket.id, type: "PRIORITY_CHANGED" },
      });
      expect(activity).toBeDefined();
      expect(activity?.message).toContain("P0_URGENT");
    });

    it("rejects invalid priority value with 422 VALIDATION_ERROR", async () => {
      const ticket = await createTicket();
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", cookieStaffA)
        .send({ itPriority: "INVALID_PRIO" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects priority update on CLOSED and CANCELLED tickets with 422 (AC-15-08)", async () => {
      const closedTicket = await createTicket({ status: TicketStatus.CLOSED });
      const resClosed = await request(app)
        .patch(`/api/staff/tickets/${closedTicket.id}/priority`)
        .set("Cookie", cookieStaffA)
        .send({ itPriority: "P1_HIGH" });
      expect(resClosed.status).toBe(422);
      expect(resClosed.body.error.code).toBe("TICKET_CLOSED");

      const cancelledTicket = await createTicket({ status: TicketStatus.CANCELLED });
      const resCancelled = await request(app)
        .patch(`/api/staff/tickets/${cancelledTicket.id}/priority`)
        .set("Cookie", cookieStaffA)
        .send({ itPriority: "P1_HIGH" });
      expect(resCancelled.status).toBe(422);
      expect(resCancelled.body.error.code).toBe("TICKET_CANCELLED");
    });
  });

  // =========================================================================
  // 6. State Machine & Status Transitions (PATCH /api/staff/tickets/:id/status)
  // =========================================================================
  describe("6. State Machine & Status Transitions (AC-15-06, AC-15-07, AC-15-13)", () => {
    it("ST-01A: direct NEW -> OPEN succeeds when owner is already assigned", async () => {
      const ticket = await createTicket({
        status: TicketStatus.NEW,
        ownerId: staffUserA.id,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("OPEN");

      const activity = await prisma.ticketActivity.findFirst({
        where: { ticketId: ticket.id, type: "STATUS_CHANGED" },
      });
      expect(activity).toBeDefined();
    });

    it("ST-01B: direct NEW -> OPEN is rejected when unassigned (422 OWNER_REQUIRED_FOR_OPEN)", async () => {
      const ticket = await createTicket({
        status: TicketStatus.NEW,
        ownerId: null,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "OPEN" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("OWNER_REQUIRED_FOR_OPEN");

      // Verify DB status remained strictly NEW
      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.status).toBe("NEW");
    });

    it("ST-02: NEW -> CANCELLED with valid cancellationReason succeeds", async () => {
      const ticket = await createTicket({ status: TicketStatus.NEW });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "CANCELLED",
          cancellationReason: "User requested cancellation of this ticket.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
      expect(res.body.data.cancellationReason).toBe(
        "User requested cancellation of this ticket."
      );
    });

    it("ST-03: OPEN -> IN_PROGRESS succeeds", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });

    it("ST-04: OPEN -> CANCELLED succeeds with reason", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "CANCELLED",
          cancellationReason: "Duplicate request opened by user mistake.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("ST-05: IN_PROGRESS -> WAITING_FOR_REQUESTER succeeds", async () => {
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "WAITING_FOR_REQUESTER" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("WAITING_FOR_REQUESTER");
    });

    it("ST-06: IN_PROGRESS -> RESOLVED succeeds with resolutionSummary", async () => {
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Reinstalled software driver and tested connectivity.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("RESOLVED");
      expect(res.body.data.resolutionSummary).toBe(
        "Reinstalled software driver and tested connectivity."
      );
    });

    it("ST-07: IN_PROGRESS -> CANCELLED succeeds with cancellationReason", async () => {
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "CANCELLED",
          cancellationReason: "Cancelled because hardware was decommissioned.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("ST-08: WAITING_FOR_REQUESTER -> IN_PROGRESS succeeds", async () => {
      const ticket = await createTicket({
        status: TicketStatus.WAITING_FOR_REQUESTER,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_PROGRESS");
    });

    it("ST-09: WAITING_FOR_REQUESTER -> CANCELLED succeeds with cancellationReason", async () => {
      const ticket = await createTicket({
        status: TicketStatus.WAITING_FOR_REQUESTER,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "CANCELLED",
          cancellationReason: "No response from requester for two weeks.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });

    it("ST-10: RESOLVED -> CLOSED succeeds", async () => {
      const ticket = await createTicket({
        status: TicketStatus.RESOLVED,
        ownerId: staffUserA.id,
        resolutionSummary: "Previous resolution note.",
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "CLOSED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CLOSED");
    });

    it("ST-11: RESOLVED -> REOPENED succeeds with reopenReason", async () => {
      const ticket = await createTicket({
        status: TicketStatus.RESOLVED,
        ownerId: staffUserA.id,
        resolutionSummary: "Previous resolution note.",
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "REOPENED",
          reopenReason: "Problem recurred after machine rebooted.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REOPENED");
      expect(res.body.data.reopenReason).toBe(
        "Problem recurred after machine rebooted."
      );
    });

    it("ST-12: CLOSED -> REOPENED succeeds with reopenReason", async () => {
      const ticket = await createTicket({
        status: TicketStatus.CLOSED,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({
          status: "REOPENED",
          reopenReason: "User reports the same fault after system update.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REOPENED");
      expect(res.body.data.reopenReason).toBe(
        "User reports the same fault after system update."
      );
    });

    it("ST-13: REOPENED -> OPEN succeeds and returns reopened ticket to queue", async () => {
      const ticket = await createTicket({
        status: TicketStatus.REOPENED,
        ownerId: staffUserA.id,
      });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("OPEN");
    });

    it("ST-14: Terminal CANCELLED rejects ANY status transition with empty allowedNextStatuses", async () => {
      const ticket = await createTicket({ status: TicketStatus.CANCELLED });
      const targets = ["OPEN", "IN_PROGRESS", "REOPENED", "RESOLVED", "CLOSED"];

      for (const target of targets) {
        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", cookieStaffA)
          .send({ status: target });

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
        expect(res.body.error.details.allowedNextStatuses).toEqual([]);
      }
    });

    it("ST-15: Invalid transitions return exact 422 envelope with allowedNextStatuses", async () => {
      // NEW -> RESOLVED is invalid
      const newTicket = await createTicket({ status: TicketStatus.NEW });
      const res1 = await request(app)
        .patch(`/api/staff/tickets/${newTicket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "RESOLVED", resolutionSummary: "Summary text" });

      expect(res1.status).toBe(422);
      expect(res1.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res1.body.error.details.allowedNextStatuses).toEqual(["OPEN", "CANCELLED"]);

      // CLOSED -> IN_PROGRESS is invalid
      const closedTicket = await createTicket({ status: TicketStatus.CLOSED });
      const res2 = await request(app)
        .patch(`/api/staff/tickets/${closedTicket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "IN_PROGRESS" });

      expect(res2.status).toBe(422);
      expect(res2.body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(res2.body.error.details.allowedNextStatuses).toEqual(["REOPENED"]);
    });

    it("ST-16: Missing/short reason validation returns 422 VALIDATION_ERROR", async () => {
      const inProgressTicket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        ownerId: staffUserA.id,
      });

      // RESOLVED without resolutionSummary (<10 chars)
      const resResolved = await request(app)
        .patch(`/api/staff/tickets/${inProgressTicket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "RESOLVED", resolutionSummary: "short" });
      expect(resResolved.status).toBe(422);
      expect(resResolved.body.error.code).toBe("VALIDATION_ERROR");

      // CANCELLED without cancellationReason (<10 chars)
      const resCancelled = await request(app)
        .patch(`/api/staff/tickets/${inProgressTicket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "CANCELLED", cancellationReason: "short" });
      expect(resCancelled.status).toBe(422);
      expect(resCancelled.body.error.code).toBe("VALIDATION_ERROR");

      // REOPENED without reopenReason (<10 chars)
      const resolvedTicket = await createTicket({
        status: TicketStatus.RESOLVED,
        ownerId: staffUserA.id,
      });
      const resReopened = await request(app)
        .patch(`/api/staff/tickets/${resolvedTicket.id}/status`)
        .set("Cookie", cookieStaffA)
        .send({ status: "REOPENED", reopenReason: "short" });
      expect(resReopened.status).toBe(422);
      expect(resReopened.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("AC-15-13: Requester cannot directly access staff status endpoint (403)", async () => {
      const ticket = await createTicket({ status: TicketStatus.OPEN });
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", cookieRequester)
        .send({ status: "RESOLVED", resolutionSummary: "Attempted by requester" });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 7. Transaction Atomicity & Deterministic Rollback (AC-15-17)
  // =========================================================================
  describe("7. Transaction Atomicity & Rollback (AC-15-17)", () => {
    it("rolls back ticket status mutation atomically if TicketActivity creation fails (deterministic PostgreSQL CHECK constraint)", async () => {
      // 1. Arrange: Create a dedicated test ticket in OPEN status
      const testTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-ROLLBACK-${Date.now()}`,
          summary: "Deterministic Rollback Test Ticket",
          description: "Testing database transaction atomicity.",
          status: TicketStatus.OPEN,
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          ownerId: staffUserA.id,
        },
      });

      // 2. Inject Deterministic Database Constraint:
      // Exclusively target testTicket.id so NO other ticket or concurrent test is affected
      const CONSTRAINT_NAME = `rollback_check_tkt_${testTicket.id}`;
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "TicketActivity" ADD CONSTRAINT "${CONSTRAINT_NAME}" CHECK ("ticketId" != ${testTicket.id});`
      );

      try {
        // 3. Act: Attempt status transition to CANCELLED on testTicket
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicket.id}/status`)
          .set("Cookie", cookieStaffA)
          .send({
            status: "CANCELLED",
            cancellationReason: "Deterministic rollback verification reason.",
          });

        // Step 2 in transaction will fail with PostgreSQL check_violation (23514), aborting transaction
        expect(res.status).toBe(500);

        // 4. Assert: Database state must be 100% UNCHANGED
        const dbTicket = await prisma.ticket.findUniqueOrThrow({
          where: { id: testTicket.id },
        });
        expect(dbTicket.status).toBe(TicketStatus.OPEN);
        expect(dbTicket.cancellationReason).toBeNull();

        // No partial TicketActivity record must exist
        const activities = await prisma.ticketActivity.findMany({
          where: { ticketId: testTicket.id },
        });
        expect(activities.length).toBe(0);
      } finally {
        // 5. Clean up: Drop the temporary constraint and clean up test ticket
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "TicketActivity" DROP CONSTRAINT IF EXISTS "${CONSTRAINT_NAME}";`
        );
        await prisma.ticket.delete({ where: { id: testTicket.id } }).catch(() => {});
      }
    });
  });

  // =========================================================================
  // 8. Attachment Access Matrix Tests (ATT-01 .. ATT-12)
  // =========================================================================
  describe("8. Attachment Access Matrix (AC-15-14, AC-15-15, ATT-01..12)", () => {
    const dummyBuffer = Buffer.from("%PDF-1.4 test dummy pdf content");

    it("ATT-01: Requester uploads file to their own active ticket -> 201 Created", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieRequester)
        .attach("file", dummyBuffer, "test_doc.pdf");

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      const dbAtt = await prisma.attachment.findUnique({ where: { id: res.body.data.id } });
      expect(dbAtt?.uploadedById).toBe(requesterUser.id);
      expect(dbAtt?.isSoftDeleted).toBe(false);
    });

    it("ATT-02: IT_STAFF uploads file to another user's active ticket -> 201 Created", async () => {
      const ticket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieStaffA)
        .attach("file", dummyBuffer, "staff_doc.pdf");

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      const dbAtt = await prisma.attachment.findUnique({ where: { id: res.body.data.id } });
      expect(dbAtt?.uploadedById).toBe(staffUserA.id);
    });

    it("ATT-03: ADMINISTRATOR uploads file to another user's active ticket -> 201 Created", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieAdmin)
        .attach("file", dummyBuffer, "admin_doc.pdf");

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      const dbAtt = await prisma.attachment.findUnique({ where: { id: res.body.data.id } });
      expect(dbAtt?.uploadedById).toBe(adminUser.id);
    });

    it("ATT-04: Requester attempts upload to another requester's ticket -> 404 Not Found", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieRequesterOther)
        .attach("file", dummyBuffer, "leak_test.pdf");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("ATT-05: IT_STAFF attempt upload to CLOSED ticket -> 422 TICKET_CLOSED", async () => {
      const ticket = await createTicket({ status: TicketStatus.CLOSED });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieStaffA)
        .attach("file", dummyBuffer, "closed_test.pdf");

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TICKET_CLOSED");
    });

    it("ATT-06: IT_STAFF attempt upload to CANCELLED ticket -> 422 TICKET_CANCELLED", async () => {
      const ticket = await createTicket({ status: TicketStatus.CANCELLED });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Cookie", cookieStaffA)
        .attach("file", dummyBuffer, "cancelled_test.pdf");

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TICKET_CANCELLED");
    });

    it("ATT-07: Requester removes an attachment they personally uploaded -> 200 OK", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "my_upload.pdf",
          storageKey: "dummy_storage_key_07",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: requesterUser.id,
          isSoftDeleted: false,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${att.id}/remove`)
        .set("Cookie", cookieRequester)
        .send({ reason: "Other", customReason: "No longer needed for diagnosis" });

      expect(res.status).toBe(200);

      const dbAtt = await prisma.attachment.findUnique({ where: { id: att.id } });
      expect(dbAtt?.isSoftDeleted).toBe(true);
      expect(dbAtt?.deletionReason).toBe("No longer needed for diagnosis");
    });

    it("ATT-08: Requester attempts to remove attachment uploaded by IT_STAFF -> 403 Forbidden", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "staff_uploaded.pdf",
          storageKey: "dummy_storage_key_08",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: staffUserA.id, // Uploaded by staff!
          isSoftDeleted: false,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${att.id}/remove`)
        .set("Cookie", cookieRequester)
        .send({ reason: "Requester trying to delete staff attachment" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      const dbAtt = await prisma.attachment.findUnique({ where: { id: att.id } });
      expect(dbAtt?.isSoftDeleted).toBe(false);
    });

    it("ATT-09: IT_STAFF removes attachment uploaded by Requester on active ticket -> 200 OK", async () => {
      const ticket = await createTicket({
        status: TicketStatus.OPEN,
        requesterId: requesterUser.id,
      });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "req_upload_to_remove.pdf",
          storageKey: "dummy_storage_key_09",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: requesterUser.id,
          isSoftDeleted: false,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${att.id}/remove`)
        .set("Cookie", cookieStaffA)
        .send({ reason: "Other", customReason: "Sensitive info in attachment removed by staff" });

      expect(res.status).toBe(200);

      const dbAtt = await prisma.attachment.findUnique({ where: { id: att.id } });
      expect(dbAtt?.isSoftDeleted).toBe(true);
      expect(dbAtt?.deletedBy).toBe(staffUserA.id);
    });

    it("ATT-10: Attempt to remove attachment from CLOSED ticket -> 422 TICKET_CLOSED", async () => {
      const ticket = await createTicket({ status: TicketStatus.CLOSED });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "closed_att.pdf",
          storageKey: "dummy_storage_key_10",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: staffUserA.id,
          isSoftDeleted: false,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${att.id}/remove`)
        .set("Cookie", cookieStaffA)
        .send({ reason: "Trying to remove on closed ticket" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TICKET_CLOSED");
    });

    it("ATT-11: Attempt to remove attachment from CANCELLED ticket -> 422 TICKET_CANCELLED", async () => {
      const ticket = await createTicket({ status: TicketStatus.CANCELLED });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "cancelled_att.pdf",
          storageKey: "dummy_storage_key_11",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: staffUserA.id,
          isSoftDeleted: false,
        },
      });

      const res = await request(app)
        .post(`/api/attachments/${att.id}/remove`)
        .set("Cookie", cookieStaffA)
        .send({ reason: "Trying to remove on cancelled ticket" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TICKET_CANCELLED");
    });

    it("ATT-12: Downloading a soft-deleted attachment returns 410 Gone (AC-15-15)", async () => {
      const ticket = await createTicket({ status: TicketStatus.OPEN });

      const att = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          originalName: "soft_deleted_att.pdf",
          storageKey: "dummy_storage_key_12",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: staffUserA.id,
          isSoftDeleted: true,
          deletionReason: "Archived attachment",
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/attachments/${att.id}/download`)
        .set("Cookie", cookieStaffA);

      expect(res.status).toBe(410);
      expect(res.body.code).toBe("ATTACHMENT_SOFT_DELETED");
    });
  });
});
