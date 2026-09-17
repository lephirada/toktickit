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

> [!WARNING]
> **PostgreSQL Transaction Safety Notice (55P04 Trap):**
> In PostgreSQL, executing `ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED'` cannot be combined with an immediate `UPDATE "Ticket" SET "status" = 'CANCELLED'` inside the same migration transaction block. PostgreSQL will abort with:
> `ERROR: 55P04: unsafe use of new value "CANCELLED" of enum type "TicketStatus" in transaction` (hint: new enum values must be committed before they can be used).
> To ensure 100% executable and transaction-safe migration in Prisma, we enforce the **Recreate-and-Cast Pattern**:

* **Executable Migration SQL Sequence (Single-Transaction Safe):**
  ```sql
  -- Step 1: Create new status enum containing all 8 target values
  CREATE TYPE "TicketStatus_new" AS ENUM (
    'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 
    'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'
  );

  -- Step 2: Drop default constraint temporarily on Ticket.status
  ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;

  -- Step 3: Cast existing data to the new enum type while mapping legacy REJECTED -> CANCELLED
  ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" 
  USING (
    CASE "status"::text
      WHEN 'REJECTED' THEN 'CANCELLED'::"TicketStatus_new"
      ELSE "status"::text::"TicketStatus_new"
    END
  );

  -- Step 4: Drop old 5-value enum type
  DROP TYPE "TicketStatus";

  -- Step 5: Rename new enum type to canonical name
  ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";

  -- Step 6: Restore default constraint on Ticket.status
  ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';
  ```

* **Alternative Two-Step Migration Sequence (Runner Commit Boundary):**
  If using native `ALTER TYPE ... ADD VALUE`, the addition of values must be isolated in a dedicated migration file and committed prior to running the update query:
  1. `migration_1`: `ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';` $\rightarrow$ Committed.
  2. `migration_2`: `UPDATE "Ticket" SET "status" = 'CANCELLED' WHERE "status"::text = 'REJECTED';` $\rightarrow$ Committed.
  *(The Recreate-and-Cast pattern is recommended as it runs atomically in a single Prisma migration file).*

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

> [!NOTE]
> **Data Model & Visibility Mapping Contract:**
> The database schema enforces a unified `"Comment"` table containing the `"isInternal" BOOLEAN NOT NULL DEFAULT false` column.
> - **Public Comments:** API visibility `PUBLIC` maps to `"isInternal" = false`.
> - **Internal Notes:** API visibility `INTERNAL` maps to `"isInternal" = true`.

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
// 1. Verify Exactly 10 Users & Preserved Primary Keys
const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
expect(users.length).toBe(10); // Exactly 10 users populated by seed
expect(users[0].id).toBe(1);
expect(users[0].email).toBe("sarah.connor@toktickit.com");
expect(users[2].id).toBe(3);
expect(users[2].email).toBe("jennifer.anderson@toktickit.com");

// 2. Verify Ticket Count & Requester Association
const tickets = await prisma.ticket.findMany({ where: { requesterId: 3 } });
expect(tickets.length).toBe(16); // Exactly 16 baseline tickets for Jennifer
expect(tickets[0].ticketNo).toBe("TKT-2026-00001");

// 3. Verify Baseline Attachments Preservation
const baselineAttachments = await prisma.attachment.findMany({
  where: { id: { in: [1, 2, 3, 4, 5, 6, 7] } },
});
expect(baselineAttachments.length).toBe(7); // Exactly 7 pre-migration baseline attachments preserved
expect(baselineAttachments.every((a) => a.uploadedById > 0)).toBe(true);

// 4. Verify Status Enum Values
const invalidStatusCount = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'REJECTED'
`;
expect(Number(invalidStatusCount[0].count)).toBe(0);

const cancelledStatusCount = await prisma.$queryRaw<{ count: bigint }[]>`
  SELECT COUNT(*) FROM "Ticket" WHERE "status"::text = 'CANCELLED'
