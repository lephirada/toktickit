import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 22 — Operational Dashboard API Suite (dashboard.api.test.ts)", () => {
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
  let emptyCategory: any;

  const createdTicketIds: number[] = [];
  const createdActionIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    const dummyHash = await hashPassword("DashPass123!");
    const now = Date.now();

    testCategoryA = await prisma.category.create({
      data: { name: `Dash Cat A ${now}` },
    });
    createdCategoryIds.push(testCategoryA.id);

    testCategoryB = await prisma.category.create({
      data: { name: `Dash Cat B ${now}` },
    });
    createdCategoryIds.push(testCategoryB.id);

    emptyCategory = await prisma.category.create({
      data: { name: `Dash Cat Empty ${now}` },
    });
    createdCategoryIds.push(emptyCategory.id);

    staffUser = await prisma.user.create({
      data: {
        email: `dash_staff_${now}@toktickit.com`,
        fullName: "IT Staff Dash",
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
        email: `dash_admin_${now}@toktickit.com`,
        fullName: "Admin Dash",
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
        email: `dash_req_${now}@toktickit.com`,
        fullName: "Requester Dash",
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
        email: `dash_inactive_${now}@toktickit.com`,
        fullName: "Inactive Staff Dash",
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
        email: `dash_mcp_${now}@toktickit.com`,
        fullName: "Password Change Staff Dash",
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
    if (createdActionIds.length > 0) {
      await prisma.actionTaken.deleteMany({
        where: { id: { in: createdActionIds } },
      });
    }
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

  async function createTicket(options: {
    status?: TicketStatus;
    ownerId?: number | null;
    requesterId?: number;
    categoryId?: number;
    requestedPriority?: Priority;
    itPriority?: Priority | null;
    updatedAt?: Date;
  }) {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `DASH-${unique}`,
        summary: `Dashboard test ticket ${unique}`,
        description: "Valid ticket description for dashboard metrics suite.",
        status: options.status ?? TicketStatus.NEW,
        requestedPriority: options.requestedPriority ?? Priority.P2_MEDIUM,
        itPriority: options.itPriority !== undefined ? options.itPriority : null,
        requesterId: options.requesterId ?? requesterUser.id,
        ownerId: options.ownerId !== undefined ? options.ownerId : null,
        categoryId: options.categoryId ?? testCategoryA.id,
        ...(options.updatedAt ? { updatedAt: options.updatedAt } : {}),
      },
    });
    createdTicketIds.push(ticket.id);

    // If explicit updatedAt was requested, enforce it via direct update
    if (options.updatedAt) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: options.updatedAt },
      });
    }

    return ticket;
  }

  async function createAction(ticketId: number, timeSpentMinutes: number, performedAt?: Date) {
    const action = await prisma.actionTaken.create({
      data: {
        ticketId,
        performedById: staffUser.id,
        description: `Action on ticket ${ticketId}`,
        result: "Investigation completed",
        actionType: "INVESTIGATION",
        timeSpentMinutes,
        performedAt: performedAt ?? new Date(),
        actionDateTime: performedAt ?? new Date(),
      },
    });
    createdActionIds.push(action.id);
    return action;
  }

  // ---------------------------------------------------------------------------
  // AC-22-06: Authorization and Authentication
  // ---------------------------------------------------------------------------
  describe("AC-22-06: Authorization and Authentication", () => {
    it("returns 401 UNAUTHORIZED when no session cookie is provided", async () => {
      const res = await request(app).get("/api/staff/dashboard");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when session cookie is invalid or tampered", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", "session=invalid.tampered.token");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when user is inactive (isActive: false)", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieInactiveStaff);
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("returns 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieMustChangePasswordStaff);
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("returns 403 FORBIDDEN when user has role REQUESTER", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieRequester);
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(["FORBIDDEN", "FORBIDDEN_ROLE"]).toContain(res.body.error.code);
    });

    it("allows IT_STAFF to access dashboard with 200 OK and expected structure", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.categoryBreakdown).toBeInstanceOf(Array);
      expect(res.body.data.priorityBreakdown).toBeDefined();
      expect(res.body.data.meta).toBeDefined();
    });

    it("allows ADMINISTRATOR to access dashboard with 200 OK", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieAdmin);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-22-01: Core Queue State Aggregation
  // ---------------------------------------------------------------------------
  describe("AC-22-01: Core Queue State Aggregation", () => {
    it("accurately reflects additions to totalOpen (NEW and OPEN)", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeTotalOpen = beforeRes.body.data.metrics.totalOpen;

      await createTicket({ status: TicketStatus.NEW });
      await createTicket({ status: TicketStatus.OPEN });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.body.data.metrics.totalOpen).toBe(beforeTotalOpen + 2);
    });

    it("accurately tracks inProgress ticket count", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeInProgress = beforeRes.body.data.metrics.inProgress;

      await createTicket({ status: TicketStatus.IN_PROGRESS, ownerId: staffUser.id });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.body.data.metrics.inProgress).toBe(beforeInProgress + 1);
    });

    it("accurately tracks waitingForRequester ticket count", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeWaiting = beforeRes.body.data.metrics.waitingForRequester;

      await createTicket({ status: TicketStatus.WAITING_FOR_REQUESTER, ownerId: staffUser.id });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.body.data.metrics.waitingForRequester).toBe(beforeWaiting + 1);
    });

    it("accurately tracks unassignedCount for workable tickets and excludes assigned or terminal tickets", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeUnassigned = beforeRes.body.data.metrics.unassignedCount;

      // 1 unassigned NEW ticket -> should increment
      await createTicket({ status: TicketStatus.NEW, ownerId: null });
      // 1 unassigned IN_PROGRESS ticket -> should increment
      await createTicket({ status: TicketStatus.IN_PROGRESS, ownerId: null });
      // 1 assigned IN_PROGRESS ticket -> should NOT increment unassigned
      await createTicket({ status: TicketStatus.IN_PROGRESS, ownerId: staffUser.id });
      // 1 unassigned RESOLVED ticket -> should NOT increment unassigned
      await createTicket({ status: TicketStatus.RESOLVED, ownerId: null });
      // 1 unassigned CLOSED ticket -> should NOT increment unassigned
      await createTicket({ status: TicketStatus.CLOSED, ownerId: null });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.body.data.metrics.unassignedCount).toBe(beforeUnassigned + 2);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-22-02 & FR-08: Rolling 7-Day Resolution Window
  // ---------------------------------------------------------------------------
  describe("AC-22-02 & FR-08: Rolling 7-Day Resolution Window", () => {
    it("includes tickets resolved within rolling 7 days (t <= 7d) and excludes stale resolutions (t > 7d)", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeRecentlyResolved = beforeRes.body.data.metrics.recentlyResolved;

      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      // Within 7 days -> included
      await createTicket({ status: TicketStatus.RESOLVED, updatedAt: threeDaysAgo });
      await createTicket({ status: TicketStatus.RESOLVED, updatedAt: sixDaysAgo });

      // Beyond 7 days -> strictly excluded
      await createTicket({ status: TicketStatus.RESOLVED, updatedAt: eightDaysAgo });
      await createTicket({ status: TicketStatus.RESOLVED, updatedAt: thirtyDaysAgo });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.body.data.metrics.recentlyResolved).toBe(beforeRecentlyResolved + 2);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-22-03: Total Time Spent Minutes Aggregation Rules
  // ---------------------------------------------------------------------------
  describe("AC-22-03: Total Time Spent Minutes Aggregation Rules", () => {
    it("aggregates actions on active workable tickets and recently resolved tickets, excluding closed/cancelled/stale", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforeTime = beforeRes.body.data.metrics.totalTimeSpentMinutes;

      const now = Date.now();
      const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);
      const nineDaysAgo = new Date(now - 9 * 24 * 60 * 60 * 1000);

      // Active workable states -> INCLUDED
      const openTicket = await createTicket({ status: TicketStatus.OPEN });
      await createAction(openTicket.id, 45); // +45

      const inProgressTicket = await createTicket({ status: TicketStatus.IN_PROGRESS });
      await createAction(inProgressTicket.id, 60); // +60

      const waitingTicket = await createTicket({ status: TicketStatus.WAITING_FOR_REQUESTER });
      await createAction(waitingTicket.id, 30); // +30

      const reopenedTicket = await createTicket({ status: TicketStatus.REOPENED });
      await createAction(reopenedTicket.id, 25); // +25

      // Recently resolved (<= 7 days) -> INCLUDED
      const recentResolvedTicket = await createTicket({
        status: TicketStatus.RESOLVED,
        updatedAt: twoDaysAgo,
      });
      await createAction(recentResolvedTicket.id, 50); // +50

      // Stale resolved (> 7 days) -> EXCLUDED
      const staleResolvedTicket = await createTicket({
        status: TicketStatus.RESOLVED,
        updatedAt: nineDaysAgo,
      });
      await createAction(staleResolvedTicket.id, 120); // 0 (excluded)

      // Closed ticket -> EXCLUDED
      const closedTicket = await createTicket({ status: TicketStatus.CLOSED });
      await createAction(closedTicket.id, 80); // 0 (excluded)

      // Cancelled ticket -> EXCLUDED
      const cancelledTicket = await createTicket({ status: TicketStatus.CANCELLED });
      await createAction(cancelledTicket.id, 90); // 0 (excluded)

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);

      // Expected delta: 45 + 60 + 30 + 25 + 50 = 210
      expect(afterRes.body.data.metrics.totalTimeSpentMinutes).toBe(beforeTime + 210);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-22-04: Category Breakdown & Priority Breakdown
  // ---------------------------------------------------------------------------
  describe("AC-22-04: Category Breakdown & Priority Breakdown", () => {
    it("groups non-terminal tickets by category and includes all categories in Category table", async () => {
      // Create non-terminal tickets in Category A
      await createTicket({ status: TicketStatus.OPEN, categoryId: testCategoryA.id });
      await createTicket({ status: TicketStatus.IN_PROGRESS, categoryId: testCategoryA.id });

      // Create terminal ticket in Category A (should be excluded from ticketCount)
      await createTicket({ status: TicketStatus.CLOSED, categoryId: testCategoryA.id });
      await createTicket({ status: TicketStatus.CANCELLED, categoryId: testCategoryA.id });

      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      const breakdown = res.body.data.categoryBreakdown;
      expect(breakdown).toBeInstanceOf(Array);

      // Verify emptyCategory is present with 0 counts
      const emptyCatEntry = breakdown.find((c: any) => c.categoryId === emptyCategory.id);
      expect(emptyCatEntry).toBeDefined();
      expect(emptyCatEntry.categoryName).toBe(emptyCategory.name);
      expect(emptyCatEntry.ticketCount).toBe(0);
      expect(emptyCatEntry.totalTimeSpentMinutes).toBe(0);

      // Verify category ordering is id ASC
      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i].categoryId).toBeGreaterThan(breakdown[i - 1].categoryId);
      }
    });

    it("groups non-terminal tickets by effective priority using COALESCE(itPriority, requestedPriority)", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      const beforePriorities = beforeRes.body.data.priorityBreakdown;

      // 1. itPriority = P0_URGENT overrides requestedPriority = P3_LOW
      await createTicket({
        status: TicketStatus.OPEN,
        requestedPriority: Priority.P3_LOW,
        itPriority: Priority.P0_URGENT,
      });

      // 2. itPriority is null, falls back to requestedPriority = P1_HIGH
      await createTicket({
        status: TicketStatus.IN_PROGRESS,
        requestedPriority: Priority.P1_HIGH,
        itPriority: null,
      });

      // 3. Terminal tickets (CLOSED, CANCELLED) are excluded from priorityBreakdown
      await createTicket({
        status: TicketStatus.CLOSED,
        requestedPriority: Priority.P0_URGENT,
        itPriority: Priority.P0_URGENT,
      });
      await createTicket({
        status: TicketStatus.CANCELLED,
        requestedPriority: Priority.P0_URGENT,
        itPriority: Priority.P0_URGENT,
      });

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);

      const afterPriorities = afterRes.body.data.priorityBreakdown;
      expect(afterPriorities.P0_URGENT).toBe(beforePriorities.P0_URGENT + 1);
      expect(afterPriorities.P1_HIGH).toBe(beforePriorities.P1_HIGH + 1);
      expect(afterPriorities.P2_MEDIUM).toBe(beforePriorities.P2_MEDIUM);
      expect(afterPriorities.P3_LOW).toBe(beforePriorities.P3_LOW);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-22-05: Mathematical Invariant and Metadata Assertions
  // ---------------------------------------------------------------------------
  describe("AC-22-05: Mathematical Invariant and Metadata Assertions", () => {
    it("guarantees mathematical invariant: sum of categoryBreakdown[].totalTimeSpentMinutes === metrics.totalTimeSpentMinutes", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      const { metrics, categoryBreakdown } = res.body.data;

      const sumCategoryMinutes = categoryBreakdown.reduce(
        (acc: number, cat: any) => acc + cat.totalTimeSpentMinutes,
        0
      );

      expect(sumCategoryMinutes).toBe(metrics.totalTimeSpentMinutes);
    });

    it("returns correct metadata structure and rolling 7-day window boundary timestamps", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(200);
      const meta = res.body.data.meta;

      expect(meta).toBeDefined();
      expect(meta.recentlyResolvedWindowDays).toBe(7);

      const calcTime = new Date(meta.calculationTimestamp).getTime();
      const windowStartTime = new Date(meta.recentlyResolvedWindowStart).getTime();

      expect(Number.isNaN(calcTime)).toBe(false);
      expect(Number.isNaN(windowStartTime)).toBe(false);

      // Verify window start is exactly 7 days (7 * 24 * 3600 * 1000 ms) before calculation timestamp
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(calcTime - windowStartTime).toBe(sevenDaysMs);
    });
  });
});
