-- Step 1: Evolve RequesterUser to User table in-place
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER SEQUENCE "RequesterUser_id_seq" RENAME TO "User_id_seq";
ALTER TABLE "User" RENAME CONSTRAINT "RequesterUser_pkey" TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";
ALTER INDEX "RequesterUser_isActive_idx" RENAME TO "User_isActive_idx";

-- Step 2: Create UserRole enum and extend User columns
CREATE TYPE "UserRole" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '$2b$10$epR.zIe6lO2vE9tK4x8GkOCsM4.W1YI2fT1J2V9q8J5B9X9b1w7y2';
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "mustChangePassword" = true WHERE "email" = 'sarah.connor@toktickit.com';
ALTER TABLE "User" ALTER COLUMN "department" DROP NOT NULL;

-- Step 3: TicketStatus Recreate-and-Cast (Safe inside single transaction on PostgreSQL 16)
CREATE TYPE "TicketStatus_new" AS ENUM (
  'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 
  'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'
);
ALTER TABLE "Ticket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Ticket" ALTER COLUMN "status" TYPE "TicketStatus_new" 
USING (
  CASE "status"::text
    WHEN 'REJECTED' THEN 'CANCELLED'::"TicketStatus_new"
    ELSE "status"::text::"TicketStatus_new"
  END
);
DROP TYPE "TicketStatus";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
ALTER TABLE "Ticket" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- Step 4: Ticket Extensions & Priority Separation
ALTER TABLE "Ticket" RENAME COLUMN "priority" TO "requestedPriority";
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "Priority" NULL;
ALTER TABLE "Ticket" ADD COLUMN "resolutionIndicated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ticket" ADD COLUMN "ownerId" INTEGER NULL;
ALTER TABLE "Ticket" ADD COLUMN "resolutionSummary" VARCHAR(2000) NULL;
ALTER TABLE "Ticket" ADD COLUMN "cancellationReason" VARCHAR(1000) NULL;
ALTER TABLE "Ticket" ADD COLUMN "reopenReason" VARCHAR(1000) NULL;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- Step 5: Create Comment Table for Discussion & Internal Notes
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Comment_ticketId_idx" ON "Comment"("ticketId");
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");
CREATE INDEX "Comment_isInternal_idx" ON "Comment"("isInternal");
