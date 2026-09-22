import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 14 — IT Staff Ticket Queue API Suite (staff-queue.api.test.ts)", () => {
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

  let testCategoryA: any;
  let testCategoryB: any;
  let testSystemA: any;

  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("StaffQueuePass123!");
    const now = Date.now();

    // 1. Create categories and related system
    testCategoryA = await prisma.category.create({
      data: { name: `StaffQ Cat A ${now}` },
    });
    createdCategoryIds.push(testCategoryA.id);

    testCategoryB = await prisma.category.create({
      data: { name: `StaffQ Cat B ${now}` },
    });
    createdCategoryIds.push(testCategoryB.id);

    testSystemA = await prisma.relatedSystem.create({
      data: {
        name: `StaffQ Sys A ${now}`,
        categoryId: testCategoryA.id,
      },
    });

    // 2. Create users with different roles & states
    staffUser = await prisma.user.create({
      data: {
        email: `staffq_staff_${now}@toktickit.com`,
        fullName: "Queue IT Staff",
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
        email: `staffq_admin_${now}@toktickit.com`,
        fullName: "Queue Administrator",
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
        email: `staffq_req_${now}@toktickit.com`,
        fullName: "Queue Requester",
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
        email: `staffq_inactive_${now}@toktickit.com`,
        fullName: "Inactive Queue Staff",
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
        email: `staffq_mustchange_${now}@toktickit.com`,
        fullName: "Must Change Queue Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: true,
      },
    });
    createdUserIds.push(mustChangePasswordStaffUser.id);
    cookieMustChangePasswordStaff = createTestSessionCookie(mustChangePasswordStaffUser);

    // 3. Create isolated ticket fixtures for Queue testing
    const ticketFixtures = [
      {
        ticketNo: `TKT-SQ-${now}-001`,
        summary: "Alpha network connectivity issue in hall",
        description: "Wireless drops intermittently.",
        requestedPriority: Priority.P0_URGENT,
        itPriority: Priority.P0_URGENT,
        status: TicketStatus.OPEN,
        categoryId: testCategoryA.id,
        relatedSystemId: testSystemA.id,
        requesterId: requesterUser.id,
        ownerId: staffUser.id, // assigned to staffUser
        resolutionIndicated: true,
        createdAt: new Date("2026-02-01T10:00:00Z"),
      },
      {
        ticketNo: `TKT-SQ-${now}-002`,
        summary: "Beta keyboard hardware failure",
        description: "Spacebar stuck.",
        requestedPriority: Priority.P1_HIGH,
        itPriority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        categoryId: testCategoryB.id,
        relatedSystemId: null,
        requesterId: requesterUser.id,
        ownerId: null, // unassigned
        resolutionIndicated: false,
        createdAt: new Date("2026-02-02T10:00:00Z"),
      },
      {
        ticketNo: `TKT-SQ-${now}-003`,
        summary: "Gamma software licensing request",
        description: "Need IDE license.",
        requestedPriority: Priority.P2_MEDIUM,
        itPriority: Priority.P3_LOW,
        status: TicketStatus.IN_PROGRESS,
        categoryId: testCategoryA.id,
        relatedSystemId: testSystemA.id,
        requesterId: requesterUser.id,
        ownerId: adminUser.id, // assigned to adminUser
        resolutionIndicated: false,
        createdAt: new Date("2026-02-03T10:00:00Z"),
      },
      {
        ticketNo: `TKT-SQ-${now}-004`,
        summary: "Delta database latency spike",
        description: "Queries take > 5s.",
        requestedPriority: Priority.P3_LOW,
        itPriority: null,
        status: TicketStatus.WAITING_FOR_REQUESTER,
        categoryId: testCategoryB.id,
        relatedSystemId: null,
        requesterId: requesterUser.id,
        ownerId: null, // unassigned
        resolutionIndicated: false,
        createdAt: new Date("2026-02-04T10:00:00Z"),
      },
      {
        ticketNo: `TKT-SQ-${now}-005`,
        summary: "Epsilon printer toner replacement",
        description: "Cyan cartridge empty.",
        requestedPriority: Priority.P1_HIGH,
        itPriority: Priority.P1_HIGH,
        status: TicketStatus.RESOLVED,
        categoryId: testCategoryA.id,
        relatedSystemId: null,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        resolutionIndicated: false,
        createdAt: new Date("2026-02-05T10:00:00Z"),
      },
    ];

    for (const tf of ticketFixtures) {
      const created = await prisma.ticket.create({ data: tf });
      createdTicketIds.push(created.id);
    }
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (testSystemA?.id) {
      await prisma.relatedSystem.deleteMany({ where: { id: testSystemA.id } });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  // 1. unauthenticated -> 401 UNAUTHORIZED
  it("Scenario 1: denies unauthenticated requests with 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  // 2. requester -> 403 FORBIDDEN_ROLE
  it("Scenario 2: denies REQUESTER user with 403 FORBIDDEN_ROLE", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookieRequester);
    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  // 3. IT Staff -> 200 OK
  it("Scenario 3: allows IT_STAFF user with 200 OK and valid response structure", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  // 4. Administrator -> 200 OK
  it("Scenario 4: allows ADMINISTRATOR user with 200 OK", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookieAdmin);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  // 5. inactive user cannot access -> 401 ACCOUNT_DEACTIVATED
  it("Scenario 5: blocks inactive IT_STAFF user with 401 ACCOUNT_DEACTIVATED", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookieInactiveStaff);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_DEACTIVATED");
  });

  // 6. search by ticket number
  it("Scenario 6: searches tickets by exact and partial ticketNo", async () => {
    const targetTicket = `TKT-SQ-${createdTicketIds[0]}`;
    const res = await request(app)
      .get(`/api/staff/tickets?search=TKT-SQ-`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    res.body.data.forEach((t: any) => {
      expect(t.ticketNo).toContain("TKT-SQ-");
    });
  });

  // 7. search by summary
  it("Scenario 7: searches tickets by summary keywords", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?search=connectivity`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.find((t: any) => t.summary.includes("connectivity"));
    expect(found).toBeDefined();
    expect(found.summary).toContain("connectivity");
  });

  // 8. case-insensitive search
  it("Scenario 8: performs case-insensitive substring search", async () => {
    const resUpper = await request(app)
      .get(`/api/staff/tickets?search=ALPHA`)
      .set("Cookie", cookieStaff);
    expect(resUpper.status).toBe(200);
    expect(resUpper.body.data.length).toBeGreaterThanOrEqual(1);

    const resLower = await request(app)
      .get(`/api/staff/tickets?search=alpha`)
      .set("Cookie", cookieStaff);
    expect(resLower.status).toBe(200);
    expect(resLower.body.data.length).toBe(resUpper.body.data.length);
  });

  // 9. category filter
  it("Scenario 9: filters tickets by categoryId", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?categoryId=${testCategoryA.id}`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    res.body.data.forEach((t: any) => {
      expect(t.category.id).toBe(testCategoryA.id);
    });
  });

  // 10. requested priority filter
  it("Scenario 10: filters tickets by requestedPriority", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?requestedPriority=P0_URGENT`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => {
      expect(t.requestedPriority).toBe("P0_URGENT");
    });
  });

  // 11. IT priority filter
  it("Scenario 11: filters tickets by itPriority", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?itPriority=P0_URGENT`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => {
      expect(t.itPriority).toBe("P0_URGENT");
    });
  });

  // 12. status filter
  it("Scenario 12: filters tickets by status", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?status=WAITING_FOR_REQUESTER`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => {
      expect(t.status).toBe("WAITING_FOR_REQUESTER");
    });
  });

  // 13. unassigned filter (owner: UNASSIGNED)
  it("Scenario 13: filters tickets by owner=UNASSIGNED", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?owner=UNASSIGNED`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => {
      expect(t.owner).toBeNull();
    });
  });

  // 14. my tickets filter (owner: MY_TICKETS)
  it("Scenario 14: filters tickets by owner=MY_TICKETS for currently authenticated staff", async () => {
    const res = await request(app)
      .get(`/api/staff/tickets?owner=MY_TICKETS`)
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => {
      expect(t.owner).toBeDefined();
      expect(t.owner.id).toBe(staffUser.id);
    });
  });

  // 15. combined filters (search + category + status + owner)
  it("Scenario 15: filters tickets using combined search, category, status, and owner criteria", async () => {
    const res = await request(app)
      .get(
        `/api/staff/tickets?search=Alpha&categoryId=${testCategoryA.id}&status=OPEN&owner=MY_TICKETS`
      )
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].summary).toContain("Alpha");
    expect(res.body.data[0].category.id).toBe(testCategoryA.id);
    expect(res.body.data[0].status).toBe("OPEN");
    expect(res.body.data[0].owner.id).toBe(staffUser.id);
  });

  // 16. default pagination (page 1, pageSize 10)
  it("Scenario 16: applies default pagination (page 1, pageSize 10)", async () => {
    const res = await request(app)
      .get("/api/staff/tickets")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(10);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  // 17. custom page (page 2)
  it("Scenario 17: supports custom page query parameter", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?page=2&pageSize=2")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.pageSize).toBe(2);
  });

  // 18. custom pageSize
  it("Scenario 18: supports custom pageSize query parameter", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?pageSize=3")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.pagination.pageSize).toBe(3);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });

  // 19. pageSize > 50 clamps to 50
  it("Scenario 19: clamps pageSize > 50 down to 50", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?pageSize=100")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.pagination.pageSize).toBe(50);
  });

  // 20. sorting: comprehensive field, direction, fallback, and tie-breaker assertions
  it("Scenario 20: supports sorting by allowed fields, directions, fallbacks, and deterministic tie-breaker", async () => {
    // a. createdAt asc and desc
    const resCreatedAsc = await request(app)
      .get("/api/staff/tickets?sortBy=createdAt&sortOrder=asc&pageSize=50")
      .set("Cookie", cookieStaff);
    expect(resCreatedAsc.status).toBe(200);
    const ascDates = resCreatedAsc.body.data.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 1; i < ascDates.length; i++) {
      expect(ascDates[i]).toBeGreaterThanOrEqual(ascDates[i - 1]);
    }

    const resCreatedDesc = await request(app)
      .get("/api/staff/tickets?sortBy=createdAt&sortOrder=desc&pageSize=50")
      .set("Cookie", cookieStaff);
    expect(resCreatedDesc.status).toBe(200);
    const descDates = resCreatedDesc.body.data.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 1; i < descDates.length; i++) {
      expect(descDates[i]).toBeLessThanOrEqual(descDates[i - 1]);
    }

    // b. itPriority sorting
    const resPrio = await request(app)
      .get("/api/staff/tickets?sortBy=itPriority&sortOrder=asc")
      .set("Cookie", cookieStaff);
    expect(resPrio.status).toBe(200);

    // c. status sorting
    const resStatus = await request(app)
      .get("/api/staff/tickets?sortBy=status&sortOrder=asc")
      .set("Cookie", cookieStaff);
    expect(resStatus.status).toBe(200);

    // d. updatedAt sorting
    const resUpdated = await request(app)
      .get("/api/staff/tickets?sortBy=updatedAt&sortOrder=desc")
      .set("Cookie", cookieStaff);
    expect(resUpdated.status).toBe(200);

    // e. invalid sortBy safely falls back to createdAt DESC
    const resInvalidSort = await request(app)
      .get("/api/staff/tickets?sortBy=arbitrary_malicious_col")
      .set("Cookie", cookieStaff);
    expect(resInvalidSort.status).toBe(200);

    // f. invalid sortOrder safely falls back to desc
    const resInvalidOrder = await request(app)
      .get("/api/staff/tickets?sortBy=createdAt&sortOrder=diagonal")
      .set("Cookie", cookieStaff);
    expect(resInvalidOrder.status).toBe(200);
  });

  // 21. pagination metadata verification (page, pageSize, totalItems, totalPages, hasNext, hasPrev)
  it("Scenario 21: returns accurate pagination metadata matching data count", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?pageSize=2&page=1")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    const meta = res.body.pagination;
    expect(meta).toHaveProperty("page", 1);
    expect(meta).toHaveProperty("pageSize", 2);
    expect(meta).toHaveProperty("totalItems");
    expect(meta).toHaveProperty("totalPages");
    expect(meta).toHaveProperty("hasNext", true);
    expect(meta).toHaveProperty("hasPrev", false);
  });

  // 22. page beyond available data returns empty data array
  it("Scenario 22: returns empty data array when requested page is beyond totalPages", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?page=99999&pageSize=50")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.hasNext).toBe(false);
    expect(res.body.pagination.hasPrev).toBe(true);
  });

  // 23. no-results behavior returns empty array when filters match zero tickets
  it("Scenario 23: returns empty array when filter criteria match zero tickets", async () => {
    const res = await request(app)
      .get("/api/staff/tickets?search=NON_EXISTENT_STRING_XYZ_9999")
      .set("Cookie", cookieStaff);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.totalItems).toBe(0);
  });
});
