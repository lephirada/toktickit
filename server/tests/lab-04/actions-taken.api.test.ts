import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 20 — Actions Taken REST API Suite (actions-taken.api.test.ts)", () => {
  const prisma = getPrisma();

  let staffUser: any;
  let secondStaffUser: any;
  let inactiveStaffUser: any;
  let mustChangePasswordStaffUser: any;
  let adminUser: any;
  let requesterOwner: any;
  let requesterOther: any;

  let cookieStaff: string;
  let cookieSecondStaff: string;
  let cookieInactiveStaff: string;
  let cookieMustChangePasswordStaff: string;
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

    secondStaffUser = await prisma.user.create({
      data: {
        email: `actions_staff2_${now}@toktickit.com`,
        fullName: "IT Staff Jordan",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(secondStaffUser.id);
    cookieSecondStaff = createTestSessionCookie(secondStaffUser);

    inactiveStaffUser = await prisma.user.create({
      data: {
        email: `actions_inactive_${now}@toktickit.com`,
        fullName: "Inactive IT Staff",
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
        email: `actions_mcp_${now}@toktickit.com`,
        fullName: "Password Expired Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: true,
      },
    });
    createdUserIds.push(mustChangePasswordStaffUser.id);
    cookieMustChangePasswordStaff = createTestSessionCookie(mustChangePasswordStaffUser);

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
    it("rejects with 422 VALIDATION_ERROR when result is omitted or empty", async () => {
      // 1. Missing result
      const resMissing = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action performed without result field.",
        });

      expect(resMissing.status).toBe(422);
      expect(resMissing.body.error).toBeDefined();
      expect(resMissing.body.error.code).toBe("VALIDATION_ERROR");
      expect(resMissing.body.error.message).toContain("Action result is required");

      // 2. Empty whitespace result
      const resEmpty = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action performed with whitespace result.",
          result: "   ",
        });

      expect(resEmpty.status).toBe(422);
      expect(resEmpty.body.error.code).toBe("VALIDATION_ERROR");
      expect(resEmpty.body.error.message).toContain("Action result is required");

      // 3. Exceeds 2000 chars
      const resTooLong = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action performed with excessive result length.",
          result: "A".repeat(2001),
        });

      expect(resTooLong.status).toBe(422);
      expect(resTooLong.body.error.code).toBe("VALIDATION_ERROR");
      expect(resTooLong.body.error.message).toContain("Action result is required and must be between 1 and 2000 characters");
    });

    it("rejects with 422 VALIDATION_ERROR when followUpRequired=true and followUpNote is missing", async () => {
      const payload = {
        description: "Replaced toner cartridge; noticed feeder roller squeak.",
        result: "Hardware inspected and toner cartridge replaced.",
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
        result: "Hardware inspected and toner cartridge replaced.",
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
        .send({ description: "   ", result: "Valid result text." });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects with 422 when timeSpentMinutes is non-positive or exceeds 1440", async () => {
      const resZero = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({ description: "Valid description", result: "Completed work.", timeSpentMinutes: 0 });

      expect(resZero.status).toBe(422);
      expect(resZero.body.error.code).toBe("VALIDATION_ERROR");

      const resExcess = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({ description: "Valid description", result: "Completed work.", timeSpentMinutes: 1500 });

      expect(resExcess.status).toBe(422);
      expect(resExcess.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects with 422 when performedAt is set in the future (even slightly by a few seconds)", async () => {
      // 1. Far future (24 hours)
      const farFutureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      const resFar = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Attempting to log action with far future timestamp.",
          result: "Future action diagnostic test.",
          timeSpentMinutes: 30,
          performedAt: farFutureDate,
        });

      expect(resFar.status).toBe(422);
      expect(resFar.body.error.code).toBe("VALIDATION_ERROR");
      expect(resFar.body.error.message).toContain("cannot be in the future");

      // 2. Near future (5 seconds in future) - must be rejected without 60s leniency
      const nearFutureDate = new Date(Date.now() + 5000).toISOString();
      const resNear = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Attempting to log action 5 seconds in future.",
          result: "Near future test.",
          timeSpentMinutes: 30,
          performedAt: nearFutureDate,
        });

      expect(resNear.status).toBe(422);
      expect(resNear.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNear.body.error.message).toContain("cannot be in the future");
    });

    it("rejects PUT with 422 when followUpNote exceeds 1000 characters even if followUpRequired is false", async () => {
      const testAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Action for PUT note length boundary test.",
          result: "Completed.",
          timeSpentMinutes: 15,
        },
      });

      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: testAction.updatedAt.toISOString(),
          followUpRequired: false,
          followUpNote: "A".repeat(1001),
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("cannot exceed 1000 characters");
    });

    it("rejects PUT with 422 when performedAt is set in the near future", async () => {
      const testAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Action for PUT future timestamp boundary test.",
          result: "Completed.",
          timeSpentMinutes: 15,
        },
      });

      const nearFutureDate = new Date(Date.now() + 5000).toISOString();
      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: testAction.updatedAt.toISOString(),
          performedAt: nearFutureDate,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("cannot be in the future");
    });

    it("rejects POST with 422 VALIDATION_ERROR when followUpRequired is non-boolean ('invalid', 123, null) and creates no record", async () => {
      const initialCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });

      // 1. String "invalid"
      const resString = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with invalid string followUpRequired.",
          result: "Diagnostic test.",
          followUpRequired: "invalid",
        });

      expect(resString.status).toBe(422);
      expect(resString.body.error).toBeDefined();
      expect(resString.body.error.code).toBe("VALIDATION_ERROR");
      expect(resString.body.error.message).toContain("followUpRequired must be a boolean");

      // 2. Number 123
      const resNumber = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with numeric followUpRequired.",
          result: "Diagnostic test.",
          followUpRequired: 123,
        });

      expect(resNumber.status).toBe(422);
      expect(resNumber.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNumber.body.error.message).toContain("followUpRequired must be a boolean");

      // 3. Null value
      const resNull = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with null followUpRequired.",
          result: "Diagnostic test.",
          followUpRequired: null,
        });

      expect(resNull.status).toBe(422);
      expect(resNull.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNull.body.error.message).toContain("followUpRequired must be a boolean");

      // Assert zero new action records created in the database
      const finalCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });
      expect(finalCount).toBe(initialCount);
    });

    it("rejects PUT with 422 VALIDATION_ERROR when followUpRequired is non-boolean ('invalid', 123, null) and does not modify record or updatedAt", async () => {
      const testAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Action for PUT followUpRequired type boundary test.",
          result: "Initial result.",
          followUpRequired: false,
          timeSpentMinutes: 20,
        },
      });

      const originalToken = testAction.updatedAt.toISOString();

      // 1. String "invalid"
      const resString = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          followUpRequired: "invalid",
          description: "Attempted illegal modification.",
        });

      expect(resString.status).toBe(422);
      expect(resString.body.error.code).toBe("VALIDATION_ERROR");
      expect(resString.body.error.message).toContain("followUpRequired must be a boolean");

      // 2. Number 123
      const resNumber = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          followUpRequired: 123,
          description: "Attempted illegal modification.",
        });

      expect(resNumber.status).toBe(422);
      expect(resNumber.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNumber.body.error.message).toContain("followUpRequired must be a boolean");

      // 3. Null value
      const resNull = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          followUpRequired: null,
          description: "Attempted illegal modification.",
        });

      expect(resNull.status).toBe(422);
      expect(resNull.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNull.body.error.message).toContain("followUpRequired must be a boolean");

      // Verify the record in DB was untouched: followUpRequired is still false and updatedAt is unchanged
      const persisted = await prisma.actionTaken.findUnique({
        where: { id: testAction.id },
      });
      expect(persisted).toBeDefined();
      expect(persisted!.followUpRequired).toBe(false);
      expect(persisted!.description).toBe("Action for PUT followUpRequired type boundary test.");
      expect(persisted!.updatedAt.toISOString()).toBe(originalToken);
    });

    it("rejects POST with 422 VALIDATION_ERROR when followUpNote is non-string (number, object) even if followUpRequired is false and creates no record", async () => {
      const initialCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });

      // 1. Numeric followUpNote
      const resNumber = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with numeric followUpNote.",
          result: "Diagnostic test.",
          followUpRequired: false,
          followUpNote: 12345,
        });

      expect(resNumber.status).toBe(422);
      expect(resNumber.body.error).toBeDefined();
      expect(resNumber.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNumber.body.error.message).toContain("cannot exceed 1000 characters");

      // 2. Object followUpNote
      const resObject = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with object followUpNote.",
          result: "Diagnostic test.",
          followUpRequired: false,
          followUpNote: { note: "nested object payload" },
        });

      expect(resObject.status).toBe(422);
      expect(resObject.body.error).toBeDefined();
      expect(resObject.body.error.code).toBe("VALIDATION_ERROR");
      expect(resObject.body.error.message).toContain("cannot exceed 1000 characters");

      // Assert no records created in database
      const finalCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });
      expect(finalCount).toBe(initialCount);
    });

    it("rejects POST with 422 VALIDATION_ERROR when timeSpentMinutes is missing or null and creates no record", async () => {
      const initialCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });

      // 1. Missing timeSpentMinutes
      const resMissing = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action missing timeSpentMinutes field.",
          result: "Diagnostic test.",
          followUpRequired: false,
        });

      expect(resMissing.status).toBe(422);
      expect(resMissing.body.error).toBeDefined();
      expect(resMissing.body.error.code).toBe("VALIDATION_ERROR");
      expect(resMissing.body.error.message).toContain("Time spent is required");

      // 2. timeSpentMinutes is null
      const resNull = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieStaff)
        .send({
          description: "Action with null timeSpentMinutes.",
          result: "Diagnostic test.",
          timeSpentMinutes: null,
          followUpRequired: false,
        });

      expect(resNull.status).toBe(422);
      expect(resNull.body.error).toBeDefined();
      expect(resNull.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNull.body.error.message).toContain("Time spent is required");

      // Assert zero database mutations
      const finalCount = await prisma.actionTaken.count({
        where: { ticketId: activeTicketOwner.id },
      });
      expect(finalCount).toBe(initialCount);
    });

    it("rejects PUT with 422 VALIDATION_ERROR when timeSpentMinutes is null or invalid and preserves database state", async () => {
      const testAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Initial action to test PUT timeSpentMinutes validation.",
          result: "Completed inspection.",
          actionType: "INSPECTION",
          followUpRequired: false,
          timeSpentMinutes: 45,
        },
      });

      const originalToken = testAction.updatedAt.toISOString();

      // 1. timeSpentMinutes: null
      const resNull = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          timeSpentMinutes: null,
          description: "Attempted illegal modification with null time.",
        });

      expect(resNull.status).toBe(422);
      expect(resNull.body.error.code).toBe("VALIDATION_ERROR");
      expect(resNull.body.error.message).toContain("Time spent must be an integer between 1 and 1440");

      // 2. timeSpentMinutes: 0
      const resZero = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          timeSpentMinutes: 0,
        });

      expect(resZero.status).toBe(422);
      expect(resZero.body.error.code).toBe("VALIDATION_ERROR");

      // 3. timeSpentMinutes: 1500 (> 1440)
      const resExceed = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          timeSpentMinutes: 1500,
        });

      expect(resExceed.status).toBe(422);
      expect(resExceed.body.error.code).toBe("VALIDATION_ERROR");

      // Verify the record in DB was untouched: timeSpentMinutes is still 45
      const persisted = await prisma.actionTaken.findUnique({
        where: { id: testAction.id },
      });
      expect(persisted!.timeSpentMinutes).toBe(45);
      expect(persisted!.updatedAt.toISOString()).toBe(originalToken);
    });

    it("allows PUT to omit timeSpentMinutes and preserves original timeSpentMinutes", async () => {
      const testAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Initial action to test partial PUT.",
          result: "Completed inspection.",
          actionType: "INSPECTION",
          followUpRequired: false,
          timeSpentMinutes: 50,
        },
      });

      const originalToken = testAction.updatedAt.toISOString();

      const res = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${testAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: originalToken,
          description: "Updated description without specifying timeSpentMinutes.",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.timeSpentMinutes).toBe(50);
      expect(res.body.data.description).toBe("Updated description without specifying timeSpentMinutes.");

      const persisted = await prisma.actionTaken.findUnique({
        where: { id: testAction.id },
      });
      expect(persisted!.timeSpentMinutes).toBe(50);
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
    it("rejects inactive IT Staff with 401 Unauthorized across actions endpoints (Lab 3 boundary)", async () => {
      const resGet = await request(app)
        .get(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieInactiveStaff);
      expect(resGet.status).toBe(401);
      expect(resGet.body.error.code).toBe("ACCOUNT_DEACTIVATED");

      const resPost = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieInactiveStaff)
        .send({
          description: "Inactive staff trying to post",
          result: "Done",
        });
      expect(resPost.status).toBe(401);
      expect(resPost.body.error.code).toBe("ACCOUNT_DEACTIVATED");
    });

    it("rejects IT Staff with mustChangePassword=true with 403 PASSWORD_CHANGE_REQUIRED (Lab 3 boundary)", async () => {
      const resGet = await request(app)
        .get(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieMustChangePasswordStaff);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

      const resPost = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieMustChangePasswordStaff)
        .send({
          description: "Staff must change password trying to post",
          result: "Done",
        });
      expect(resPost.status).toBe(403);
      expect(resPost.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("allows IT Staff to collaborate across ticket boundaries (unassigned or assigned to peer staff)", async () => {
      // activeTicketOwner is owned by staffUser. Jordan is a different IT Staff member.
      const resPostPeer = await request(app)
        .post(`/api/tickets/${activeTicketOwner.id}/actions`)
        .set("Cookie", cookieSecondStaff)
        .send({
          description: "Peer IT Staff Jordan assisting on Morgan's assigned ticket.",
          result: "Checked switch port logs and resolved ARP cache issue.",
          timeSpentMinutes: 15,
        });

      expect(resPostPeer.status).toBe(201);
      expect(resPostPeer.body.data.performedById).toBe(secondStaffUser.id);
      expect(resPostPeer.body.data.performedBy.fullName).toBe("IT Staff Jordan");

      // IT Staff Jordan can also record actions on unassigned ticket activeTicketOther
      const resPostUnassigned = await request(app)
        .post(`/api/tickets/${activeTicketOther.id}/actions`)
        .set("Cookie", cookieSecondStaff)
        .send({
          description: "Initial intake triage by Jordan on unassigned ticket.",
          result: "Licensing key validated and applied.",
          timeSpentMinutes: 20,
        });

      expect(resPostUnassigned.status).toBe(201);
      expect(resPostUnassigned.body.data.performedById).toBe(secondStaffUser.id);
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

    it("proves ATOMIC concurrency: concurrent edits with same expectedUpdatedAt allow exactly one to succeed with 200 and one to fail with 409 STALE_ACTION_CONFLICT", async () => {
      // 1. Create a dedicated action record for concurrent modification
      const raceAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Baseline description before concurrent race.",
          result: "Baseline result.",
          actionType: "INVESTIGATION",
          timeSpentMinutes: 10,
        },
      });

      const initialToken = raceAction.updatedAt.toISOString();

      // 2. Simulate two IT Staff members concurrently saving edits from the same base version
      const reqStaff1 = request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${raceAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: initialToken,
          description: "Update by Staff Morgan: Re-flashed firmware.",
          result: "Firmware version 2.4.1 flashed successfully.",
          timeSpentMinutes: 35,
        });

      const reqStaff2 = request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${raceAction.id}`)
        .set("Cookie", cookieSecondStaff)
        .send({
          expectedUpdatedAt: initialToken,
          description: "Update by Staff Jordan: Replaced interface module.",
          result: "Module 10G SFP+ swapped and tested.",
          timeSpentMinutes: 40,
        });

      // Execute concurrently
      const [res1, res2] = await Promise.all([reqStaff1, reqStaff2]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const successRes = res1.status === 200 ? res1 : res2;
      const conflictRes = res1.status === 409 ? res1 : res2;

      // Assert winner was saved
      expect(successRes.body.data.id).toBe(raceAction.id);
      expect(new Date(successRes.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
        raceAction.updatedAt.getTime()
      );

      // Assert loser received STALE_ACTION_CONFLICT with fresh currentRecord
      expect(conflictRes.body.error).toBeDefined();
      expect(conflictRes.body.error.code).toBe("STALE_ACTION_CONFLICT");
      expect(conflictRes.body.error.details.actionId).toBe(raceAction.id);
      expect(conflictRes.body.error.details.providedUpdatedAt).toBe(initialToken);
      expect(conflictRes.body.error.details.currentUpdatedAt).toBe(successRes.body.data.updatedAt);
      expect(conflictRes.body.error.details.currentRecord).toBeDefined();
      expect(conflictRes.body.error.details.currentRecord.description).toBe(
        successRes.body.data.description
      );

      // Verify in DB that only the winner's data persisted
      const finalDbRecord = await prisma.actionTaken.findUnique({
        where: { id: raceAction.id },
      });
      expect(finalDbRecord!.description).toBe(successRes.body.data.description);
      expect(finalDbRecord!.result).toBe(successRes.body.data.result);
    });

    it("guarantees concurrency token advances strictly on every update, preventing replay of identical expectedUpdatedAt token", async () => {
      // 1. Create dedicated action record
      const tokenAction = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Action for strict token advancement verification.",
          result: "Initial status.",
          timeSpentMinutes: 20,
        },
      });

      const initialToken = tokenAction.updatedAt.toISOString();

      // 2. Perform first update
      const res1 = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${tokenAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: initialToken,
          description: "First successful update advancing token.",
        });

      expect(res1.status).toBe(200);
      const updatedToken = res1.body.data.updatedAt;

      // Token is guaranteed to strictly change/advance (> initialToken in ms)
      expect(new Date(updatedToken).getTime()).toBeGreaterThan(
        new Date(initialToken).getTime()
      );

      // 3. Immediately replay the exact same initialToken
      const resReplay = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${tokenAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: initialToken,
          description: "Replayed update attempt with stale/consumed token.",
        });

      expect(resReplay.status).toBe(409);
      expect(resReplay.body.error.code).toBe("STALE_ACTION_CONFLICT");
      expect(resReplay.body.error.details.providedUpdatedAt).toBe(initialToken);
      expect(resReplay.body.error.details.currentUpdatedAt).toBe(updatedToken);

      // 4. Update using the fresh updatedToken succeeds
      const res2 = await request(app)
        .put(`/api/tickets/${activeTicketOwner.id}/actions/${tokenAction.id}`)
        .set("Cookie", cookieStaff)
        .send({
          expectedUpdatedAt: updatedToken,
          description: "Second successful update using new token.",
        });

      expect(res2.status).toBe(200);
      expect(new Date(res2.body.data.updatedAt).getTime()).toBeGreaterThan(
        new Date(updatedToken).getTime()
      );
    });

    it("deterministically guarantees token advancement and replay rejection when system clock equals expectedUpdatedAt", async () => {
      // 1. Create a dedicated action record
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: activeTicketOwner.id,
          performedById: staffUser.id,
          description: "Action for same-clock timestamp collision test.",
          result: "Baseline result.",
          timeSpentMinutes: 20,
        },
      });

      const originalToken = action.updatedAt.toISOString();
      const originalTimeMs = action.updatedAt.getTime();

      // Mock system clock to be EXACTLY equal to the existing action's expectedUpdatedAt timestamp
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(originalTimeMs));

      try {
        // 2. Submit valid PUT update using the original expectedUpdatedAt while Date.now() === originalTimeMs
        const res1 = await request(app)
          .put(`/api/tickets/${activeTicketOwner.id}/actions/${action.id}`)
          .set("Cookie", cookieStaff)
          .send({
            expectedUpdatedAt: originalToken,
            description: "Updated while system clock matches expectedUpdatedAt exactly.",
          });

        expect(res1.status).toBe(200);
        expect(res1.body.data).toBeDefined();

        const returnedUpdatedAt = res1.body.data.updatedAt;
        const returnedTimeMs = new Date(returnedUpdatedAt).getTime();

        // 3. Assert returned updatedAt is strictly later than the original timestamp
        expect(returnedTimeMs).toBeGreaterThan(originalTimeMs);
        expect(returnedTimeMs).toBe(originalTimeMs + 1);

        // 4. Replay the same PUT request using the original expectedUpdatedAt
        const resReplay = await request(app)
          .put(`/api/tickets/${activeTicketOwner.id}/actions/${action.id}`)
          .set("Cookie", cookieStaff)
          .send({
            expectedUpdatedAt: originalToken,
            description: "Replayed update attempt with stale original expectedUpdatedAt.",
          });

        // 5. Assert replay fails with 409 and error code STALE_ACTION_CONFLICT
        expect(resReplay.status).toBe(409);
        expect(resReplay.body.error).toBeDefined();
        expect(resReplay.body.error.code).toBe("STALE_ACTION_CONFLICT");
        expect(resReplay.body.error.details.providedUpdatedAt).toBe(originalToken);
        expect(resReplay.body.error.details.currentUpdatedAt).toBe(returnedUpdatedAt);
      } finally {
        // Always restore real timers so other tests are not affected
        vi.useRealTimers();
      }
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
