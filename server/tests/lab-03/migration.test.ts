import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, UserRole } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TEST_DB_NAME = "toktickit_migration_vitest";
const BASE_DB_URL = "postgresql://toktickit:toktickit@localhost:5432/postgres";
const TEST_DB_URL = `postgresql://toktickit:toktickit@localhost:5432/${TEST_DB_NAME}`;

function executeSqlFile(filePath: string) {
  execSync(`psql "${TEST_DB_URL}" -f "${filePath}"`, { stdio: "pipe" });
}

function executeSql(sql: string) {
  execSync(`psql "${TEST_DB_URL}"`, { input: sql, stdio: ["pipe", "pipe", "pipe"] });
}

describe("Issue 11 — Database Schema, Migration & Seed Verification (migration.test.ts)", () => {
  let testPrisma: PrismaClient;

  const migrationDir = path.resolve(
    __dirname,
    "../../prisma/migrations/20260918000000_issue11_schema_evolution"
  );
  const migrationFilePath = path.join(migrationDir, "migration.sql");

  beforeAll(async () => {
    // 1. Ensure clean isolated test database
    try {
      execSync(`psql "${BASE_DB_URL}" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"`, {
        stdio: "ignore",
      });
      execSync(`psql "${BASE_DB_URL}" -c "CREATE DATABASE ${TEST_DB_NAME};"`, {
        stdio: "ignore",
      });
    } catch (err) {
      console.warn("Could not create isolated test database via psql:", err);
    }

    testPrisma = new PrismaClient({
      datasources: { db: { url: `postgresql://toktickit:toktickit@localhost:5432/${TEST_DB_NAME}?schema=public` } },
    });
  });

  afterAll(async () => {
    if (testPrisma) {
      await testPrisma.$disconnect();
    }
    try {
      execSync(`psql "${BASE_DB_URL}" -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"`, {
        stdio: "ignore",
      });
    } catch {
      // Ignore cleanup error in afterAll
    }
  });

  it("verifies the physical migration SQL file exists and is non-empty", () => {
    expect(fs.existsSync(migrationFilePath)).toBe(true);
    const sql = fs.readFileSync(migrationFilePath, "utf-8");
    expect(sql.length).toBeGreaterThan(100);
    expect(sql).toContain('ALTER TABLE "RequesterUser" RENAME TO "User"');
    expect(sql).toContain('CREATE TYPE "UserRole"');
    expect(sql).toContain('CREATE TYPE "TicketStatus_new"');
    expect(sql).toContain('ALTER TABLE "Ticket" RENAME COLUMN "priority" TO "requestedPriority"');
    expect(sql).toContain('CREATE TABLE "Comment"');
  });

  it("executes the exact migration SQL file on a populated Lab 2 baseline and verifies zero data loss", async () => {
    // 1. Prepare legacy Lab 2 schema in test database
    const legacyDdl = `
      CREATE TYPE "Priority" AS ENUM ('P0_URGENT', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW');
      CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

      CREATE TABLE "RequesterUser" (
        "id" SERIAL NOT NULL,
        "email" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "department" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RequesterUser_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX "RequesterUser_email_key" ON "RequesterUser"("email");
      CREATE INDEX "RequesterUser_isActive_idx" ON "RequesterUser"("isActive");

      CREATE TABLE "Category" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

      CREATE TABLE "RelatedSystem" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "categoryId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RelatedSystem_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "RelatedSystem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX "RelatedSystem_name_categoryId_key" ON "RelatedSystem"("name", "categoryId");

      CREATE TABLE "Ticket" (
        "id" SERIAL NOT NULL,
        "ticketNo" TEXT NOT NULL,
        "summary" VARCHAR(100) NOT NULL,
        "description" VARCHAR(2000) NOT NULL,
        "priority" "Priority" NOT NULL DEFAULT 'P2_MEDIUM',
        "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
        "requesterId" INTEGER NOT NULL,
        "categoryId" INTEGER NOT NULL,
        "relatedSystemId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "Ticket_relatedSystemId_fkey" FOREIGN KEY ("relatedSystemId") REFERENCES "RelatedSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX "Ticket_ticketNo_key" ON "Ticket"("ticketNo");
      CREATE INDEX "Ticket_requesterId_idx" ON "Ticket"("requesterId");

      CREATE TABLE "Attachment" (
        "id" SERIAL NOT NULL,
        "originalName" TEXT NOT NULL,
        "storageKey" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "sizeBytes" INTEGER NOT NULL,
        "ticketId" INTEGER,
        "uploadedById" INTEGER NOT NULL,
        "isSoftDeleted" BOOLEAN NOT NULL DEFAULT false,
        "deletedAt" TIMESTAMP(3),
        "deletedBy" INTEGER,
        "deletionReason" VARCHAR(255),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

      CREATE TABLE "TicketActivity" (
        "id" SERIAL NOT NULL,
        "ticketId" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "actorId" INTEGER,
        "actorName" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;
    executeSql(legacyDdl);

    // 2. Insert Controlled Baseline Lab 2 Fixture:
    // - 5 Requesters (Sarah 1, John 2, Jennifer 3, Michael 4, Kyle 5 inactive)
    // - 4 Categories, 6 Related Systems
    // - 16 Tickets for Jennifer (including 3 REJECTED tickets)
    // - 7 Attachments uploaded by Jennifer
    const fixtureSql = `
      INSERT INTO "Category" ("id", "name") VALUES 
        (1, 'Account and Access'), (2, 'Hardware'), (3, 'Software'), (4, 'Network');
      ALTER SEQUENCE "Category_id_seq" RESTART WITH 5;

      INSERT INTO "RelatedSystem" ("id", "name", "categoryId") VALUES
        (1, 'Corporate Laptop', 2), (2, 'Campus Wi-Fi', 4), (3, 'VPN', 4),
        (4, 'Email', 1), (5, 'LEB2 App', 3), (6, 'Grade Submission App', 3);
      ALTER SEQUENCE "RelatedSystem_id_seq" RESTART WITH 7;

      INSERT INTO "RequesterUser" ("id", "email", "fullName", "department", "isActive") VALUES
        (1, 'sarah.connor@toktickit.com', 'Sarah Connor', 'Engineering', true),
        (2, 'john.doe@toktickit.com', 'John Doe', 'Finance', true),
        (3, 'jennifer.anderson@toktickit.com', 'Jennifer Anderson', 'Engineering', true),
        (4, 'michael.brown@toktickit.com', 'Michael Brown', 'Marketing', true),
        (5, 'kyle.reese@toktickit.com', 'Kyle Reese', 'Operations', false);
      ALTER SEQUENCE "RequesterUser_id_seq" RESTART WITH 6;

      DO $$
      DECLARE
        i int;
        v_tkt_id int;
      BEGIN
        FOR i IN 1..16 LOOP
          INSERT INTO "Ticket" ("ticketNo", "summary", "description", "priority", "status", "requesterId", "categoryId", "relatedSystemId")
          VALUES (
            'TKT-2026-' || LPAD(i::text, 5, '0'),
            'Baseline ticket ' || i,
            'Description for ticket ' || i,
            CASE (i % 4)
              WHEN 0 THEN 'P0_URGENT'::"Priority"
              WHEN 1 THEN 'P1_HIGH'::"Priority"
              WHEN 2 THEN 'P2_MEDIUM'::"Priority"
              ELSE 'P3_LOW'::"Priority"
            END,
            CASE (i % 5)
              WHEN 0 THEN 'REJECTED'::"TicketStatus"
              WHEN 1 THEN 'NEW'::"TicketStatus"
              WHEN 2 THEN 'IN_PROGRESS'::"TicketStatus"
              WHEN 3 THEN 'RESOLVED'::"TicketStatus"
              ELSE 'CLOSED'::"TicketStatus"
            END,
            3,
            2,
            1
          ) RETURNING id INTO v_tkt_id;

          IF i <= 7 THEN
            INSERT INTO "Attachment" ("originalName", "storageKey", "mimeType", "sizeBytes", "ticketId", "uploadedById")
            VALUES (
              'attachment_' || i || '.png',
              'storage_baseline_' || i,
              'image/png',
              2048 * i,
              v_tkt_id,
              3
            );
          END IF;
        END LOOP;
      END $$;
    `;
    executeSql(fixtureSql);

    // Verify pre-migration counts
    const preUsers = await testPrisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "RequesterUser"`;
    const preTickets = await testPrisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Ticket"`;
    const preAttachments = await testPrisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Attachment"`;
    const preRejected = await testPrisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'REJECTED'`;

    expect(Number(preUsers[0].count)).toBe(5);
    expect(Number(preTickets[0].count)).toBe(16);
    expect(Number(preAttachments[0].count)).toBe(7);
    expect(Number(preRejected[0].count)).toBe(3);

    // 3. Execute the exact migration SQL file directly from disk
    executeSqlFile(migrationFilePath);

    // 4. Verify post-migration state & zero data loss
    const postUsers = await testPrisma.user.findMany({ orderBy: { id: "asc" } });
    expect(postUsers.length).toBe(5);
    expect(postUsers[0].id).toBe(1);
    expect(postUsers[0].email).toBe("sarah.connor@toktickit.com");
    expect(postUsers[0].mustChangePassword).toBe(true); // Sarah Connor flagged for password change
    expect(postUsers[1].id).toBe(2);
    expect(postUsers[1].mustChangePassword).toBe(false); // Preserved legacy user
    expect(postUsers[2].id).toBe(3);
    expect(postUsers[2].email).toBe("jennifer.anderson@toktickit.com");
    expect(postUsers[2].mustChangePassword).toBe(false); // Preserved legacy user
    expect(postUsers[4].id).toBe(5);
    expect(postUsers[4].email).toBe("kyle.reese@toktickit.com");
    expect(postUsers[4].isActive).toBe(false); // Preserved inactive state
    expect(postUsers[4].mustChangePassword).toBe(false); // Preserved legacy user

    // Verify column default for mustChangePassword is true in PostgreSQL
    const colDefault = await testPrisma.$queryRaw<[{ column_default: string }]>`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'mustChangePassword'
    `;
    expect(colDefault[0].column_default).toBe("true");

    // Verify new user creation without specifying mustChangePassword defaults to true
    const brandNewUser = await testPrisma.user.create({
      data: {
        email: "brandnew.user@toktickit.com",
        fullName: "Brand New User",
      },
    });
    expect(brandNewUser.mustChangePassword).toBe(true);
    await testPrisma.user.delete({ where: { id: brandNewUser.id } });

    const postTickets = await testPrisma.ticket.findMany({ orderBy: { id: "asc" } });
    expect(postTickets.length).toBe(16);
    expect(postTickets.every((t) => t.requesterId === 3)).toBe(true);
    expect(postTickets.every((t) => t.itPriority === null)).toBe(true);
    expect(postTickets.every((t) => t.ownerId === null)).toBe(true);

    // Verify status conversion: all 3 REJECTED tickets mapped to CANCELLED
    const rejectedCount = await testPrisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'REJECTED'
    `;
    const cancelledCount = await testPrisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'CANCELLED'
    `;
    expect(Number(rejectedCount[0].count)).toBe(0);
    expect(Number(cancelledCount[0].count)).toBe(3);

    // Verify attachments preserved
    const postAttachments = await testPrisma.attachment.findMany({ orderBy: { id: "asc" } });
    expect(postAttachments.length).toBe(7);
    expect(postAttachments.every((a) => a.uploadedById === 3)).toBe(true);

    // Verify foreign keys point to User
    const fkResults = await testPrisma.$queryRaw<{ conname: string; confrelid: string }[]>`
      SELECT conname, confrelid::regclass::text 
      FROM pg_constraint 
      WHERE conname IN ('Ticket_requesterId_fkey', 'Attachment_uploadedById_fkey')
    `;
    expect(fkResults.some((f) => f.conname === "Ticket_requesterId_fkey" && f.confrelid === '"User"')).toBe(true);
    expect(fkResults.some((f) => f.conname === "Attachment_uploadedById_fkey" && f.confrelid === '"User"')).toBe(true);
  });

  it("verifies real seed script idempotency and credential protection on repeated runs (AC-11-05 & AC-11-08)", async () => {
    const serverDir = path.resolve(__dirname, "../..");
    const seedEnv = {
      ...process.env,
      DATABASE_URL: `postgresql://toktickit:toktickit@localhost:5432/${TEST_DB_NAME}?schema=public`,
    };

    // Helper to execute the actual physical server/prisma/seed.ts script
    function executeRealSeed() {
      execSync("npx tsx prisma/seed.ts", {
        cwd: serverDir,
        env: seedEnv,
        stdio: "pipe",
      });
    }

    // 1. Run the real seed script the 1st time
    executeRealSeed();

    const allUsers = await testPrisma.user.findMany({ orderBy: { id: "asc" } });
    expect(allUsers.length).toBe(10);

    // Verify Kevin Patel is inactive IT Staff (AC-11-06 & AC-15-05)
    const kevin = allUsers.find((u) => u.email === "kevin.patel@toktickit.com");
    expect(kevin).toBeDefined();
    expect(kevin?.role).toBe("IT_STAFF");
    expect(kevin?.isActive).toBe(false);

    // Verify Admin mustChangePassword is true
    const admin = allUsers.find((u) => u.email === "admin@toktickit.com");
    expect(admin?.role).toBe("ADMINISTRATOR");
    expect(admin?.mustChangePassword).toBe(true);

    // Verify Sarah Connor mustChangePassword is true
    const sarah = allUsers.find((u) => u.email === "sarah.connor@toktickit.com");
    expect(sarah?.mustChangePassword).toBe(true);

    // Verify all bcrypt hashes match standard regex
    const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    for (const u of allUsers) {
      expect(u.passwordHash).toMatch(bcryptRegex);
    }

    // Verify Categories and RelatedSystems count
    const catCount = await testPrisma.category.count();
    const sysCount = await testPrisma.relatedSystem.count();
    expect(catCount).toBe(4);
    expect(sysCount).toBe(6);

    const DEFAULT_USER_PASSWORD_HASH = "$2b$10$epR.zIe6lO2vE9tK4x8GkOCsM4.W1YI2fT1J2V9q8J5B9X9b1w7y2";
    try {
      // 2. Manually mutate John Doe's password credentials with valid bcrypt format
      const modifiedHash = "$2b$10$customModifiedHashForIdempotencyTest123456789012345";
      await testPrisma.user.update({
        where: { email: "john.doe@toktickit.com" },
        data: {
          passwordHash: modifiedHash,
          mustChangePassword: true,
        },
      });

      // 3. Re-run the real seed script the 2nd time (AC-11-05 idempotency)
      executeRealSeed();

      // 4. Verify modified password credentials were NOT overwritten (AC-11-08)
      const johnAfterReSeed = await testPrisma.user.findUnique({
        where: { email: "john.doe@toktickit.com" },
      });
      expect(johnAfterReSeed?.passwordHash).toBe(modifiedHash);
      expect(johnAfterReSeed?.mustChangePassword).toBe(true);

      // Verify total records remained exactly consistent with zero duplication
      const totalUsersAfterReSeed = await testPrisma.user.count();
      expect(totalUsersAfterReSeed).toBe(10);
      expect(await testPrisma.category.count()).toBe(4);
      expect(await testPrisma.relatedSystem.count()).toBe(6);
    } finally {
      // Restore John Doe credentials to original seed state to prevent cross-test interference
      await testPrisma.user.update({
        where: { email: "john.doe@toktickit.com" },
        data: {
          passwordHash: DEFAULT_USER_PASSWORD_HASH,
          mustChangePassword: false,
        },
      }).catch(() => {});
    }
  });
});
