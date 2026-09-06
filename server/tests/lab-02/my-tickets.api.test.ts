import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { Priority, TicketStatus, Prisma } from "@prisma/client";

describe("Issue 8 — My Tickets Query API (server/tests/lab-02/my-tickets.test.ts)", () => {
  const prisma = getPrisma();

  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;

  let hardwareCatId: number;
  let networkCatId: number;
  let softwareCatId: number;

  let laptopSystemId: number;
  let vpnSystemId: number;

  const testTicketIds: number[] = [];

  beforeAll(async () => {
    // 1. Retrieve seeded requesters
    const sarah = await prisma.requesterUser.findFirstOrThrow({
      where: { email: "sarah.connor@toktickit.com" },
    });
    const john = await prisma.requesterUser.findFirstOrThrow({
      where: { email: "john.doe@toktickit.com" },
    });
    const kyle = await prisma.requesterUser.findFirstOrThrow({
      where: { email: "kyle.reese@toktickit.com" },
    });

    requesterAId = sarah.id;
    requesterBId = john.id;
    inactiveRequesterId = kyle.id;

    // 2. Retrieve categories
    const hardware = await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } });
    const network = await prisma.category.findFirstOrThrow({ where: { name: "Network" } });
    const software = await prisma.category.findFirstOrThrow({ where: { name: "Software" } });

    hardwareCatId = hardware.id;
    networkCatId = network.id;
    softwareCatId = software.id;

    // 3. Retrieve systems
    const laptop = await prisma.relatedSystem.findFirstOrThrow({
      where: { name: "Corporate Laptop", categoryId: hardwareCatId },
    });
    const vpn = await prisma.relatedSystem.findFirstOrThrow({
      where: { name: "VPN", categoryId: networkCatId },
    });

    laptopSystemId = laptop.id;
    vpnSystemId = vpn.id;

    // 4. Clean up any existing transient tickets and attachments
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});

    // 5. Seed test tickets for Requester A (15 tickets with distinct attributes)
    const ticketsDataA: Prisma.TicketUncheckedCreateInput[] = [
      {
        ticketNo: "TEST-TKT-A-00001",
        summary: "MacBook Pro keyboard key sticking",
        description: "The spacebar and T key are intermittently unresponsive.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.NEW,
        categoryId: hardwareCatId,
        relatedSystemId: laptopSystemId,
        requesterId: requesterAId,
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      },
      {
        ticketNo: "TEST-TKT-A-00002",
        summary: "VPN Client timeout error on home network",
        description: "Cannot connect to VPN Gateway after updating macOS.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.IN_PROGRESS,
        categoryId: networkCatId,
        relatedSystemId: vpnSystemId,
        requesterId: requesterAId,
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
      },
      {
        ticketNo: "TEST-TKT-A-00003",
        summary: "Leb2 application portal session expired",
        description: "Session constantly logs out every 2 minutes.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.RESOLVED,
        categoryId: softwareCatId,
        relatedSystemId: null,
        requesterId: requesterAId,
        createdAt: new Date("2026-08-03T10:00:00.000Z"),
      },
      {
        ticketNo: "TEST-TKT-A-00004",
        summary: "Laptop battery drains rapidly",
        description: "Battery health reported as poor in diagnostic settings.",
        priority: Priority.P3_LOW,
        status: TicketStatus.CLOSED,
        categoryId: hardwareCatId,
        relatedSystemId: laptopSystemId,
        requesterId: requesterAId,
        createdAt: new Date("2026-08-04T10:00:00.000Z"),
      },
      {
        ticketNo: "TEST-TKT-A-00005",
        summary: "Campus Wi-Fi connectivity drops in Engineering lab",
        description: "Signal frequently drops when moving between desks.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        categoryId: networkCatId,
        relatedSystemId: null,
        requesterId: requesterAId,
        createdAt: new Date("2026-08-05T10:00:00.000Z"),
      },
    ];

    // Add 10 more tickets for Requester A to total 15 tickets (for pagination testing)
    for (let i = 6; i <= 15; i++) {
      const numPadded = String(i).padStart(5, "0");
      ticketsDataA.push({
        ticketNo: `TEST-TKT-A-${numPadded}`,
        summary: `Automated issue ticket sequence number ${i}`,
        description: `Detailed description for pagination test ticket ${i}.`,
        priority: i % 2 === 0 ? Priority.P1_HIGH : Priority.P2_MEDIUM,
        status: i > 12 ? TicketStatus.RESOLVED : TicketStatus.NEW,
        categoryId: hardwareCatId,
        relatedSystemId: laptopSystemId,
        requesterId: requesterAId,
        createdAt: new Date(`2026-08-${String(i).padStart(2, "0")}T10:00:00.000Z`),
      });
    }

    for (const t of ticketsDataA) {
      const created = await prisma.ticket.create({ data: t });
      testTicketIds.push(created.id);
    }

    // 6. Seed test tickets for Requester B (3 tickets)
    const ticketsDataB = [
      {
        ticketNo: "TEST-TKT-B-00001",
        summary: "Finance billing export tool crashes on launch",
        description: "Error 500 thrown when attempting to generate monthly ledger.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.NEW,
        categoryId: softwareCatId,
        relatedSystemId: null,
        requesterId: requesterBId,
        createdAt: new Date("2026-08-10T11:00:00.000Z"),
      },
      {
        ticketNo: "TEST-TKT-B-00002",
        summary: "Finance team VPN access request",
        description: "Need remote access privileges enabled for new payroll intern.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.RESOLVED,
        categoryId: networkCatId,
        relatedSystemId: vpnSystemId,
        requesterId: requesterBId,
        createdAt: new Date("2026-08-11T11:00:00.000Z"),
      },
    ];

    for (const t of ticketsDataB) {
      const created = await prisma.ticket.create({ data: t });
      testTicketIds.push(created.id);
    }
  });

  afterAll(async () => {
    // Clean up created test tickets
    if (testTicketIds.length > 0) {
      await prisma.attachment.deleteMany({
        where: { ticketId: { in: testTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: testTicketIds } },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication & Context Guards
  // ---------------------------------------------------------------------------
  describe("Authentication & Header Guards", () => {
    it("returns 403 Forbidden when X-Requester-Id header is missing", async () => {
      const res = await request(app).get("/api/tickets");

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });

    it("returns 403 Forbidden when X-Requester-Id is non-numeric or invalid", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", "not-a-number");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });

    it("returns 403 Forbidden when X-Requester-Id belongs to an inactive requester", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(inactiveRequesterId));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_REQUESTER");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Data Isolation & Scoping
  // ---------------------------------------------------------------------------
  describe("Requester Data Isolation", () => {
    it("returns only Requester A's tickets when authenticated as Requester A", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify every ticket belongs to Requester A
      for (const t of res.body.data) {
        expect(t.requesterId).toBe(requesterAId);
        expect(t.ticketNo).not.toContain("TEST-TKT-B-");
      }
    });

    it("returns only Requester B's tickets when authenticated as Requester B", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      for (const t of res.body.data) {
        expect(t.requesterId).toBe(requesterBId);
        expect(t.ticketNo).toContain("TEST-TKT-B-");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Pagination & Default Sorting
  // ---------------------------------------------------------------------------
  describe("Pagination & Default Sorting", () => {
    it("defaults to page 1, pageSize 10, sorted by createdAt DESC", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");

      // Verify pagination envelope
      const { pagination, data } = res.body;
      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(10);
      expect(pagination.limit).toBe(10);
      expect(pagination.totalItems).toBe(15);
      expect(pagination.totalCount).toBe(15);
      expect(pagination.totalPages).toBe(2);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(false);

      expect(data.length).toBe(10);

      // Verify default sort by createdAt DESC
      for (let i = 0; i < data.length - 1; i++) {
        const date1 = new Date(data[i].createdAt).getTime();
        const date2 = new Date(data[i + 1].createdAt).getTime();
        expect(date1).toBeGreaterThanOrEqual(date2);
      }
    });

    it("supports custom page and pageSize (or limit) parameters", async () => {
      const res = await request(app)
        .get("/api/tickets?page=2&pageSize=5")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      const { pagination, data } = res.body;
      expect(pagination.page).toBe(2);
      expect(pagination.pageSize).toBe(5);
      expect(pagination.totalItems).toBe(15);
      expect(pagination.totalPages).toBe(3);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(true);
      expect(data.length).toBe(5);
    });

    it("returns empty data array when requesting beyond totalPages", async () => {
      const res = await request(app)
        .get("/api/tickets?page=999&pageSize=10")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      const { pagination, data } = res.body;
      expect(pagination.page).toBe(999);
      expect(pagination.totalItems).toBe(15);
      expect(pagination.hasNext).toBe(false);
      expect(pagination.hasPrev).toBe(true);
      expect(data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Search Query (Ticket No and Summary)
  // ---------------------------------------------------------------------------
  describe("Search Query Functionality", () => {
    it("searches by exact ticket number case-insensitively", async () => {
      const res = await request(app)
        .get("/api/tickets?search=test-tkt-a-00001")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticketNo).toBe("TEST-TKT-A-00001");
    });

    it("searches by partial keyword in summary case-insensitively", async () => {
      const res = await request(app)
        .get("/api/tickets?search=keyBOARD")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].summary).toContain("MacBook Pro keyboard");
    });

    it("returns empty data when search matches nothing", async () => {
      const res = await request(app)
        .get("/api/tickets?search=nonexistentkeywordxyz")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalItems).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Filtering (Category, Priority, Status)
  // ---------------------------------------------------------------------------
  describe("Filtering Functionality", () => {
    it("filters tickets by categoryId", async () => {
      const res = await request(app)
        .get(`/api/tickets?categoryId=${networkCatId}`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const t of res.body.data) {
        expect(t.categoryId).toBe(networkCatId);
        expect(t.category.id).toBe(networkCatId);
      }
    });

    it("filters tickets by priority", async () => {
      const res = await request(app)
        .get("/api/tickets?priority=P0_URGENT")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].priority).toBe("P0_URGENT");
    });

    it("filters tickets by status", async () => {
      const res = await request(app)
        .get("/api/tickets?status=RESOLVED")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const t of res.body.data) {
        expect(t.status).toBe("RESOLVED");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Custom Sorting
  // ---------------------------------------------------------------------------
  describe("Sorting Functionality", () => {
    it("sorts by ticketNo ASC", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=ticketNo&sortOrder=asc&pageSize=5")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      const data = res.body.data;
      for (let i = 0; i < data.length - 1; i++) {
        const isAscending =
          data[i].ticketNo.localeCompare(data[i + 1].ticketNo) <= 0 ||
          data[i].ticketNo <= data[i + 1].ticketNo;
        expect(isAscending).toBe(true);
      }
    });

    it("sorts by summary DESC", async () => {
      const res = await request(app)
        .get("/api/tickets?sortBy=summary&sortOrder=desc&pageSize=5")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      const data = res.body.data;
      for (let i = 0; i < data.length - 1; i++) {
        const isDescending =
          data[i].summary.localeCompare(data[i + 1].summary) >= 0 ||
          data[i].summary >= data[i + 1].summary;
        expect(isDescending).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Response Schema & Relations
  // ---------------------------------------------------------------------------
  describe("Ticket Response Schema & Relations", () => {
    it("includes category, relatedSystem, requester, and attachments metadata", async () => {
      const res = await request(app)
        .get("/api/tickets?search=MacBook")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);

      const ticket = res.body.data[0];
      expect(ticket).toHaveProperty("id");
      expect(ticket).toHaveProperty("ticketNo");
      expect(ticket).toHaveProperty("summary");
      expect(ticket).toHaveProperty("description");
      expect(ticket).toHaveProperty("priority");
      expect(ticket).toHaveProperty("status");
      expect(ticket).toHaveProperty("createdAt");
      expect(ticket).toHaveProperty("updatedAt");
      expect(ticket).toHaveProperty("category");
      expect(ticket.category).toHaveProperty("name");
      expect(ticket).toHaveProperty("requester");
      expect(ticket.requester.fullName).toBe("Sarah Connor");
      expect(ticket).toHaveProperty("attachments");
      expect(ticket).toHaveProperty("attachmentCount");
    });
  });
});
