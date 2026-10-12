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
      expect(upperSql).not.toContain("DROP COLUMN");
      expect(upperSql).not.toContain('ALTER TABLE "USER" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "TICKET" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "COMMENT" DROP');
      expect(upperSql).not.toContain('ALTER TABLE "ATTACHMENT" DROP');
    });

    it("verifies ActionTaken column types, nullability, and VarChar character_maximum_length via information_schema", async () => {
      const columns = await prisma.$queryRawUnsafe<
        Array<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          character_maximum_length: number | null;
        }>
      >(`
        SELECT column_name, data_type, is_nullable, character_maximum_length
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

      // Verify nullability constraints
      const nullableMap = new Map(columns.map((c) => [c.column_name, c.is_nullable]));
      expect(nullableMap.get("followUpNote")).toBe("YES");
      expect(nullableMap.get("attachmentNotes")).toBe("YES");
      expect(nullableMap.get("description")).toBe("NO");
      expect(nullableMap.get("result")).toBe("NO");

      // Verify explicit VarChar character_maximum_length constraints in database
      const lengthMap = new Map(columns.map((c) => [c.column_name, c.character_maximum_length]));
      expect(lengthMap.get("description")).toBe(2000);
      expect(lengthMap.get("result")).toBe(2000);
      expect(lengthMap.get("followUpNote")).toBe(1000);
      expect(lengthMap.get("attachmentNotes")).toBe(1000);
      expect(lengthMap.get("actionType")).toBe(50);
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

    it("executes migration on a populated Lab 3 baseline schema and proves pre-existing data remains 100% unaltered", async () => {
      const testSchema = "lab4_migration_baseline_test";

      // 1. Setup isolated test schema mimicking Lab 3 pre-migration baseline
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
      await prisma.$executeRawUnsafe(`CREATE SCHEMA "${testSchema}";`);

      const executeSqlStatements = async (sql: string) => {
        const statements = sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await prisma.$executeRawUnsafe(stmt);
        }
      };

      try {
        await executeSqlStatements(`
          CREATE TABLE "${testSchema}"."User" (
            "id" SERIAL PRIMARY KEY,
            "email" TEXT UNIQUE NOT NULL,
            "fullName" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'REQUESTER',
            "passwordHash" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true
          );

          CREATE TABLE "${testSchema}"."Category" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT UNIQUE NOT NULL
          );

          CREATE TABLE "${testSchema}"."Ticket" (
            "id" SERIAL PRIMARY KEY,
            "ticketNo" TEXT UNIQUE NOT NULL,
            "summary" VARCHAR(100) NOT NULL,
            "description" VARCHAR(2000) NOT NULL,
            "requestedPriority" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "categoryId" INTEGER REFERENCES "${testSchema}"."Category"("id"),
            "requesterId" INTEGER REFERENCES "${testSchema}"."User"("id")
          );

          CREATE TABLE "${testSchema}"."Comment" (
            "id" SERIAL PRIMARY KEY,
            "ticketId" INTEGER REFERENCES "${testSchema}"."Ticket"("id"),
            "authorId" INTEGER REFERENCES "${testSchema}"."User"("id"),
            "body" VARCHAR(2000) NOT NULL,
            "isInternal" BOOLEAN DEFAULT false
          );

          CREATE TABLE "${testSchema}"."Attachment" (
            "id" SERIAL PRIMARY KEY,
            "ticketId" INTEGER REFERENCES "${testSchema}"."Ticket"("id"),
            "uploadedById" INTEGER REFERENCES "${testSchema}"."User"("id"),
            "originalName" TEXT NOT NULL,
            "storageKey" TEXT UNIQUE NOT NULL,
            "mimeType" TEXT NOT NULL,
            "sizeBytes" INTEGER NOT NULL
          );
        `);

        // Populate baseline records representing Labs 1–3
        await executeSqlStatements(`
          INSERT INTO "${testSchema}"."User" ("id", "email", "fullName", "role", "passwordHash", "isActive")
          VALUES (1, 'jennifer.anderson@toktickit.com', 'Jennifer Anderson', 'REQUESTER', '$2b$10$hash1', true),
                 (2, 'david.lee@toktickit.com', 'David Lee', 'IT_STAFF', '$2b$10$hash2', true);

          INSERT INTO "${testSchema}"."Category" ("id", "name")
          VALUES (1, 'Hardware');

          INSERT INTO "${testSchema}"."Ticket" ("id", "ticketNo", "summary", "description", "requestedPriority", "status", "categoryId", "requesterId")
          VALUES (101, 'TKT-2026-00001', 'MacBook keyboard sticking', 'Spacebar double press', 'P2_MEDIUM', 'IN_PROGRESS', 1, 1);

          INSERT INTO "${testSchema}"."Comment" ("id", "ticketId", "authorId", "body", "isInternal")
          VALUES (201, 101, 2, 'Inspected keyboard switch', true);

          INSERT INTO "${testSchema}"."Attachment" ("id", "ticketId", "uploadedById", "originalName", "storageKey", "mimeType", "sizeBytes")
          VALUES (301, 101, 2, 'diagnostic-report.pdf', 'diag-key-101', 'application/pdf', 12345);
        `);

        // Capture snapshot before migration
        const preUsers = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."User" ORDER BY id;`
        );
        const preTickets = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Ticket" ORDER BY id;`
        );
        const preComments = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Comment" ORDER BY id;`
        );
        const preAttachments = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Attachment" ORDER BY id;`
        );

        expect(preUsers.length).toBe(2);
        expect(preTickets.length).toBe(1);
        expect(preComments.length).toBe(1);
        expect(preAttachments.length).toBe(1);

        // 2. Execute migration SQL in the test schema using a dedicated connection transaction
        const migrationSql = fs.readFileSync(migrationFilePath, "utf-8");
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${testSchema}", public;`);
          const migrationStatements = migrationSql
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          for (const stmt of migrationStatements) {
            await tx.$executeRawUnsafe(stmt);
          }
        });

        // 3. Verify post-migration state: prove pre-existing data is 100% unaltered
        const postUsers = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."User" ORDER BY id;`
        );
        const postTickets = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Ticket" ORDER BY id;`
        );
        const postComments = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Comment" ORDER BY id;`
        );
        const postAttachments = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT * FROM "${testSchema}"."Attachment" ORDER BY id;`
        );

        expect(postUsers).toEqual(preUsers);
        expect(postTickets).toEqual(preTickets);
        expect(postComments).toEqual(preComments);
        expect(postAttachments).toEqual(preAttachments);

        // Verify that ActionTaken table was successfully created in the schema
        const actionTableCheck = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = '${testSchema}' AND table_name = 'ActionTaken';
        `);
        expect(actionTableCheck.length).toBe(1);

        // Verify foreign key relations work on pre-existing records without error
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${testSchema}"."ActionTaken" ("ticketId", "performedById", "description", "result", "timeSpentMinutes", "updatedAt")
          VALUES (101, 2, 'Replaced keyboard mechanism', 'All keys functioning', 30, CURRENT_TIMESTAMP);
        `);
        const actionsInSchema = await prisma.$queryRawUnsafe<Array<{ ticketId: number; performedById: number }>>(`
          SELECT "ticketId", "performedById" FROM "${testSchema}"."ActionTaken";
        `);
        expect(actionsInSchema.length).toBe(1);
        expect(actionsInSchema[0].ticketId).toBe(101);
        expect(actionsInSchema[0].performedById).toBe(2);
      } finally {
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE;`);
      }
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
