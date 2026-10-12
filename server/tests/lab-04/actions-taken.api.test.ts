import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 20 — Actions Taken REST API Suite (actions-taken.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let adminUser: any;
  let requesterOwner: any;
  let requesterOther: any;

  let cookieStaff: string;
  let cookieAdmin: string;
  let cookieRequesterOwner: string;
  let cookieRequesterOther: string;

  let testCategory: any;

  let activeTicketOwner: any;
  let activeTicketOther: any;
  let closedTicket: any;
  let cancelledTicket: any;

  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("ActionsPass123!");
    const now = Date.now();

    testCategory = await prisma.category.create({
      data: { name: `Actions Cat ${now}` },
    });
    createdCategoryIds.push(testCategory.id);

    staffUser = await prisma.user.create({
      data: {
        email: `actions_staff_${now}@toktickit.com`,
        fullName: "IT Staff Morgan",
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
        email: `actions_admin_${now}@toktickit.com`,
        fullName: "System Admin Alex",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(adminUser.id);
    cookieAdmin = createTestSessionCookie(adminUser);

    requesterOwner = await prisma.user.create({
      data: {
        email: `actions_req_owner_${now}@toktickit.com`,
        fullName: "Requester Jennifer",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterOwner.id);
    cookieRequesterOwner = createTestSessionCookie(requesterOwner);

    requesterOther = await prisma.user.create({
      data: {
        email: `actions_req_other_${now}@toktickit.com`,
        fullName: "Requester Bob",
        role: UserRole.REQUESTER,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(requesterOther.id);
    cookieRequesterOther = createTestSessionCookie(requesterOther);

    // Create tickets
    activeTicketOwner = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-ACT-OWN-${now}`,
        summary: "Active ticket for owner requester",
        description: "Diagnosing network printer queue issue.",
        requestedPriority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        categoryId: testCategory.id,
        requesterId: requesterOwner.id,
        ownerId: staffUser.id,
      },
    });
    createdTicketIds.push(activeTicketOwner.id);

    activeTicketOther = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-ACT-OTH-${now}`,
        summary: "Active ticket for other requester",
        description: "Software license activation issue.",
        requestedPriority: Priority.P1_HIGH,
        status: TicketStatus.OPEN,
        categoryId: testCategory.id,
        requesterId: requesterOther.id,
        ownerId: null,
      },
    });
    createdTicketIds.push(activeTicketOther.id);

    closedTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-ACT-CLS-${now}`,
        summary: "Closed ticket",
        description: "Resolved and archived issue.",
        requestedPriority: Priority.P3_LOW,
        status: TicketStatus.CLOSED,
        categoryId: testCategory.id,
        requesterId: requesterOwner.id,
        ownerId: staffUser.id,
        resolutionSummary: "Issue permanently resolved.",
      },
    });
    createdTicketIds.push(closedTicket.id);

    cancelledTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-ACT-CNC-${now}`,
        summary: "Cancelled ticket",
        description: "Requester cancelled submission.",
        requestedPriority: Priority.P3_LOW,
        status: TicketStatus.CANCELLED,
        categoryId: testCategory.id,
        requesterId: requesterOwner.id,
      },
    });
    createdTicketIds.push(cancelledTicket.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({
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

  // =========================================================================
  // ACT-API-01: Valid Action Creation & Server-Derived Performer Identity
  // =========================================================================
  describe("ACT-API-01: Valid Action Creation & Server-Derived Performer Identity", () => {
    it("creates an action successfully when called by IT Staff and derives performedById from session", async () => {
      const payload = {
        description: "Swapped network patch cable and tested Gigabit link negotiation.",
        result: "Gigabit connectivity restored and verified via Fluke meter.",
        actionType: "REPAIR",
        timeSpentMinutes: 25,
        followUpRequired: false,
        // Attemping client override: server must ignore or override with session user
        performedById: 99999,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.ticketId).toBe(activeTicketOwner.id);
      expect(res.body.data.description).toBe(payload.description);
      expect(res.body.data.result).toBe(payload.result);
      expect(res.body.data.actionType).toBe("REPAIR");
      expect(res.body.data.timeSpentMinutes).toBe(25);
      expect(res.body.data.followUpRequired).toBe(false);

      // Verify server identity derivation: performedById must be staffUser.id, NOT 99999
      expect(res.body.data.performedById).toBe(staffUser.id);
      expect(res.body.data.performedBy).toBeDefined();
      expect(res.body.data.performedBy.id).toBe(staffUser.id);
      expect(res.body.data.performedBy.fullName).toBe("IT Staff Morgan");

      // Verify audit logging in TicketActivity (AC-20-05, FR-12)
      const activity = await prisma.ticketActivity.findFirst({
        where: {
          ticketId: activeTicketOwner.id,
          type: "ACTION_TAKEN_ADDED",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(activity).not.toBeNull();
      expect(activity?.actorId).toBe(staffUser.id);
    });

    it("allows Administrator to create an action taken with session-derived identity", async () => {
      const payload = {
        description: "Reviewed network switch logs and approved maintenance request.",
        result: "Maintenance approved.",
        actionType: "CONFIGURATION",
        timeSpentMinutes: 15,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieAdmin)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.performedById).toBe(adminUser.id);
      expect(res.body.data.performedBy.role).toBe("ADMINISTRATOR");
    });
  });

  // =========================================================================
  // ACT-API-02: Rejection of Requester Creation Attempts
  // =========================================================================
  describe("ACT-API-02: Rejection of Requester Creation Attempts", () => {
    it("rejects action creation by Requester with 403 Forbidden even on their own ticket", async () => {
      const payload = {
        description: "Requester attempting to log action taken.",
        timeSpentMinutes: 30,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieRequesterOwner)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("rejects unauthenticated caller with 401 Unauthorized", async () => {
      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .send({ description: "Unauthenticated attempt" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // ACT-API-03: Field Validations & Follow-up Requirement
  // =========================================================================
  describe("ACT-API-03: Field Validations & Follow-up Requirement", () => {
    it("rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is missing", async () => {
      const payload = {
        description: "Replaced toner cartridge; noticed feeder roller squeak.",
        followUpRequired: true,
        // followUpNote is intentionally missing
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Follow-up note is required");
    });

    it("rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is empty whitespace", async () => {
      const payload = {
        description: "Replaced toner cartridge; roller issue observed.",
        followUpRequired: true,
        followUpNote: "   ",
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("accepts valid followUpNote when followUpRequired=true", async () => {
      const payload = {
        description: "Replaced toner cartridge; feeder roller needs cleaning.",
        result: "Toner replaced.",
        followUpRequired: true,
        followUpNote: "Schedule mechanical roller cleaning during next maintenance window.",
        timeSpentMinutes: 20,
      };

      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.followUpRequired).toBe(true);
      expect(res.body.data.followUpNote).toBe(payload.followUpNote);
    });

    it("rejects with 422 when description is empty or missing", async () => {
      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({ description: "   " });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects with 422 when timeSpentMinutes is non-positive or exceeds 1440", async () => {
      const resZero = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({ description: "Valid description", timeSpentMinutes: 0 });

      expect(resZero.status).toBe(422);
      expect(resZero.body.error.code).toBe("VALIDATION_ERROR");

      const resExcess = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({ description: "Valid description", timeSpentMinutes: 1500 });

      expect(resExcess.status).toBe(422);
      expect(resExcess.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects with 422 when performedAt is set in the future", async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const res = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Attempting to log action with future timestamp.",
          performedAt: futureDate,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("cannot be in the future");
    });
  });

  // =========================================================================
  // ACT-API-04: Requester Query Boundaries & Role Access Scoping
  // =========================================================================
  describe("ACT-API-04: Requester Query Boundaries & Role Access Scoping", () => {
    it("allows Requester to view actions for their owned ticket (200 OK)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieRequesterOwner);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].ticketId).toBe(activeTicketOwner.id);
    });

    it("rejects Requester with 403 Forbidden when attempting to view actions for another user's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketOther.id}/actions`)
        .set("Cookie", cookieRequesterOwner);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN_TICKET_ACCESS");
    });

    it("returns 404 Not Found for non-existent ticket ID", async () => {
      const res = await request(app)
        .get(`/api/tickets/999999/actions`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TICKET_NOT_FOUND");
    });

    it("allows IT Staff to view actions for any ticket in the queue", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketOther.id}/actions`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("returns actions sorted chronologically by actionDateTime ASC", async () => {
      const res = await request(app)
        .get(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      const actions = res.body.data;
      for (let i = 1; i < actions.length; i++) {
        const prevTime = new Date(actions[i - 1].actionDateTime).getTime();
        const currTime = new Date(actions[i].actionDateTime).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });

  // =========================================================================
  // ACT-API-05: Optimistic Concurrency Control (expectedUpdatedAt)
  // =========================================================================
  describe("ACT-API-05: Optimistic Concurrency Control (expectedUpdatedAt)", () => {
    let targetAction: any;

    beforeAll(async () => {
      targetAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Initial action entry for concurrency verification.",
          result: "Initial diagnostic complete.",
          actionType: "INVESTIGATION",
          timeSpentMinutes: 30,
        },
      });
    });

    it("returns 400 Bad Request when expectedUpdatedAt is missing from PUT payload", async () => {
      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${targetAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Updated without concurrency token",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("MISSING_CONCURRENCY_TOKEN");
      expect(res.body.error.details.requiredField).toBe("expectedUpdatedAt");
    });

    it("returns 409 Conflict with STALE_ACTION_CONFLICT when expectedUpdatedAt does not match server updatedAt", async () => {
      const staleTimestamp = new Date("2020-01-01T00:00:00.000Z").toISOString();

      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${targetAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: staleTimestamp,
          description: "Attempted edit with stale timestamp.",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("STALE_ACTION_CONFLICT");
      expect(res.body.error.details).toBeDefined();
      expect(res.body.error.details.actionId).toBe(targetAction.id);
      expect(res.body.error.details.providedUpdatedAt).toBe(staleTimestamp);
      expect(res.body.error.details.currentUpdatedAt).toBeDefined();
      expect(res.body.error.details.currentRecord).toBeDefined();
      expect(res.body.error.details.currentRecord.id).toBe(targetAction.id);
    });

    it("successfully updates action and refreshes updatedAt when expectedUpdatedAt matches server timestamp", async () => {
      // 1. Fetch fresh record to obtain current updatedAt
      const currentRecord = await prisma.actionTaken.findUnique({
        where: { id: targetAction.id },
      });
      const validToken = currentRecord!.updatedAt.toISOString();

      // 2. Perform optimistic update
      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${targetAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: validToken,
          description: "Successfully updated action with valid concurrency token.",
          result: "Resolution verification complete.",
          timeSpentMinutes: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(targetAction.id);
      expect(res.body.data.description).toBe(
        "Successfully updated action with valid concurrency token."
      );
      expect(res.body.data.timeSpentMinutes).toBe(45);

      // Verify that updatedAt timestamp has advanced
      const updatedTimestamp = new Date(res.body.data.updatedAt).getTime();
      const originalTimestamp = currentRecord!.updatedAt.getTime();
      expect(updatedTimestamp).toBeGreaterThanOrEqual(originalTimestamp);

      // Verify TicketActivity was emitted (ACTION_TAKEN_UPDATED)
      const activity = await prisma.ticketActivity.findFirst({
        where: {
          ticketId: activeTicketOwner.id,
          type: "ACTION_TAKEN_UPDATED",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(activity).not.toBeNull();
      expect(activity?.actorId).toBe(staffUser.id);
    });

    it("rejects PUT by Requester with 403 Forbidden", async () => {
      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${targetAction.id}`)
        .set("Cookie", cookieRequesterOwner)
        .send({
          expectedUpdatedAt: targetAction.updatedAt.toISOString(),
          description: "Requester edit attempt",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // =========================================================================
  // ACT-API-06: Terminal Status Check (CLOSED / CANCELLED Protection)
  // =========================================================================
  describe("ACT-API-06: Terminal Status Check (CLOSED / CANCELLED Protection)", () => {
    it("rejects action creation on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE", async () => {
      const res = await request(app)
        .post(`/api/tickets/${closedTicket.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Attempting to log action on closed ticket.",
          timeSpentMinutes: 30,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("TICKET_NOT_IN_WORKABLE_STATE");
      expect(res.body.error.message).toContain("terminal status");
    });

    it("rejects action creation on CANCELLED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE", async () => {
      const res = await request(app)
        .post(`/api/tickets/${cancelledTicket.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Attempting to log action on cancelled ticket.",
          timeSpentMinutes: 30,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("TICKET_NOT_IN_WORKABLE_STATE");
      expect(res.body.error.message).toContain("terminal status");
    });

    it("rejects action update on CLOSED ticket with 422 TICKET_NOT_IN_WORKABLE_STATE", async () => {
      // Create action directly in DB on closed ticket for testing update guard
      const actionOnClosed = await prisma.actionTaken.create({
        data: {
          ticketId: closedTicket.id,
          performedById: staffUser.id,
          description: "Pre-closure historical action.",
          timeSpentMinutes: 10,
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${closedTicket.id}/actions/${actionOnClosed.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: actionOnClosed.updatedAt.toISOString(),
          description: "Trying to modify action on closed ticket.",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("TICKET_NOT_IN_WORKABLE_STATE");
    });
  });
});