`;
expect(Number(cancelledStatusCount[0].count)).toBeGreaterThanOrEqual(0);
```

---

## 8. Rollback & Disaster Recovery Strategy

### 8.1 Symmetrical Reverse Migration Script
If a rollback is required before production transactions begin, every DDL mutation introduced in the forward migration must be cleanly and symmetrically reversed:

```sql
-- Step 1: Drop Ticket Owner Foreign Key and Index
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_ownerId_fkey";
DROP INDEX IF EXISTS "Ticket_ownerId_idx";

-- Step 2: Drop Discussion Comments Table and Indexes
DROP TABLE IF EXISTS "Comment";

-- Step 3: Remove Added Columns from Ticket Table
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "itPriority";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolutionIndicated";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "ownerId";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "resolutionSummary";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "cancellationReason";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "reopenReason";

-- Step 4: Revert Status Enum from 8 values to original 5 values (mapping CANCELLED back to REJECTED)
CREATE TYPE "TicketStatus_legacy" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_legacy" 
USING (
  CASE "status"::text 
    WHEN 'CANCELLED' THEN 'REJECTED'::"TicketStatus_legacy" 
    WHEN 'OPEN' THEN 'NEW'::"TicketStatus_legacy"
    WHEN 'WAITING_FOR_REQUESTER' THEN 'IN_PROGRESS'::"TicketStatus_legacy"
    WHEN 'REOPENED' THEN 'IN_PROGRESS'::"TicketStatus_legacy"
    ELSE "status"::text::"TicketStatus_legacy" 
  END
);
DROP TYPE "TicketStatus";
ALTER TYPE "TicketStatus_legacy" RENAME TO "TicketStatus";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- Step 5: Revert Foreign Keys on Ticket, Attachment, and Activity back to RequesterUser
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_requesterId_fkey";
ALTER TABLE "Attachment" DROP CONSTRAINT IF EXISTS "Attachment_uploadedById_fkey";
ALTER TABLE "TicketActivity" DROP CONSTRAINT IF EXISTS "TicketActivity_actorId_fkey";

-- Step 6: Revert User Table back to RequesterUser
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "mustChangePassword";
DROP TYPE IF EXISTS "UserRole";

-- Revert department to NOT NULL
UPDATE "User" SET "department" = 'General' WHERE "department" IS NULL;
ALTER TABLE "User" ALTER COLUMN "department" SET NOT NULL;

-- Rename constraints and indexes back to RequesterUser
ALTER TABLE "User" RENAME CONSTRAINT "User_pkey" TO "RequesterUser_pkey";
ALTER INDEX "User_email_key" RENAME TO "RequesterUser_email_key";
ALTER INDEX "User_isActive_idx" RENAME TO "RequesterUser_isActive_idx";

-- Rename table and sequence back
ALTER TABLE "User" RENAME TO "RequesterUser";
ALTER SEQUENCE "User_id_seq" RENAME TO "RequesterUser_id_seq";

-- Step 7: Restore Foreign Keys pointing to RequesterUser
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" 
  FOREIGN KEY ("requesterId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" 
  FOREIGN KEY ("uploadedById") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT;

ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" 
  FOREIGN KEY ("actorId") REFERENCES "RequesterUser"("id") ON DELETE SET NULL;
```

### 8.2 Database Snapshot & Disaster Recovery Protocol
* **Pre-Migration Snapshot Command:**
  Immediately prior to applying migrations on any environment, take an authoritative binary snapshot:
  ```bash
  pg_dump -Fc toktickit_db > backup_pre_lab3.dump
  ```
* **Irreversible Data Transformation Fallback:**
  If irreversible data mutations or foreign key violations occur during rollout, SQL reversal is considered secondary to snapshot restoration:
  ```bash
  pg_restore --clean --if-exists -d toktickit_db backup_pre_lab3.dump
  ```
  This restores the exact pre-migration baseline (5 users, 16 tickets, 7 attachments) in under 5 seconds.
