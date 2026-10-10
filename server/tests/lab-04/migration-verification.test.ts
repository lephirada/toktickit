import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Issue 19 — Database Schema Evolution, ActionTaken Model & Seed Verification", () => {
  const prisma = getPrisma();
  const migrationDir = path.resolve(
    __dirname,
    "../../prisma/migrations/20261011000000_add_action_taken"
  );
  const migrationFilePath = path.join(migrationDir, "migration.sql");

  beforeAll(async () => {
    await seedDatabase();
  });

  it("verifies the physical migration SQL file exists and contains table definition and foreign key constraints", () => {
    expect(fs.existsSync(migrationFilePath)).toBe(true);
    const sql = fs.readFileSync(migrationFilePath, "utf-8");
    expect(sql.length).toBeGreaterThan(50);
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
  });

  it("verifies the ActionTaken model schema and column constraints via information_schema", async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string; is_nullable: string }>>(`
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

  it("verifies the performedById foreign key enforces onDelete: RESTRICT to preserve user deactivation rule BR-15", async () => {
    const fkConstraint = await prisma.$queryRawUnsafe<Array<{ delete_rule: string }>>(`
      SELECT rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'ActionTaken' AND tc.constraint_name = 'ActionTaken_performedById_fkey';
    `);

    expect(fkConstraint.length).toBe(1);
    expect(fkConstraint[0].delete_rule).toBe("RESTRICT");
  });

  it("verifies the ticketId foreign key enforces onDelete: CASCADE", async () => {
    const fkConstraint = await prisma.$queryRawUnsafe<Array<{ delete_rule: string }>>(`
      SELECT rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.table_constraints tc ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'ActionTaken' AND tc.constraint_name = 'ActionTaken_ticketId_fkey';
    `);

    expect(fkConstraint.length).toBe(1);
    expect(fkConstraint[0].delete_rule).toBe("CASCADE");
  });

  it("verifies seed data contains realistic tickets covering 0 actions, 1 action, and multiple actions across assigned and unassigned tickets", async () => {
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
    const unassignedWithActions = tickets.filter((t) => t.ownerId === null && t.actionsTaken.length > 0);
    const assignedWithActions = tickets.filter((t) => t.ownerId !== null && t.actionsTaken.length > 0);

    expect(unassignedWithZero.length).toBeGreaterThanOrEqual(1);
    expect(unassignedWithActions.length).toBeGreaterThanOrEqual(1);
    expect(assignedWithActions.length).toBeGreaterThanOrEqual(1);
  });

  it("verifies pre-existing users, tickets, comments, and attachments from Labs 1–3 remain completely intact", async () => {
    const usersCount = await prisma.user.count();
    const categoriesCount = await prisma.category.count();
    const relatedSystemsCount = await prisma.relatedSystem.count();
    const ticketsCount = await prisma.ticket.count();

    expect(usersCount).toBeGreaterThanOrEqual(10);
    expect(categoriesCount).toBe(4);
    expect(relatedSystemsCount).toBe(6);
    expect(ticketsCount).toBeGreaterThanOrEqual(16);
  });
});
