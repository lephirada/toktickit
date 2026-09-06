import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue 6 — Backend API Tests (Requester Context & Taxonomy)", () => {
  describe("Database Seeding Verification", () => {
    it("verifies the seed created exactly 5 total requesters (4 active, 1 inactive), 4 categories, and 6 related systems", async () => {
      const prisma = getPrisma();

      const totalRequesters = await prisma.requesterUser.count();
      const activeRequesters = await prisma.requesterUser.count({ where: { isActive: true } });
      const inactiveRequesters = await prisma.requesterUser.count({ where: { isActive: false } });
      const categoriesCount = await prisma.category.count();
      const systemsCount = await prisma.relatedSystem.count();

      expect(totalRequesters).toBe(5);
      expect(activeRequesters).toBe(4);
      expect(inactiveRequesters).toBe(1);
      expect(categoriesCount).toBe(4);
      expect(systemsCount).toBe(6);
    });
  });

  describe("GET /api/requesters", () => {
    it("returns 200 OK with only active requesters wrapped in standard data envelope", async () => {
      const res = await request(app).get("/api/requesters");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(4);

      // Verify each requester is active and has required fields
      for (const requester of res.body.data) {
        expect(requester).toHaveProperty("id");
        expect(requester).toHaveProperty("email");
        expect(requester).toHaveProperty("fullName");
        expect(requester).toHaveProperty("department");
        expect(requester.isActive).toBe(true);
      }

      // Verify Kyle Reese (inactive) is excluded
      const emails = res.body.data.map((r: { email: string }) => r.email);
      expect(emails).not.toContain("kyle.reese@toktickit.com");

      // Verify exact 4 active requesters are present
      expect(emails).toContain("sarah.connor@toktickit.com");
      expect(emails).toContain("john.doe@toktickit.com");
      expect(emails).toContain("jennifer.anderson@toktickit.com");
      expect(emails).toContain("michael.brown@toktickit.com");
    });
  });

  describe("GET /api/categories", () => {
    it("returns 200 OK with all 4 seeded categories", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toContain("Account and Access");
      expect(names).toContain("Hardware");
      expect(names).toContain("Software");
      expect(names).toContain("Network");
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns 200 OK with all 6 seeded systems when no category filter is applied", async () => {
      const res = await request(app).get("/api/related-systems");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(6);

      const names = res.body.map((s: { name: string }) => s.name);
      expect(names).toEqual(
        expect.arrayContaining([
          "Corporate Laptop",
          "Campus Wi-Fi",
          "VPN",
          "Email",
          "LEB2 App",
          "Grade Submission App",
        ])
      );
    });

    it("filters related systems by categoryId query parameter", async () => {
      // First, get categories to obtain category IDs
      const catRes = await request(app).get("/api/categories");
      const hardwareCat = catRes.body.find((c: { name: string }) => c.name === "Hardware");
      const networkCat = catRes.body.find((c: { name: string }) => c.name === "Network");

      expect(hardwareCat).toBeDefined();
      expect(networkCat).toBeDefined();

      // Test Hardware filter
      const hwRes = await request(app).get(`/api/related-systems?categoryId=${hardwareCat.id}`);
      expect(hwRes.status).toBe(200);
      expect(Array.isArray(hwRes.body)).toBe(true);
      expect(hwRes.body.length).toBe(1);
      expect(hwRes.body[0].name).toBe("Corporate Laptop");
      expect(hwRes.body[0].categoryId).toBe(hardwareCat.id);

      // Test Network filter
      const netRes = await request(app).get(`/api/related-systems?categoryId=${networkCat.id}`);
      expect(netRes.status).toBe(200);
      expect(Array.isArray(netRes.body)).toBe(true);
      expect(netRes.body.length).toBe(2);
      const netNames = netRes.body.map((s: { name: string }) => s.name);
      expect(netNames).toEqual(expect.arrayContaining(["Campus Wi-Fi", "VPN"]));
    });
  });
});
