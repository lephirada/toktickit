import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword } from "../../src/utils/password.js";
import { COOKIE_NAME } from "../../src/utils/jwt.js";
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
      // 1. Malformed token under official toktickit_session cookie name
      const resInvalid = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", `${COOKIE_NAME}=invalid.tampered.token`);
      expect(resInvalid.status).toBe(401);
      expect(resInvalid.body.error).toBeDefined();
      expect(resInvalid.body.error.code).toBe("UNAUTHORIZED");

      // 2. Tampered cryptographic signature on otherwise valid session
      const tamperedCookie = cookieStaff.slice(0, -6) + "xyz123";
      const resTampered = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", tamperedCookie);
      expect(resTampered.status).toBe(401);
      expect(resTampered.body.error).toBeDefined();
      expect(resTampered.body.error.code).toBe("UNAUTHORIZED");
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

    it("deterministically enforces exact boundary at recentlyResolvedWindowStart and excludes tickets just outside the 7-day window", async () => {
      // Pin system time deterministically to eliminate race conditions and clock drift
      const fixedNow = new Date("2026-10-14T12:00:00.000Z");
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(fixedNow);

      try {
        const windowDays = 7;
        const exactWindowStart = new Date(fixedNow.getTime() - windowDays * 24 * 60 * 60 * 1000); // 2026-10-07T12:00:00.000Z
        const justOutsideWindow = new Date(exactWindowStart.getTime() - 1000); // 2026-10-07T11:59:59.000Z (1 second outside)

        const beforeRes = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);
        expect(beforeRes.status).toBe(200);
        const beforeRecentlyResolved = beforeRes.body.data.metrics.recentlyResolved;
        const beforeTime = beforeRes.body.data.metrics.totalTimeSpentMinutes;

        // Ticket A: Resolved exactly at windowStart -> INCLUDED in recentlyResolved
        const ticketA = await createTicket({
          status: TicketStatus.RESOLVED,
          updatedAt: exactWindowStart,
        });
        await createAction(ticketA.id, 40, exactWindowStart); // +40 minutes

        // Ticket B: Resolved 1s before windowStart -> EXCLUDED from recentlyResolved
        const ticketB = await createTicket({
          status: TicketStatus.RESOLVED,
          updatedAt: justOutsideWindow,
        });
        await createAction(ticketB.id, 60, justOutsideWindow); // 0 minutes (excluded)

        const afterRes = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);

        expect(afterRes.status).toBe(200);
        // Only ticketA is added to recentlyResolved
        expect(afterRes.body.data.metrics.recentlyResolved).toBe(beforeRecentlyResolved + 1);
        // Only action on ticketA is added to totalTimeSpentMinutes
        expect(afterRes.body.data.metrics.totalTimeSpentMinutes).toBe(beforeTime + 40);

        // Deterministic metadata timestamps
        expect(afterRes.body.data.meta.calculationTimestamp).toBe("2026-10-14T12:00:00.000Z");
        expect(afterRes.body.data.meta.recentlyResolvedWindowDays).toBe(7);
        expect(afterRes.body.data.meta.recentlyResolvedWindowStart).toBe("2026-10-07T12:00:00.000Z");
      } finally {
        vi.useRealTimers();
      }
    });

    it("handles tickets with future timestamps according to the rolling window lower-bound contract without calculation crash", async () => {
      const fixedNow = new Date("2026-10-14T12:00:00.000Z");
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(fixedNow);

      try {
        const futureDate = new Date("2026-10-15T12:00:00.000Z"); // 1 day in the future

        const beforeRes = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);
        expect(beforeRes.status).toBe(200);
        const beforeRecentlyResolved = beforeRes.body.data.metrics.recentlyResolved;
        const beforeTime = beforeRes.body.data.metrics.totalTimeSpentMinutes;

        // Future resolved ticket (updatedAt >= windowStart) satisfies contract lower-bound
        const futureTicket = await createTicket({
          status: TicketStatus.RESOLVED,
          updatedAt: futureDate,
          categoryId: testCategoryA.id,
        });
        await createAction(futureTicket.id, 35, futureDate);

        const afterRes = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);
        expect(afterRes.status).toBe(200);

        // Satisfies updatedAt >= recentlyResolvedWindowStart
        expect(afterRes.body.data.metrics.recentlyResolved).toBe(beforeRecentlyResolved + 1);
        expect(afterRes.body.data.metrics.totalTimeSpentMinutes).toBe(beforeTime + 35);
        expect(afterRes.body.data.meta.calculationTimestamp).toBe("2026-10-14T12:00:00.000Z");
      } finally {
        vi.useRealTimers();
      }
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

    it("safely handles zero-duration actions and null/undefined values via fallback without crashing or producing NaN", async () => {
      // 1. Database-persisted zero duration action (timeSpentMinutes = 0)
      const activeTicket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        categoryId: testCategoryA.id,
      });
      await createAction(activeTicket.id, 0); // 0 minutes

      const resWithZero = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(resWithZero.status).toBe(200);
      expect(Number.isFinite(resWithZero.body.data.metrics.totalTimeSpentMinutes)).toBe(true);

      // 2. Simulated null/undefined timeSpentMinutes from legacy/raw datasets
      const originalFindMany = prisma.actionTaken.findMany;
      (prisma.actionTaken as any).findMany = async (args?: any) => {
        const actual = await originalFindMany.call(prisma.actionTaken, args);
        return [
          ...actual,
          {
            timeSpentMinutes: null as any,
            ticket: { categoryId: testCategoryA.id },
          },
          {
            timeSpentMinutes: undefined as any,
            ticket: { categoryId: testCategoryB.id },
          },
        ] as any;
      };

      try {
        const resWithNull = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);

        expect(resWithNull.status).toBe(200);
        const { metrics, categoryBreakdown } = resWithNull.body.data;

        expect(Number.isNaN(metrics.totalTimeSpentMinutes)).toBe(false);
        expect(Number.isFinite(metrics.totalTimeSpentMinutes)).toBe(true);

        const sumCategoryMinutes = categoryBreakdown.reduce(
          (acc: number, cat: any) => acc + cat.totalTimeSpentMinutes,
          0
        );
        expect(sumCategoryMinutes).toBe(metrics.totalTimeSpentMinutes);
      } finally {
        prisma.actionTaken.findMany = originalFindMany;
      }
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

    it("guarantees duration invariant with multiple actions per ticket across multiple categories without Cartesian duplication", async () => {
      const beforeRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(beforeRes.status).toBe(200);

      const beforeTotalTime = beforeRes.body.data.metrics.totalTimeSpentMinutes;
      const beforeBreakdown = beforeRes.body.data.categoryBreakdown;
      const beforeCatATime = beforeBreakdown.find((c: any) => c.categoryId === testCategoryA.id)?.totalTimeSpentMinutes ?? 0;
      const beforeCatBTime = beforeBreakdown.find((c: any) => c.categoryId === testCategoryB.id)?.totalTimeSpentMinutes ?? 0;

      // 1. Ticket in Category A with 3 distinct actions: 15, 25, 35 min (total 75 min)
      const ticketA = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        categoryId: testCategoryA.id,
      });
      await createAction(ticketA.id, 15);
      await createAction(ticketA.id, 25);
      await createAction(ticketA.id, 35);

      // 2. Ticket in Category B with 2 distinct actions: 20, 30 min (total 50 min)
      const ticketB = await createTicket({
        status: TicketStatus.OPEN,
        categoryId: testCategoryB.id,
      });
      await createAction(ticketB.id, 20);
      await createAction(ticketB.id, 30);

      // 3. Ticket in Category A with 2 actions but in CLOSED status (strictly excluded from duration)
      const ticketClosed = await createTicket({
        status: TicketStatus.CLOSED,
        categoryId: testCategoryA.id,
      });
      await createAction(ticketClosed.id, 45);
      await createAction(ticketClosed.id, 65);

      const afterRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(afterRes.status).toBe(200);

      const { metrics, categoryBreakdown } = afterRes.body.data;
      const afterCatATime = categoryBreakdown.find((c: any) => c.categoryId === testCategoryA.id)?.totalTimeSpentMinutes ?? 0;
      const afterCatBTime = categoryBreakdown.find((c: any) => c.categoryId === testCategoryB.id)?.totalTimeSpentMinutes ?? 0;

      // Check category increments: exactly +75 for Cat A, +50 for Cat B, zero for closed
      expect(afterCatATime).toBe(beforeCatATime + 75);
      expect(afterCatBTime).toBe(beforeCatBTime + 50);

      // Check global metric increment: exactly 75 + 50 = 125
      expect(metrics.totalTimeSpentMinutes).toBe(beforeTotalTime + 125);

      // Assert global invariant: sum of categoryBreakdown[].totalTimeSpentMinutes === metrics.totalTimeSpentMinutes
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

    it("handles empty-data state with zero-valued metrics, zero action duration, and all priority breakdown keys at zero", async () => {
      // Simulate empty data state across ticket and action queries while preserving user auth query
      const origCount = prisma.ticket.count;
      const origTicketFindMany = prisma.ticket.findMany;
      const origActionFindMany = prisma.actionTaken.findMany;
      const origCategoryFindMany = prisma.category.findMany;

      const countSpy = vi.spyOn(prisma.ticket, "count").mockResolvedValue(0);
      const ticketFindManySpy = vi.spyOn(prisma.ticket, "findMany").mockResolvedValue([]);
      const actionFindManySpy = vi.spyOn(prisma.actionTaken, "findMany").mockResolvedValue([]);
      const categoryFindManySpy = vi.spyOn(prisma.category, "findMany").mockResolvedValue([
        { id: testCategoryA.id, name: testCategoryA.name, createdAt: new Date() },
        { id: testCategoryB.id, name: testCategoryB.name, createdAt: new Date() },
      ]);

      try {
        const res = await request(app)
          .get("/api/staff/dashboard")
          .set("Cookie", cookieStaff);

        expect(res.status).toBe(200);
        const { metrics, categoryBreakdown, priorityBreakdown, meta } = res.body.data;

        // Zero-valued metrics
        expect(metrics.totalOpen).toBe(0);
        expect(metrics.inProgress).toBe(0);
        expect(metrics.waitingForRequester).toBe(0);
        expect(metrics.recentlyResolved).toBe(0);
        expect(metrics.unassignedCount).toBe(0);
        expect(metrics.totalTimeSpentMinutes).toBe(0);

        // All 4 priority keys strictly 0
        expect(priorityBreakdown).toEqual({
          P0_URGENT: 0,
          P1_HIGH: 0,
          P2_MEDIUM: 0,
          P3_LOW: 0,
        });

        // Configured categories present with 0 counts and 0 durations
        expect(categoryBreakdown).toHaveLength(2);
        for (const cat of categoryBreakdown) {
          expect(cat.ticketCount).toBe(0);
          expect(cat.totalTimeSpentMinutes).toBe(0);
        }

        // Mathematical invariant holds: 0 === 0
        const categorySum = categoryBreakdown.reduce((sum: number, c: any) => sum + c.totalTimeSpentMinutes, 0);
        expect(categorySum).toBe(metrics.totalTimeSpentMinutes);
        expect(categorySum).toBe(0);

        // Metadata still intact
        expect(meta.recentlyResolvedWindowDays).toBe(7);
        expect(meta.calculationTimestamp).toBeDefined();
        expect(meta.recentlyResolvedWindowStart).toBeDefined();
      } finally {
        countSpy.mockRestore();
        ticketFindManySpy.mockRestore();
        actionFindManySpy.mockRestore();
        categoryFindManySpy.mockRestore();
        (prisma.ticket as any).count = origCount;
        (prisma.ticket as any).findMany = origTicketFindMany;
        (prisma.actionTaken as any).findMany = origActionFindMany;
        (prisma.category as any).findMany = origCategoryFindMany;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Issue 24 Drill-Down Consistency: Dashboard Metrics vs Queue Filter Queries
  // ---------------------------------------------------------------------------
  describe("Issue 24 Drill-Down Consistency: Dashboard Metrics vs Queue Filter Queries", () => {
    it("ensures Total Open metric count precisely equals queue results for ?status=NEW,OPEN", async () => {
      // 1. Fetch current dashboard metrics
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(dashRes.status).toBe(200);
      const totalOpenMetric = dashRes.body.data.metrics.totalOpen;

      // 2. Fetch staff queue with status=NEW,OPEN
      const queueRes = await request(app)
        .get("/api/staff/tickets?status=NEW,OPEN&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(queueRes.status).toBe(200);
      expect(queueRes.body.pagination.totalItems).toBe(totalOpenMetric);

      // Verify every returned ticket in the queue has status NEW or OPEN
      for (const ticket of queueRes.body.data) {
        expect(["NEW", "OPEN"]).toContain(ticket.status);
      }
    });

    it("ensures Recently Resolved metric count precisely equals queue results for ?status=RESOLVED&resolvedWithinDays=7", async () => {
      // 1. Fetch current dashboard metrics
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(dashRes.status).toBe(200);
      const recentlyResolvedMetric = dashRes.body.data.metrics.recentlyResolved;

      // 2. Fetch staff queue with status=RESOLVED&resolvedWithinDays=7
      const queueRes = await request(app)
        .get("/api/staff/tickets?status=RESOLVED&resolvedWithinDays=7&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(queueRes.status).toBe(200);
      expect(queueRes.body.pagination.totalItems).toBe(recentlyResolvedMetric);

      // Verify all tickets returned are RESOLVED and within rolling 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
      for (const ticket of queueRes.body.data) {
        expect(ticket.status).toBe("RESOLVED");
        expect(new Date(ticket.updatedAt).getTime()).toBeGreaterThanOrEqual(sevenDaysAgo - 2000); // 2s tolerance
      }
    });

    it("ensures inProgress metric count precisely equals queue results for ?status=IN_PROGRESS", async () => {
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(dashRes.status).toBe(200);
      const inProgressMetric = dashRes.body.data.metrics.inProgress;

      const queueRes = await request(app)
        .get("/api/staff/tickets?status=IN_PROGRESS&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(queueRes.status).toBe(200);
      expect(queueRes.body.pagination.totalItems).toBe(inProgressMetric);

      for (const ticket of queueRes.body.data) {
        expect(ticket.status).toBe("IN_PROGRESS");
      }
    });

    it("ensures waitingForRequester metric count precisely equals queue results for ?status=WAITING_FOR_REQUESTER", async () => {
      const dashRes = await request(app)
        .get("/api/staff/dashboard")
        .set("Cookie", cookieStaff);
      expect(dashRes.status).toBe(200);
      const waitingMetric = dashRes.body.data.metrics.waitingForRequester;

      const queueRes = await request(app)
        .get("/api/staff/tickets?status=WAITING_FOR_REQUESTER&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(queueRes.status).toBe(200);
      expect(queueRes.body.pagination.totalItems).toBe(waitingMetric);

      for (const ticket of queueRes.body.data) {
        expect(ticket.status).toBe("WAITING_FOR_REQUESTER");
      }
    });

    it("ensures unassigned queue query (?owner=UNASSIGNED) strictly returns tickets without an owner", async () => {
      const queueRes = await request(app)
        .get("/api/staff/tickets?owner=UNASSIGNED&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(queueRes.status).toBe(200);

      // Verify all tickets returned have owner === null
      expect(queueRes.body.data.length).toBeGreaterThan(0);
      for (const ticket of queueRes.body.data) {
        expect(ticket.owner).toBeNull();
      }
    });

    it("ensures owner=MY_TICKETS strictly returns tickets assigned to caller and excludes other staff tickets", async () => {
      // Create ticket assigned to caller (staffUser)
      const myTicket = await createTicket({ status: TicketStatus.IN_PROGRESS, ownerId: staffUser.id });
      // Create ticket assigned to another staff member (adminUser)
      const otherTicket = await createTicket({ status: TicketStatus.IN_PROGRESS, ownerId: adminUser.id });

      const myTicketsRes = await request(app)
        .get("/api/staff/tickets?owner=MY_TICKETS&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(myTicketsRes.status).toBe(200);

      const returnedIds = myTicketsRes.body.data.map((t: any) => t.id);
      expect(returnedIds).toContain(myTicket.id);
      expect(returnedIds).not.toContain(otherTicket.id);

      for (const ticket of myTicketsRes.body.data) {
        expect(ticket.owner?.id).toBe(staffUser.id);
      }
    });

    it("ensures priority=P0_URGENT correctly resolves effective priority (includes staff upgrade P0, excludes staff downgrade P3)", async () => {
      // 1. Staff upgrade: requested P2_MEDIUM, itPriority P0_URGENT -> Effective P0
      const upgradedTicket = await createTicket({
        status: TicketStatus.IN_PROGRESS,
        requestedPriority: Priority.P2_MEDIUM,
        itPriority: Priority.P0_URGENT,
      });

      // 2. Staff downgrade: requested P0_URGENT, itPriority P3_LOW -> Effective P3
      const downgradedTicket = await createTicket({
        status: TicketStatus.OPEN,
        requestedPriority: Priority.P0_URGENT,
        itPriority: Priority.P3_LOW,
      });

      // 3. Untriaged urgent: requested P0_URGENT, itPriority null -> Effective P0
      const untriagedUrgentTicket = await createTicket({
        status: TicketStatus.NEW,
        requestedPriority: Priority.P0_URGENT,
        itPriority: null,
      });

      const res = await request(app)
        .get("/api/staff/tickets?priority=P0_URGENT&pageSize=100")
        .set("Cookie", cookieStaff);
      expect(res.status).toBe(200);

      const returnedIds = res.body.data.map((t: any) => t.id);

      // Must include upgraded ticket (Effective P0) and untriaged urgent ticket (Effective P0)
      expect(returnedIds).toContain(upgradedTicket.id);
      expect(returnedIds).toContain(untriagedUrgentTicket.id);

      // Must EXCLUDE downgraded ticket (Effective P3, even though requested was P0)
      expect(returnedIds).not.toContain(downgradedTicket.id);

      // Verify all returned tickets actually have effective priority P0_URGENT
      for (const ticket of res.body.data) {
        const effective = ticket.itPriority || ticket.requestedPriority;
        expect(effective).toBe("P0_URGENT");
      }
    });
  });
});

