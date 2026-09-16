# TokTickIT — Database Migration & Evolution Plan (Sprint 3 / Issue 10)

**Target Issue:** Issue 11 (`feature/11-database-migration`)  
**Database:** PostgreSQL 15+ via Prisma ORM  
**Migration Strategy:** Non-Destructive In-Place Table Evolution & Foreign Key Relinking  

---

## 1. Pre-Migration Baseline & Repository Inspection

An inspection of the TokTickIT PostgreSQL database schema (`server/prisma/schema.prisma`), migration history (`server/prisma/migrations/`), and seed data (`server/prisma/seed.ts`) confirms the following exact pre-migration baseline:

### 1.1 Existing Database Tables & Schema State
* **`"RequesterUser"` Table:**
  * Columns: `id` (SERIAL, PK), `email` (TEXT, UNIQUE), `fullName` (TEXT), `department` (TEXT), `isActive` (BOOLEAN, DEFAULT true), `createdAt` (TIMESTAMP), `updatedAt` (TIMESTAMP).
  * Sequence: `"RequesterUser_id_seq"`.
  * Indexes: `"RequesterUser_email_key"` (UNIQUE), `"RequesterUser_isActive_idx"`.
* **`"Category"` Table:** 4 records (`Hardware`, `Network`, `Software`, `Account and Access`).
* **`"RelatedSystem"` Table:** 6 records (`Corporate Laptop`, `Campus Wi-Fi`, `VPN`, `Email`, `LEB2 App`, `Grade Submission App`).
* **`"Ticket"` Table:**
  * Columns: `id` (SERIAL, PK), `ticketNo` (TEXT, UNIQUE), `summary` (VARCHAR 100), `description` (VARCHAR 2000), `priority` (`Priority` ENUM: `P0_URGENT`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`), `status` (`TicketStatus` ENUM: `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED`), `requesterId` (INTEGER, FK $\rightarrow$ `"RequesterUser"(id)`), `categoryId` (INTEGER), `relatedSystemId` (INTEGER NULL), `createdAt`, `updatedAt`.
  * Indexes: `"Ticket_ticketNo_key"`, `"Ticket_requesterId_idx"`, `"Ticket_status_idx"`, `"Ticket_createdAt_idx"`.
* **`"Attachment"` Table:**
  * Columns: `id` (SERIAL, PK), `originalName` (TEXT), `storageKey` (TEXT, UNIQUE), `mimeType` (TEXT), `sizeBytes` (INTEGER), `ticketId` (INTEGER NULL), `uploadedById` (INTEGER, FK $\rightarrow$ `"RequesterUser"(id)`), `isSoftDeleted` (BOOLEAN), `deletedAt`, `deletedBy`, `deletionReason`, `createdAt`.
* **`"TicketActivity"` Table:**
  * Columns: `id` (SERIAL, PK), `ticketId` (INTEGER), `type` (TEXT), `action` (TEXT), `message` (TEXT), `actorId` (INTEGER NULL), `actorName` (TEXT), `metadata` (JSON NULL), `createdAt`.

### 1.2 Baseline Record Counts (Pre-Migration Data)
1. **Users (`RequesterUser`):** Exactly **5** pre-existing users:
   * `id: 1` — Sarah Connor (`sarah.connor@toktickit.com`, Engineering, Active)
   * `id: 2` — John Doe (`john.doe@toktickit.com`, Finance, Active)
   * `id: 3` — Jennifer Anderson (`jennifer.anderson@toktickit.com`, Engineering, Active)
   * `id: 4` — Michael Brown (`michael.brown@toktickit.com`, Marketing, Active)
   * `id: 5` — Kyle Reese (`kyle.reese@toktickit.com`, Operations, Inactive)
2. **Tickets (`Ticket`):** Exactly **16** realistic tickets (`TKT-2026-00001` through `TKT-2026-00016`) associated with Jennifer Anderson (`requesterId: 3`).
3. **Attachments (`Attachment`):** Exactly **7** attachment records linked to tickets and uploaded by requester users.

---

## 2. Transition Design: `"RequesterUser"` to `"User"`

### 2.1 Table Evolution Strategy
To ensure 100% data preservation and avoid dropping existing records, the `"RequesterUser"` table is **evolved in-place** into the `"User"` table (or mapped via Prisma `@map("users")` depending on naming conventions):

1. **Table & Sequence Renaming:**
   ```sql
   ALTER TABLE "RequesterUser" RENAME TO "User";
   ALTER SEQUENCE "RequesterUser_id_seq" RENAME TO "User_id_seq";
   ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
   ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
   ALTER INDEX "RequesterUser_isActive_idx" RENAME TO "User_isActive_idx";
   ```
2. **Column Alterations & Additions:**
   * Create `UserRole` ENUM:
     ```sql
     CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
     ```
   * Add `role` column with default `'REQUESTER'`:
     ```sql
     ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER';
     ```
   * Add `passwordHash` column (populated with initial bcrypt hash for existing users):
     ```sql
     -- Initial hash for 'Password123!' ($2b$10$wE1...):
     ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$epR.zIe6lO2vE9tK4x8GkOCsM4.W1YI2fT1J2V9q8J5B9X9b1w7y2';
     ```
   * Add `mustChangePassword` boolean:
     ```sql
     ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
     -- Sarah Connor set to true to test forced change-password flow:
     UPDATE "User" SET "mustChangePassword" = true WHERE "email" = 'sarah.connor@toktickit.com';
     ```
   * Alter `department` to be optional:
     ```sql
     ALTER TABLE "User" ALTER COLUMN "department" DROP NOT NULL;
     ```

---

## 3. Ticket Workflow & Status Lifecycle Schema Changes

### 3.1 Status Enum Expansion & Legacy Status Conversion
The Lab 2 `TicketStatus` enum contained: `'NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'`.  
Sprint 3 requires 8 distinct statuses: `'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'`.

* **Safe Enum Conversion Steps:**
  ```sql
  -- 1. Add new enum values to PostgreSQL enum
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
  ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

  -- 2. Convert any existing REJECTED tickets to CANCELLED
  UPDATE "Ticket" SET "status" = 'CANCELLED' WHERE "status"::text = 'REJECTED';
  ```

### 3.2 Ticket Model Extensions
```sql
-- 1. Operational IT Priority
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "Priority" NULL;

-- 2. Resolution Indicator Flag
ALTER TABLE "Ticket" ADD COLUMN "resolutionIndicated" BOOLEAN NOT NULL DEFAULT false;

-- 3. Operational Owner
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER NULL;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- 4. Mandatory State Transition Reason Columns
ALTER TABLE "Ticket" ADD COLUMN "resolutionSummary" VARCHAR(2000) NULL;
ALTER TABLE "Ticket" ADD COLUMN "cancellationReason" VARCHAR(1000) NULL;
ALTER TABLE "Ticket" ADD COLUMN "reopenReason" VARCHAR(1000) NULL;
```

---

## 4. Discussion & Discussion Models

### 4.1 New `Comment` Table (Public Comments & Internal Notes)
```sql
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "Comment_ticketId_idx" ON "Comment"("ticketId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX "Comment_isInternal_idx" ON "Comment"("isInternal");
```

---

## 5. Foreign Key Relinking & Integrity Preservation

All foreign keys previously pointing to `"RequesterUser"` must be verified and relinked to `"User"`:
1. **`Ticket.requesterId` $\rightarrow$ `"User"(id)`**:
   Existing constraints updated:
   ```sql
   ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";
   ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" 
     FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT;
   ```
2. **`Attachment.uploadedById` $\rightarrow$ `"User"(id)`**:
   ```sql
   ALTER TABLE "Attachment" DROP CONSTRAINT IF EXISTS "Attachment_uploadedById_fkey";
   ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" 
     FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT;
   ```
3. **`TicketActivity.actorId` $\rightarrow$ `"User"(id)`**:
   ```sql
   ALTER TABLE "TicketActivity" DROP CONSTRAINT IF EXISTS "TicketActivity_actorId_fkey";
   ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" 
     FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;
   ```

---

## 6. Seed Data Strategy & Idempotency Rules

### 6.1 Total User Inventory (10 Users)
Post-migration, the database seed must contain exactly 10 distinct users:

| ID | Full Name | Email Address | Role | Department | Active | Initial Password | `mustChangePassword` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Sarah Connor | `sarah.connor@toktickit.com` | `REQUESTER` | Engineering | Yes | `Password123!` | **`true`** |
| 2 | John Doe | `john.doe@toktickit.com` | `REQUESTER` | Finance | Yes | `Password123!` | `false` |
| 3 | Jennifer Anderson | `jennifer.anderson@toktickit.com` | `REQUESTER` | Engineering | Yes | `Password123!` | `false` |
| 4 | Michael Brown | `michael.brown@toktickit.com` | `REQUESTER` | Marketing | Yes | `Password123!` | `false` |
| 5 | Kyle Reese | `kyle.reese@toktickit.com` | `REQUESTER` | Operations | **No** | `Password123!` | `false` |
| 6 | David Lee | `david.lee@toktickit.com` | `IT_STAFF` | IT Support | Yes | `Password123!` | `false` |
| 7 | Alex Morgan | `alex.morgan@toktickit.com` | `IT_STAFF` | Infrastructure | Yes | `Password123!` | `false` |
| 8 | Chris Taylor | `chris.taylor@toktickit.com` | `IT_STAFF` | IT Support | Yes | `Password123!` | `false` |
| 9 | Pat Riley | `pat.riley@toktickit.com` | `IT_STAFF` | Helpdesk | Yes | `Password123!` | `false` |
| 10 | System Admin | `admin@toktickit.com` | `ADMINISTRATOR` | IT Administration | Yes | `Admin123!` | `false` |

### 6.2 Idempotency Rule: Password & Flag Protection
In `server/prisma/seed.ts`, all `prisma.user.upsert` queries MUST NOT overwrite existing credentials:
```typescript
await prisma.user.upsert({
  where: { email: u.email },
  update: {
    fullName: u.fullName,
    department: u.department,
    role: u.role,
    isActive: u.isActive,
    // CRITICAL: passwordHash and mustChangePassword are intentionally omitted from update!
  },
  create: {
    email: u.email,
    fullName: u.fullName,
    department: u.department,
    role: u.role,
    isActive: u.isActive,
    passwordHash: u.passwordHash,
    mustChangePassword: u.mustChangePassword,
  },
});
```
This guarantees that when automated test suites run the seed or re-seed the environment, user password updates and password-reset flags are never reverted.

---

## 7. Migration Verification & Safety Assertions

To guarantee zero regression and schema correctness before starting Issue 12, the automated test suite `server/tests/lab-03/migration-verification.test.ts` executes the following checks:

```typescript
// 1. Verify User Count & Preserved Primary Keys
const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
expect(users.length).toBeGreaterThanOrEqual(10);
expect(users[0].id).toBe(1);
expect(users[0].email).toBe("sarah.connor@toktickit.com");
expect(users[2].id).toBe(3);
expect(users[2].email).toBe("jennifer.anderson@toktickit.com");

// 2. Verify Ticket Count & Requester Association
const tickets = await prisma.ticket.findMany({ where: { requesterId: 3 } });
expect(tickets.length).toBe(16);
expect(tickets[0].ticketNo).toBe("TKT-2026-00001");

// 3. Verify Attachments
const attachments = await prisma.attachment.findMany();
expect(attachments.length).toBeGreaterThanOrEqual(7);

// 4. Verify Enum Values
const invalidStatusCount = await prisma.$queryRaw`
  SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'REJECTED'
`;
expect(Number(invalidStatusCount[0].count)).toBe(0);
```

---

## 8. Rollback & Disaster Recovery Strategy

In the event of an unexpected migration failure during deployment:
1. **Pre-Migration Snapshot:** A full PostgreSQL database dump (`pg_dump toktickit_db > backup_pre_lab3.sql`) is executed immediately prior to running `prisma migrate deploy`.
2. **Reverse Migration Script:** If rollback is required before production data is committed:
   ```sql
   -- Revert Comment table
   DROP TABLE IF EXISTS "Comment";
   -- Remove Ticket extensions
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "itPriority";
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolutionIndicated";
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "ownerId";
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolutionSummary";
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "cancellationReason";
   ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "reopenReason";
   -- Revert User table to RequesterUser
   ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "mustChangePassword";
   ALTER TABLE "User" RENAME TO "RequesterUser";
   ALTER SEQUENCE "User_id_seq" RENAME TO "RequesterUser_id_seq";
   ```
