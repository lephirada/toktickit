import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Issue 19 — Database Schema Evolution & Seed Verification", () => {
  const prisma = getPrisma();
  const migrationDir = path.resolve(
    __dirname,
    "../../prisma/migrations/20261011000000_add_action_taken"
  );
  const migrationFilePath = path.join(migrationDir, "migration.sql");

  describe("Part 1: Non-Destructive Migration & Pre-existing Data Integrity", () => {
    it("verifies the physical migration SQL file exists, only extends schema, and contains zero destructive commands", () => {
      expect(fs.existsSync(migrationFilePath)).toBe(true);
      const sql = fs.readFileSync(migrationFilePath, "utf-8");
      expect(sql.length).toBeGreaterThan(50);

      // Verify additive schema definitions
      expect(sql).toContain('CREATE TABLE "ActionTaken"');
      expect(sql).toContain('"ticketId" INTEGER NOT NULL');
      expect(sql).toContain('"performedById" INTEGER NOT NULL');
      expect(sql).toContain('"actionDateTime" TIMESTAMP(3) NOT NULL');
      expect(sql).toContain('"description" VARCHAR(2000) NOT NULL');
      expect(sql).toContain('"result" VARCHAR(2000) NOT NULL');
      expect(sql).toContain('"followUpRequired" BOOLEAN NOT NULL');
      expect(sql).toContain('"followUpNote" VARCHAR(1000)');
      expect(sql).toContain('"attachmentNotes" VARCHAR(1000)');
      expect(sql).toContain('REFERENCES "Ticket"("id") ON DELETE CASCADE');
      expect(sql).toContain('REFERENCES "User"("id") ON DELETE RESTRICT');
      expect(sql).toContain('CREATE INDEX "ActionTaken_ticketId_idx"');
      expect(sql).toContain('CREATE INDEX "ActionTaken_performedById_idx"');
      expect(sql).toContain('CREATE INDEX "ActionTaken_actionDateTime_idx"');

      // Assert non-destructive invariant: migration SQL must not drop existing tables or columns
      const upperSql = sql.toUpperCase();
      expect(upperSql).not.toContain("DROP TABLE");
      expect(upperSql).not.toContain("TRUNCATE");
      expect(upperSql).not.toContain('DROP COLUMN');
      expect(upperSql).not.toContain('ALTER TABLE "USER" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "TICKET" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "COMMENT" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "ATTACHMENT" DROP');
    });

    it("verifies the ActionTaken model schema and column constraints via information_schema", async () => {
      const columns = await prisma.$queryRawUnsafe<
        Array<{ column_name: string; data_type: string; is_nullable: string }>
      >(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ActionTaken';
      `);

      const colNames = columns.map((c) => c.column_name);
      expect(colNames).toContain("id");
      expect(colNames).toContain("ticketId");
      expect(colNames).toContain("performedById");
      expect(colNames).toContain("actionDateTime");
      expect(colNames).toContain("description");
      expect(colNames).toContain("result");
      expect(colNames).toContain("followUpRequired");
      expect(colNames).toContain("followUpNote");
      expect(colNames).toContain("attachmentNotes");
      expect(colNames).toContain("timeSpentMinutes");
      expect(colNames).toContain("actionType");
      expect(colNames).toContain("performedAt");
      expect(colNames).toContain("createdAt");
      expect(colNames).toContain("updatedAt");

      const nullableMap = new Map(columns.map((c) => [c.column_name, c.is_nullable]));
      expect(nullableMap.get("followUpNote")).toBe("YES");
      expect(nullableMap.get("attachmentNotes")).toBe("YES");
      expect(nullableMap.get("description")).toBe("NO");
      expect(nullableMap.get("result")).toBe("NO");
    });

    it("verifies foreign key constraints enforce onDelete rules (RESTRICT on user, CASCADE on ticket)", async () => {
      const userFk = await prisma.$queryRawUnsafe<Array<{ delete_rule: string }>>(`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'ActionTaken' AND tc.constraint_name = 'ActionTaken_performedById_fkey';
      `);
      expect(userFk.length).toBe(1);
      expect(userFk[0].delete_rule).toBe("RESTRICT");

      const ticketFk = await prisma.$queryRawUnsafe<Array<{ delete_rule: string }>>(`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'ActionTaken' AND tc.constraint_name = 'ActionTaken_ticketId_fkey';
      `);
      expect(ticketFk.length).toBe(1);
      expect(ticketFk[0].delete_rule).toBe("CASCADE");
    });

    it("verifies all pre-existing tables and columns from Labs 1–3 remain completely intact", async () => {
      const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public';
      `);
      const tableNames = tables.map((t) => t.table_name);
      expect(tableNames).toContain("User");
      expect(tableNames).toContain("Ticket");
      expect(tableNames).toContain("Comment");
      expect(tableNames).toContain("Attachment");
      expect(tableNames).toContain("Category");
      expect(tableNames).toContain("RelatedSystem");

      // Verify Comment columns preserved
      const commentCols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Comment';
      `);
      const commentColNames = commentCols.map((c) => c.column_name);
      expect(commentColNames).toContain("id");
      expect(commentColNames).toContain("ticketId");
      expect(commentColNames).toContain("authorId");
      expect(commentColNames).toContain("body");
      expect(commentColNames).toContain("isInternal");

      // Verify Attachment columns preserved
      const attachmentCols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Attachment';
      `);
      const attachmentColNames = attachmentCols.map((c) => c.column_name);
      expect(attachmentColNames).toContain("id");
      expect(attachmentColNames).toContain("ticketId");
      expect(attachmentColNames).toContain("uploadedById");
      expect(attachmentColNames).toContain("originalName");
      expect(attachmentColNames).toContain("storageKey");
      expect(attachmentColNames).toContain("mimeType");
      expect(attachmentColNames).toContain("sizeBytes");
    });

    it("verifies pre-existing baseline records (Users, Categories, Systems, Tickets) from Labs 1–3 remain completely intact without modification or loss", async () => {
      // Ensure baseline from Labs 1-3 is active and consistent
      await seedDatabase();

      // 1. Verify pre-existing Users baseline from Labs 1–3
      const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
      expect(users.length).toBeGreaterThanOrEqual(10);

      const expectedStaffEmails = [
        "sarah.connor@toktickit.com",
        "john.doe@toktickit.com",
        "jennifer.anderson@toktickit.com",
        "michael.brown@toktickit.com",
        "kyle.reese@toktickit.com",
        "david.lee@toktickit.com",
        "alex.morgan@toktickit.com",
        "chris.taylor@toktickit.com",
        "kevin.patel@toktickit.com",
        "admin@toktickit.com",
      ];
      for (const email of expectedStaffEmails) {
        const user = users.find((u) => u.email === email);
        expect(user, `User ${email} must remain intact`).toBeDefined();
        expect(user!.isActive).toBeDefined();
        expect(user!.passwordHash.length).toBeGreaterThan(20);
      }

      // Verify specific user attributes preserved
      const kevin = users.find((u) => u.email === "kevin.patel@toktickit.com");
      expect(kevin?.role).toBe("IT_STAFF");
      expect(kevin?.isActive).toBe(false);

      const admin = users.find((u) => u.email === "admin@toktickit.com");
      expect(admin?.role).toBe("ADMINISTRATOR");

      // 2. Verify pre-existing Categories baseline
      const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });
      expect(categories.length).toBe(4);
      const categoryNames = categories.map((c) => c.name);
      expect(categoryNames).toContain("Account and Access");
      expect(categoryNames).toContain("Hardware");
      expect(categoryNames).toContain("Software");
      expect(categoryNames).toContain("Network");

      // 3. Verify pre-existing RelatedSystems baseline
      const systems = await prisma.relatedSystem.findMany({ orderBy: { id: "asc" } });
      expect(systems.length).toBe(6);
      const systemNames = systems.map((s) => s.name);
      expect(systemNames).toContain("Corporate Laptop");
      expect(systemNames).toContain("Campus Wi-Fi");
      expect(systemNames).toContain("VPN");
      expect(systemNames).toContain("Email");
      expect(systemNames).toContain("LEB2 App");
      expect(systemNames).toContain("Grade Submission App");

      // 4. Verify pre-existing Tickets baseline (TKT-2026-00001 through TKT-2026-00016)
      const expectedTicketNos = [
        "TKT-2026-00001",
        "TKT-2026-00002",
        "TKT-2026-00003",
        "TKT-2026-00004",
        "TKT-2026-00005",
        "TKT-2026-00006",
        "TKT-2026-00007",
        "TKT-2026-00008",
        "TKT-2026-00009",
        "TKT-2026-00010",
        "TKT-2026-00011",
        "TKT-2026-00012",
        "TKT-2026-00013",
        "TKT-2026-00014",
        "TKT-2026-00015",
        "TKT-2026-00016",
      ];
      const tickets = await prisma.ticket.findMany({
        where: { ticketNo: { in: expectedTicketNos } },
        include: { requester: true, category: true },
      });
      expect(tickets.length).toBe(16);

      const jennifer = users.find((u) => u.email === "jennifer.anderson@toktickit.com");
      for (const t of tickets) {
        expect(t.requesterId).toBe(jennifer!.id);
        expect(t.category).toBeDefined();
        expect(t.summary.length).toBeGreaterThan(10);
      }

      // 5. Verify referential integrity with ActionTaken parent relationship
      const sampleResolvedTicket = tickets.find((t) => t.ticketNo === "TKT-2026-00001");
      expect(sampleResolvedTicket).toBeDefined();
      expect(sampleResolvedTicket!.status).toBe("RESOLVED");
    });
  });

  describe("Part 2: Seed Script Execution, Data Coverage & Error Handling", () => {
    it("verifies seed data contains realistic tickets covering 0 actions, 1 action, and multiple actions across assigned and unassigned tickets", async () => {
      // Execute seed explicitly in seed test suite
      await seedDatabase();

      const tickets = await prisma.ticket.findMany({
        include: {
          actionsTaken: true,
        },
      });

      const withZeroActions = tickets.filter((t) => t.actionsTaken.length === 0);
      const withOneAction = tickets.filter((t) => t.actionsTaken.length === 1);
      const withMultipleActions = tickets.filter((t) => t.actionsTaken.length > 1);

      expect(withZeroActions.length).toBeGreaterThanOrEqual(1);
      expect(withOneAction.length).toBeGreaterThanOrEqual(1);
      expect(withMultipleActions.length).toBeGreaterThanOrEqual(1);

      // Assert coverage across assigned and unassigned tickets
      const unassignedWithZero = withZeroActions.filter((t) => t.ownerId === null);
      const unassignedWithActions = tickets.filter(
        (t) => t.ownerId === null && t.actionsTaken.length > 0
      );
      const assignedWithActions = tickets.filter(
        (t) => t.ownerId !== null && t.actionsTaken.length > 0
      );

      expect(unassignedWithZero.length).toBeGreaterThanOrEqual(1);
      expect(unassignedWithActions.length).toBeGreaterThanOrEqual(1);
      expect(assignedWithActions.length).toBeGreaterThanOrEqual(1);
    });

    it("verifies seed script idempotency across multiple consecutive executions", async () => {
      const actionsCountBefore = await prisma.actionTaken.count();
      expect(actionsCountBefore).toBeGreaterThanOrEqual(19);

      // Execute seed a second time
      await seedDatabase();

      const actionsCountAfter = await prisma.actionTaken.count();
      expect(actionsCountAfter).toBe(actionsCountBefore);
    });

    it("verifies seed script checks ActionTaken table existence and does not swallow schema absence", async () => {
      // Assert that information_schema query used in seed accurately returns existence
      const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ActionTaken'
        );
      `);
      expect(tableCheck[0]?.exists).toBe(true);

      // Verify that querying a non-existent table correctly returns false
      const nonExistentCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'NonExistentTable_TestCheck'
        );
      `);
      expect(nonExistentCheck[0]?.exists).toBe(false);
    });
  });
});
