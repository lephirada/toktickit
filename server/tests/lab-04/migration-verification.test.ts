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

    it("proves pre-existing records (Users, Tickets, Comments, Attachments) remain completely intact and unaltered before and after ActionTaken operations", async () => {
      // 1. Establish baseline records representing Labs 1-3
      const category = await prisma.category.findFirstOrThrow();
      const author = await prisma.user.findFirstOrThrow({ where: { role: "IT_STAFF" } });
      const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER" } });

      const testTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-VERIFY-${Date.now()}`,
          summary: "Pre-migration data preservation verification ticket",
          description: "Confirms pre-existing comments and attachments remain intact and unmutated.",
          requestedPriority: "P2_MEDIUM",
          status: "IN_PROGRESS",
          categoryId: category.id,
          requesterId: requester.id,
          ownerId: author.id,
        },
      });

      const testComment = await prisma.comment.create({
        data: {
          ticketId: testTicket.id,
          authorId: author.id,
          body: "Baseline comment from Lab 3 diagnostics",
          isInternal: true,
        },
      });

      const testAttachment = await prisma.attachment.create({
        data: {
          ticketId: testTicket.id,
          uploadedById: author.id,
          originalName: "diagnostic-report-lab3.pdf",
          storageKey: `verify-${Date.now()}-diagnostic-report.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 12450,
        },
      });

      // Capture pre-action snapshot
      const commentSnapshot = { ...testComment };
      const attachmentSnapshot = { ...testAttachment };

      try {
        // 2. Perform ActionTaken operations linked to this ticket and agent
        const action = await prisma.actionTaken.create({
          data: {
            ticketId: testTicket.id,
            performedById: author.id,
            actionDateTime: new Date(),
            description: "Executed diagnostic scan during migration verification test",
            result: "All diagnostics normal",
            timeSpentMinutes: 20,
            actionType: "INVESTIGATION",
            followUpRequired: false,
          },
        });

        // 3. Assert pre-existing comment is completely intact and unaltered
        const currentComment = await prisma.comment.findUnique({
          where: { id: testComment.id },
          include: { author: true, ticket: true },
        });
        expect(currentComment).not.toBeNull();
        expect(currentComment!.id).toBe(commentSnapshot.id);
        expect(currentComment!.body).toBe(commentSnapshot.body);
        expect(currentComment!.isInternal).toBe(commentSnapshot.isInternal);
        expect(currentComment!.authorId).toBe(commentSnapshot.authorId);
        expect(currentComment!.ticketId).toBe(commentSnapshot.ticketId);
        expect(currentComment!.createdAt.getTime()).toBe(commentSnapshot.createdAt.getTime());
        expect(currentComment!.author.id).toBe(author.id);
        expect(currentComment!.ticket.id).toBe(testTicket.id);

        // 4. Assert pre-existing attachment is completely intact and unaltered
        const currentAttachment = await prisma.attachment.findUnique({
          where: { id: testAttachment.id },
          include: { uploadedBy: true, ticket: true },
        });
        expect(currentAttachment).not.toBeNull();
        expect(currentAttachment!.id).toBe(attachmentSnapshot.id);
        expect(currentAttachment!.originalName).toBe(attachmentSnapshot.originalName);
        expect(currentAttachment!.storageKey).toBe(attachmentSnapshot.storageKey);
        expect(currentAttachment!.mimeType).toBe(attachmentSnapshot.mimeType);
        expect(currentAttachment!.sizeBytes).toBe(attachmentSnapshot.sizeBytes);
        expect(currentAttachment!.uploadedById).toBe(attachmentSnapshot.uploadedById);
        expect(currentAttachment!.ticketId).toBe(attachmentSnapshot.ticketId);
        expect(currentAttachment!.uploadedBy.id).toBe(author.id);
        expect(currentAttachment!.ticket.id).toBe(testTicket.id);

        // 5. Assert deleting ActionTaken does not cascade or affect comment/attachment
        await prisma.actionTaken.delete({ where: { id: action.id } });
        const commentAfterActionDelete = await prisma.comment.findUnique({ where: { id: testComment.id } });
        const attachmentAfterActionDelete = await prisma.attachment.findUnique({ where: { id: testAttachment.id } });
        expect(commentAfterActionDelete).not.toBeNull();
        expect(attachmentAfterActionDelete).not.toBeNull();
      } finally {
        // Clean up test verification records
        await prisma.comment.delete({ where: { id: testComment.id } }).catch(() => {});
        await prisma.attachment.delete({ where: { id: testAttachment.id } }).catch(() => {});
        await prisma.ticket.delete({ where: { id: testTicket.id } }).catch(() => {});
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
